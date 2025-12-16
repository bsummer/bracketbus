import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../common/entities';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private teamsRepository: Repository<Team>,
  ) {}

  async findAll(): Promise<Team[]> {
    return this.teamsRepository.find({
      order: { region: 'ASC', seed: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Team | null> {
    return this.teamsRepository.findOne({ where: { id } });
  }
}

