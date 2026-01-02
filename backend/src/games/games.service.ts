import { Injectable, ForbiddenException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Game, TournamentTeam, Tournament, Team } from '../common/entities';
import { ScoresService } from '../scores/scores.service';
import { CreateTournamentGameDto } from './dto/create-tournament-game.dto';
import { UpdateTournamentGameDto } from './dto/update-tournament-game.dto';
import { GameStatus } from '../common/entities/game.entity';

/**
 * Service for managing tournament games.
 * Handles game creation with complex validation rules based on round number.
 * 
 * Business Rules:
 * - Round 1: Requires region, team1Id, team2Id. Teams must be in tournament with matching region.
 * - Round 2+: Requires parentGame1Id and parentGame2Id from previous round.
 * - Game numbers must be unique per tournament and round.
 * - Teams cannot appear in multiple games within the same round.
 * - Parent games cannot be reused in the same round.
 */
@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
    @InjectRepository(TournamentTeam)
    private tournamentTeamRepository: Repository<TournamentTeam>,
    @InjectRepository(Tournament)
    private tournamentsRepository: Repository<Tournament>,
    @InjectRepository(Team)
    private teamsRepository: Repository<Team>,
    private scoresService: ScoresService,
  ) {}

  private async enrichGamesWithTeamData(games: Game[]): Promise<Game[]> {
    if (games.length === 0) return games;

    // Get unique tournament IDs
    const tournamentIds = [...new Set(games.map((g) => g.tournamentId).filter(Boolean))];
    if (tournamentIds.length === 0) return games;

    // Load all tournament teams for all tournaments in one query
    const tournamentTeams = await this.tournamentTeamRepository.find({
      where: { tournamentId: In(tournamentIds) },
      relations: ['team'],
    });

    // Create a map for quick lookup: tournamentId -> teamId -> TournamentTeam
    const tournamentTeamMap = new Map<string, Map<string, TournamentTeam>>();
    tournamentTeams.forEach((tt) => {
      if (!tournamentTeamMap.has(tt.tournamentId)) {
        tournamentTeamMap.set(tt.tournamentId, new Map());
      }
      tournamentTeamMap.get(tt.tournamentId)!.set(tt.teamId, tt);
    });

    // Enrich each game
    return games.map((game) => {
      if (!game.tournamentId) return game;

      const teamMap = tournamentTeamMap.get(game.tournamentId);
      if (!teamMap) return game;

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

      return {
        ...game,
        team1: enrichTeam(game.team1),
        team2: enrichTeam(game.team2),
        winner: enrichTeam(game.winner),
      };
    });
  }

  async findAll(): Promise<Game[]> {
    const games = await this.gamesRepository.find({
      relations: ['team1', 'team2', 'winner', 'tournament'],
      order: { round: 'ASC', gameNumber: 'ASC' },
    });

    // Enrich games with tournament-specific team data
    return this.enrichGamesWithTeamData(games);
  }

  async findOne(id: string): Promise<Game | null> {
    const game = await this.gamesRepository.findOne({
      where: { id },
      relations: ['team1', 'team2', 'winner', 'tournament'],
    });

    if (!game) {
      return null;
    }

    const enriched = await this.enrichGamesWithTeamData([game]);
    return enriched[0];
  }

  async update(id: string, updateData: Partial<Game>, isAdmin: boolean = false): Promise<Game> {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can update game results');
    }

    const game = await this.gamesRepository.findOne({ 
      where: { id },
      relations: ['team1', 'team2', 'winner', 'tournament'],
    });
    if (!game) {
      throw new Error('Game not found');
    }

    const previousWinnerId = game.winnerId;
    Object.assign(game, updateData);
    const updatedGame = await this.gamesRepository.save(game);

    // If winner was updated, recalculate scores for this game
    if (updateData.winnerId && updateData.winnerId !== previousWinnerId) {
      await this.scoresService.calculateScoresForGame(id);
    }

    // Reload with relations and enrich
    const reloadedGame = await this.findOne(id);
    return reloadedGame || updatedGame;
  }

  async findAllByTournament(tournamentId: string, round?: number): Promise<Game[]> {
    // Verify tournament exists
    const tournament = await this.tournamentsRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
    }

    // Use query builder - load parent games separately to avoid UUID join issues
    const queryBuilder = this.gamesRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.team1', 'team1')
      .leftJoinAndSelect('game.team2', 'team2')
      .leftJoinAndSelect('game.winner', 'winner')
      .leftJoinAndSelect('game.tournament', 'tournament')
      .where('game.tournament_id = :tournamentId', { tournamentId });

    if (round !== undefined) {
      queryBuilder.andWhere('game.round = :round', { round });
    }

    queryBuilder.orderBy('game.round', 'ASC').addOrderBy('game.gameNumber', 'ASC');

    const games = await queryBuilder.getMany();

    // Load parent games separately if they exist to avoid UUID join type issues
    const parentGameIds = new Set<string>();
    games.forEach((game) => {
      if (game.parentGame1Id) parentGameIds.add(game.parentGame1Id);
      if (game.parentGame2Id) parentGameIds.add(game.parentGame2Id);
    });

    if (parentGameIds.size > 0) {
      const parentGames = await this.gamesRepository.find({
        where: { id: In(Array.from(parentGameIds)) },
      });
      const parentGamesMap = new Map(parentGames.map((pg) => [pg.id, pg]));

      // Attach parent games to the main games
      games.forEach((game) => {
        if (game.parentGame1Id && parentGamesMap.has(game.parentGame1Id)) {
          game.parentGame1 = parentGamesMap.get(game.parentGame1Id)!;
        }
        if (game.parentGame2Id && parentGamesMap.has(game.parentGame2Id)) {
          game.parentGame2 = parentGamesMap.get(game.parentGame2Id)!;
        }
      });
    }

    return this.enrichGamesWithTeamData(games);
  }

  /**
   * Creates a new game for a tournament.
   * 
   * Validation Rules by Round:
   * - Round 1: region, team1Id, team2Id required. Teams must exist in tournament with matching region.
   * - Round 2+: parentGame1Id, parentGame2Id required. Parent games must be from previous round.
   * 
   * Additional Rules:
   * - Game number must be unique per tournament and round
   * - Teams cannot appear in multiple games in the same round
   * - Parent games cannot be reused in the same round
   * 
   * @param tournamentId - Tournament UUID
   * @param createDto - Game creation data
   * @returns Created game entity
   * @throws NotFoundException if tournament not found
   * @throws BadRequestException if validation fails
   * @throws ConflictException if game number or team/parent game conflicts
   */
  async createForTournament(tournamentId: string, createDto: CreateTournamentGameDto): Promise<Game> {
    // Verify tournament exists
    const tournament = await this.tournamentsRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
    }

    // Check if game number already exists for this tournament and round
    const existingGame = await this.gamesRepository.findOne({
      where: {
        tournamentId,
        round: createDto.round,
        gameNumber: createDto.gameNumber,
      },
    });

    if (existingGame) {
      throw new ConflictException(
        `Game number ${createDto.gameNumber} already exists for round ${createDto.round} in this tournament`,
      );
    }

    // Validation based on round
    if (createDto.round === 1) {
      // Round 1: region required, team1Id/team2Id required
      if (!createDto.region) {
        throw new BadRequestException('Region is required for Round 1 games');
      }
      if (!createDto.team1Id || !createDto.team2Id) {
        throw new BadRequestException('Team 1 and Team 2 are required for Round 1 games');
      }
      if (createDto.team1Id === createDto.team2Id) {
        throw new BadRequestException('Team 1 and Team 2 must be different');
      }

      // Verify teams exist in tournament with matching region
      const team1TournamentTeam = await this.tournamentTeamRepository.findOne({
        where: {
          tournamentId,
          teamId: createDto.team1Id,
          region: createDto.region,
        },
      });

      if (!team1TournamentTeam) {
        throw new BadRequestException(
          `Team 1 does not exist in tournament with region ${createDto.region}`,
        );
      }

      const team2TournamentTeam = await this.tournamentTeamRepository.findOne({
        where: {
          tournamentId,
          teamId: createDto.team2Id,
          region: createDto.region,
        },
      });

      if (!team2TournamentTeam) {
        throw new BadRequestException(
          `Team 2 does not exist in tournament with region ${createDto.region}`,
        );
      }

      // Check if teams already appear in another game in this round
      await this.validateTeamNotInOtherGame(tournamentId, createDto.round, createDto.team1Id, createDto.team2Id);

      const game = this.gamesRepository.create({
        tournamentId,
        round: createDto.round,
        gameNumber: createDto.gameNumber,
        region: createDto.region,
        team1Id: createDto.team1Id,
        team2Id: createDto.team2Id,
        gameDate: createDto.gameDate ? new Date(createDto.gameDate) : null,
        status: createDto.status || GameStatus.SCHEDULED,
      });

      return this.gamesRepository.save(game);
    } else {
      // Round 2+: parentGame1Id/parentGame2Id required (or region+seed for Round 2)
      if (createDto.round === 2) {
        // Round 2: can use region + seed OR parent games (but not both)
        const hasParentGames = createDto.parentGame1Id && createDto.parentGame2Id;
        const hasRegionSeed = createDto.region && createDto.seed;

        if (!hasParentGames && !hasRegionSeed) {
          throw new BadRequestException(
            'Round 2 games require either parent games or region + seed',
          );
        }

        if (hasParentGames && hasRegionSeed) {
          throw new BadRequestException(
            'Round 2 games cannot have both parent games and region+seed',
          );
        }

        if (hasRegionSeed) {
          // Use region + seed approach (similar to Round 1 but with seed instead of team IDs)
          // This is a special case - we'd need to find teams by region and seed
          // For now, we'll require parent games for Round 2+
          throw new BadRequestException(
            'Round 2 games with region+seed are not yet fully supported. Please use parent games.',
          );
        }
      }

      // For Round 2+ (or Round 2 with parent games)
      if (!createDto.parentGame1Id || !createDto.parentGame2Id) {
        throw new BadRequestException('Parent games are required for Round 2+ games');
      }

      if (createDto.parentGame1Id === createDto.parentGame2Id) {
        throw new BadRequestException('Parent Game 1 and Parent Game 2 must be different');
      }

      // Verify parent games exist and are from previous round
      const parentGame1 = await this.gamesRepository.findOne({
        where: { id: createDto.parentGame1Id },
      });

      if (!parentGame1) {
        throw new NotFoundException(`Parent Game 1 with ID ${createDto.parentGame1Id} not found`);
      }

      if (parentGame1.tournamentId !== tournamentId) {
        throw new BadRequestException('Parent Game 1 must be from the same tournament');
      }

      if (parentGame1.round !== createDto.round - 1) {
        throw new BadRequestException(
          `Parent Game 1 must be from round ${createDto.round - 1}, but it is from round ${parentGame1.round}`,
        );
      }

      const parentGame2 = await this.gamesRepository.findOne({
        where: { id: createDto.parentGame2Id },
      });

      if (!parentGame2) {
        throw new NotFoundException(`Parent Game 2 with ID ${createDto.parentGame2Id} not found`);
      }

      if (parentGame2.tournamentId !== tournamentId) {
        throw new BadRequestException('Parent Game 2 must be from the same tournament');
      }

      if (parentGame2.round !== createDto.round - 1) {
        throw new BadRequestException(
          `Parent Game 2 must be from round ${createDto.round - 1}, but it is from round ${parentGame2.round}`,
        );
      }

      // Check if parent games are already used in another game in this round
      const existingGameWithParent1 = await this.gamesRepository.findOne({
        where: [
          { tournamentId, round: createDto.round, parentGame1Id: createDto.parentGame1Id },
          { tournamentId, round: createDto.round, parentGame2Id: createDto.parentGame1Id },
        ],
      });

      if (existingGameWithParent1) {
        throw new ConflictException(
          `Parent Game 1 is already used in game ${existingGameWithParent1.gameNumber} of round ${createDto.round}`,
        );
      }

      const existingGameWithParent2 = await this.gamesRepository.findOne({
        where: [
          { tournamentId, round: createDto.round, parentGame1Id: createDto.parentGame2Id },
          { tournamentId, round: createDto.round, parentGame2Id: createDto.parentGame2Id },
        ],
      });

      if (existingGameWithParent2) {
        throw new ConflictException(
          `Parent Game 2 is already used in game ${existingGameWithParent2.gameNumber} of round ${createDto.round}`,
        );
      }

      const game = this.gamesRepository.create({
        tournamentId,
        round: createDto.round,
        gameNumber: createDto.gameNumber,
        region: createDto.region || null,
        parentGame1Id: createDto.parentGame1Id,
        parentGame2Id: createDto.parentGame2Id,
        gameDate: createDto.gameDate ? new Date(createDto.gameDate) : null,
        status: createDto.status || GameStatus.SCHEDULED,
      });

      return this.gamesRepository.save(game);
    }
  }

  private async validateTeamNotInOtherGame(
    tournamentId: string,
    round: number,
    team1Id: string,
    team2Id: string,
  ): Promise<void> {
    // Check if team1 already appears in another game in this round
    const existingGameWithTeam1 = await this.gamesRepository.findOne({
      where: [
        { tournamentId, round, team1Id },
        { tournamentId, round, team2Id: team1Id },
      ],
    });

    if (existingGameWithTeam1) {
      throw new ConflictException(
        `Team is already playing in game ${existingGameWithTeam1.gameNumber} of round ${round}`,
      );
    }

    // Check if team2 already appears in another game in this round
    const existingGameWithTeam2 = await this.gamesRepository.findOne({
      where: [
        { tournamentId, round, team1Id: team2Id },
        { tournamentId, round, team2Id },
      ],
    });

    if (existingGameWithTeam2) {
      throw new ConflictException(
        `Team is already playing in game ${existingGameWithTeam2.gameNumber} of round ${round}`,
      );
    }
  }

  async updateForTournament(
    tournamentId: string,
    id: string,
    updateDto: UpdateTournamentGameDto,
  ): Promise<Game> {
    const game = await this.gamesRepository.findOne({
      where: { id },
      relations: ['team1', 'team2', 'tournament'],
    });

    if (!game) {
      throw new NotFoundException(`Game with ID ${id} not found`);
    }

    if (game.tournamentId !== tournamentId) {
      throw new BadRequestException('Game does not belong to the specified tournament');
    }

    // If updating game number, check for conflicts
    if (updateDto.gameNumber !== undefined && updateDto.gameNumber !== game.gameNumber) {
      const existingGame = await this.gamesRepository.findOne({
        where: {
          tournamentId,
          round: game.round,
          gameNumber: updateDto.gameNumber,
        },
      });

      if (existingGame && existingGame.id !== id) {
        throw new ConflictException(
          `Game number ${updateDto.gameNumber} already exists for round ${game.round} in this tournament`,
        );
      }
    }

    // Update fields
    if (updateDto.gameNumber !== undefined) {
      game.gameNumber = updateDto.gameNumber;
    }
    if (updateDto.region !== undefined) {
      game.region = updateDto.region;
    }
    if (updateDto.team1Id !== undefined) {
      game.team1Id = updateDto.team1Id;
    }
    if (updateDto.team2Id !== undefined) {
      game.team2Id = updateDto.team2Id;
    }
    if (updateDto.parentGame1Id !== undefined) {
      game.parentGame1Id = updateDto.parentGame1Id;
    }
    if (updateDto.parentGame2Id !== undefined) {
      game.parentGame2Id = updateDto.parentGame2Id;
    }
    if (updateDto.status !== undefined) {
      game.status = updateDto.status;
    }
    if (updateDto.gameDate !== undefined) {
      game.gameDate = updateDto.gameDate ? new Date(updateDto.gameDate) : null;
    }
    if (updateDto.scoreTeam1 !== undefined) {
      game.scoreTeam1 = updateDto.scoreTeam1;
    }
    if (updateDto.scoreTeam2 !== undefined) {
      game.scoreTeam2 = updateDto.scoreTeam2;
    }

    const previousWinnerId = game.winnerId;
    if (updateDto.winnerId !== undefined) {
      game.winnerId = updateDto.winnerId;
    }

    const updatedGame = await this.gamesRepository.save(game);

    // If winner was updated, recalculate scores
    if (updateDto.winnerId && updateDto.winnerId !== previousWinnerId) {
      await this.scoresService.calculateScoresForGame(id);
    }

    // Reload with relations and enrich
    const reloadedGame = await this.findOne(id);
    return reloadedGame || updatedGame;
  }

  async removeFromTournament(tournamentId: string, id: string): Promise<void> {
    const game = await this.gamesRepository.findOne({
      where: { id },
    });

    if (!game) {
      throw new NotFoundException(`Game with ID ${id} not found`);
    }

    if (game.tournamentId !== tournamentId) {
      throw new BadRequestException('Game does not belong to the specified tournament');
    }

    await this.gamesRepository.remove(game);
  }
}

