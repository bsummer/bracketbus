import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Bracket,
  Pick,
  Pool,
  PoolMember,
  PoolMemberStatus,
  Game,
  Tournament,
  GameStatus,
  TournamentTeam,
} from '../common/entities';
import { CreateBracketDto } from './dto/create-bracket.dto';
import { UpdateBracketDto } from './dto/update-bracket.dto';
import { BracketResponseDto } from './dto/bracket-response.dto';

@Injectable()
export class BracketsService {
  constructor(
    @InjectRepository(Bracket)
    private bracketsRepository: Repository<Bracket>,
    @InjectRepository(Pick)
    private picksRepository: Repository<Pick>,
    @InjectRepository(Pool)
    private poolsRepository: Repository<Pool>,
    @InjectRepository(PoolMember)
    private poolMembersRepository: Repository<PoolMember>,
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
    @InjectRepository(Tournament)
    private tournamentsRepository: Repository<Tournament>,
    @InjectRepository(TournamentTeam)
    private tournamentTeamRepository: Repository<TournamentTeam>,
  ) {}

  private async enrichBracketWithTeamData(bracket: Bracket): Promise<Bracket> {
    const tournamentId = bracket.pool?.tournamentId || bracket.pool?.tournament?.id;
    if (!tournamentId) return bracket;

    // Load all tournament teams for this tournament in one query
    const tournamentTeams = await this.tournamentTeamRepository.find({
      where: { tournamentId },
    });

    // Create a map for quick lookup: teamId -> TournamentTeam
    const teamMap = new Map<string, TournamentTeam>();
    tournamentTeams.forEach((tt) => {
      teamMap.set(tt.teamId, tt);
    });

    const enrichTeam = (team: any) => {
      if (!team) return team;
      const tournamentTeam = teamMap.get(team.id);
      if (tournamentTeam) {
        return {
          ...team,
          seed: tournamentTeam.seed,
          region: tournamentTeam.region,
        };
      }
      return team;
    };

    // Enrich teams in picks
    if (bracket.picks) {
      bracket.picks.forEach((pick) => {
        if (pick.game) {
          pick.game.team1 = enrichTeam(pick.game.team1);
          pick.game.team2 = enrichTeam(pick.game.team2);
          pick.game.winner = enrichTeam(pick.game.winner);
        }
        pick.predictedWinner = enrichTeam(pick.predictedWinner);
      });
    }

    return bracket;
  }

  private async checkBracketLocked(bracket: Bracket): Promise<boolean> {
    if (bracket.lockedAt) {
      return true;
    }

    // Check if tournament has started
    const pool = await this.poolsRepository.findOne({
      where: { id: bracket.poolId },
      relations: ['tournament'],
    });

    if (!pool || !pool.tournament) {
      return false;
    }

    const tournament = pool.tournament;
    const now = new Date();

    // Check if first game has started
    const firstGame = await this.gamesRepository.findOne({
      where: {
        tournamentId: tournament.id,
        round: 1,
      },
      order: { gameNumber: 'ASC' },
    });

    if (firstGame) {
      if (
        firstGame.status === GameStatus.IN_PROGRESS ||
        firstGame.status === GameStatus.COMPLETED
      ) {
        return true;
      }
      if (firstGame.gameDate && new Date(firstGame.gameDate) <= now) {
        return true;
      }
    }

    return false;
  }

