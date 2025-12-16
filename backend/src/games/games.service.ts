import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameStatus } from '../common/entities';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
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

    Object.assign(game, updateData);
    return this.gamesRepository.save(game);
  }
}

