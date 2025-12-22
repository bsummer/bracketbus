import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '../common/entities';
import { ScoresService } from '../scores/scores.service';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
    private scoresService: ScoresService,
  ) {}

  async findAll(): Promise<Game[]> {
    return this.gamesRepository.find({
      relations: ['team1', 'team2', 'winner', 'tournament'],
      order: { round: 'ASC', gameNumber: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Game | null> {
    return this.gamesRepository.findOne({
      where: { id },
      relations: ['team1', 'team2', 'winner', 'tournament'],
    });
  }

  async update(id: string, updateData: Partial<Game>, isAdmin: boolean = false): Promise<Game> {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can update game results');
    }

    const game = await this.gamesRepository.findOne({ where: { id } });
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

    return updatedGame;
  }
}

