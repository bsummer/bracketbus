import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Game, TournamentTeam } from '../common/entities';
import { ScoresService } from '../scores/scores.service';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
    @InjectRepository(TournamentTeam)
    private tournamentTeamRepository: Repository<TournamentTeam>,
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
}