  async create(createBracketDto: CreateBracketDto, userId: string): Promise<Bracket> {
    // Check if pool exists and user is a member
    const pool = await this.poolsRepository.findOne({
      where: { id: createBracketDto.poolId },
      relations: ['tournament'],
    });

    if (!pool) {
      throw new NotFoundException('Pool not found');
    }

    const member = await this.poolMembersRepository.findOne({
      where: {
        poolId: createBracketDto.poolId,
        userId,
        status: PoolMemberStatus.ACTIVE,
      },
    });

    if (!member) {
      throw new ForbiddenException('You must be a member of the pool to create a bracket');
    }

    // Check if user already has a bracket in this pool
    const existingBracket = await this.bracketsRepository.findOne({
      where: {
        userId,
        poolId: createBracketDto.poolId,
      },
    });

    if (existingBracket) {
      throw new ConflictException('You can only create one bracket per pool');
    }

    // Validate all picks
    const gameIds = createBracketDto.picks.map((p) => p.gameId);
    const games = await this.gamesRepository.find({
      where: { id: In(gameIds) },
      relations: ['team1', 'team2'],
    });

    if (games.length !== createBracketDto.picks.length) {
      throw new BadRequestException('Invalid game IDs in picks');
    }

    // Validate predicted winners
    for (const pick of createBracketDto.picks) {
      const game = games.find((g) => g.id === pick.gameId);
      if (!game) continue;

      // Round 1 games have team1Id and team2Id populated
      if (game.round === 1) {
        if (
          pick.predictedWinnerId !== game.team1Id &&
          pick.predictedWinnerId !== game.team2Id
        ) {
          throw new BadRequestException(
            `Predicted winner must be one of the teams in game ${game.id}`,
          );
        }
      } else {
        // Round 2+ games: validate against parent game picks
        // Get all picks for this bracket to find parent picks
        const parentGame1Pick = createBracketDto.picks.find(
          (p) => p.gameId === game.parentGame1Id
        );
        const parentGame2Pick = createBracketDto.picks.find(
          (p) => p.gameId === game.parentGame2Id
        );

        // Validate that predicted winner is from one of the parent picks
        const validTeamIds = [
          parentGame1Pick?.predictedWinnerId,
          parentGame2Pick?.predictedWinnerId,
        ].filter(Boolean);

        if (!validTeamIds.includes(pick.predictedWinnerId)) {
          throw new BadRequestException(
            `Predicted winner must be from one of the parent games for game ${game.id}`,
          );
        }
      }
    }

    // Check if tournament has started
    const tempBracket = { poolId: pool.id, lockedAt: null } as Bracket;
    if (await this.checkBracketLocked(tempBracket)) {
      throw new ForbiddenException('Tournament has already started');
    }

    // Create bracket
    const bracket = this.bracketsRepository.create({
      name: createBracketDto.name,
      userId,
      poolId: createBracketDto.poolId,
    });

    const savedBracket = await this.bracketsRepository.save(bracket);

    // Create picks
    const picks = createBracketDto.picks.map((pick) =>
      this.picksRepository.create({
        bracketId: savedBracket.id,
        gameId: pick.gameId,
        predictedWinnerId: pick.predictedWinnerId,
        pointsEarned: 0,
      }),
    );

    await this.picksRepository.save(picks);

    return this.findOne(savedBracket.id);
  }

  async findAll(userId: string): Promise<Bracket[]> {
    const brackets = await this.bracketsRepository.find({
      where: { userId },
      relations: ['pool', 'pool.tournament', 'picks', 'picks.game', 'picks.predictedWinner'],
      order: { created_at: 'DESC' },
    });

    // Enrich brackets with tournament-specific team data
    const enrichedBrackets = await Promise.all(brackets.map((bracket) => this.enrichBracketWithTeamData(bracket)));
    return enrichedBrackets;
  }

  async findOne(id: string): Promise<Bracket> {
    const bracket = await this.bracketsRepository.findOne({
      where: { id },
      relations: [
        'user',
        'pool',
        'pool.tournament',
        'pool.creator',
        'picks',
        'picks.game',
        'picks.game.team1',
        'picks.game.team2',
        'picks.game.winner',
        'picks.predictedWinner',
      ],
    });

    if (!bracket) {
      throw new NotFoundException('Bracket not found');
    }

    // Enrich bracket with tournament-specific team data
    const enrichedBracket = await this.enrichBracketWithTeamData(bracket);
    const isLocked = await this.checkBracketLocked(enrichedBracket);
    return BracketResponseDto.fromEntity(enrichedBracket, isLocked);
  }

  async update(id: string, updateBracketDto: UpdateBracketDto, userId: string): Promise<Bracket> {
    const bracket = await this.findOne(id);

    if (bracket.userId !== userId) {
      throw new ForbiddenException('You can only update your own brackets');
    }

    if (await this.checkBracketLocked(bracket)) {
      throw new ForbiddenException('Backend: Bracket is locked and cannot be updated');
    }

    if (updateBracketDto.picks) {
      // Validate that no picks are for games that have started or completed
      const gameIds = updateBracketDto.picks.map((p) => p.gameId);
      const games = await this.gamesRepository.find({
        where: { id: In(gameIds) },
      });

      const now = new Date();
      for (const game of games) {
        // Check if game has started or completed
        if (
          game.status === GameStatus.IN_PROGRESS ||
          game.status === GameStatus.COMPLETED ||
          (game.gameDate && new Date(game.gameDate) <= now)
        ) {
          throw new ForbiddenException(
            `Cannot edit picks for game ${game.gameNumber} (Round ${game.round}) - game has already started or completed`,
          );
        }
      }

      
      // Delete existing picks
      await this.picksRepository.delete({ bracketId: id });

      // Create new picks
      const picks = updateBracketDto.picks.map((pick) =>
        this.picksRepository.create({
          bracketId: id,
          gameId: pick.gameId,
          predictedWinnerId: pick.predictedWinnerId,
          pointsEarned: 0,
        }),
      );

      await this.picksRepository.save(picks);
    }

    return this.findOne(id);
  }

  async remove(id: string, userId: string): Promise<void> {
    const bracket = await this.findOne(id);

    if (bracket.userId !== userId) {
      throw new ForbiddenException('You can only delete your own brackets');
    }

    if (await this.checkBracketLocked(bracket)) {
      throw new ForbiddenException('Bracket is locked and cannot be deleted');
    }

    await this.bracketsRepository.remove(bracket);
  }
}

