import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from '../common/entities/tournament.entity';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament)
    private tournamentsRepository: Repository<Tournament>,
  ) {}

  async findAll(): Promise<Tournament[]> {
    return this.tournamentsRepository.find({
      order: { startDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Tournament> {
    const tournament = await this.tournamentsRepository.findOne({
      where: { id },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${id} not found`);
    }

    return tournament;
  }

  async create(createTournamentDto: CreateTournamentDto): Promise<Tournament> {
    // Check if tournament name already exists
    const existingTournament = await this.tournamentsRepository.findOne({
      where: { name: createTournamentDto.name },
    });

    if (existingTournament) {
      throw new ConflictException(`Tournament with name "${createTournamentDto.name}" already exists`);
    }

    const tournament = this.tournamentsRepository.create({
      name: createTournamentDto.name,
      startDate: new Date(createTournamentDto.startDate),
    });

    return this.tournamentsRepository.save(tournament);
  }

  async update(id: string, updateTournamentDto: UpdateTournamentDto): Promise<Tournament> {
    const tournament = await this.findOne(id);

    // Check if name is being updated and if it conflicts with existing tournament
    if (updateTournamentDto.name && updateTournamentDto.name !== tournament.name) {
      const existingTournament = await this.tournamentsRepository.findOne({
        where: { name: updateTournamentDto.name },
      });

      if (existingTournament) {
        throw new ConflictException(`Tournament with name "${updateTournamentDto.name}" already exists`);
      }
    }

    // Update fields
    if (updateTournamentDto.name !== undefined) {
      tournament.name = updateTournamentDto.name;
    }
    if (updateTournamentDto.startDate !== undefined) {
      tournament.startDate = new Date(updateTournamentDto.startDate);
    }

    return this.tournamentsRepository.save(tournament);
  }

  async remove(id: string): Promise<void> {
    const tournament = await this.findOne(id);
    
    // Note: Cascade delete will handle related pools and games if configured in entity
    // If not, you may want to check for related records and handle them appropriately
    await this.tournamentsRepository.remove(tournament);
  }
}

