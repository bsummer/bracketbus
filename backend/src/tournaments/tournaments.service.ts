import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from '../common/entities/tournament.entity';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';

/**
 * Service for managing tournaments.
 * Handles CRUD operations for tournaments with validation for duplicate names.
 */
@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament)
    private tournamentsRepository: Repository<Tournament>,
  ) {}

  /**
   * Retrieves all tournaments, sorted by start date (newest first).
   * @returns Array of all tournaments
   */
  async findAll(): Promise<Tournament[]> {
    return this.tournamentsRepository.find({
      order: { startDate: 'DESC' },
    });
  }

  /**
   * Retrieves a tournament by ID.
   * @param id - Tournament UUID
   * @returns Tournament entity
   * @throws NotFoundException if tournament not found
   */
  async findOne(id: string): Promise<Tournament> {
    const tournament = await this.tournamentsRepository.findOne({
      where: { id },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${id} not found`);
    }

    return tournament;
  }

  /**
   * Creates a new tournament.
   * Business Rules:
   * - Tournament name must be unique
   * - Start date must be a valid date string
   * 
   * @param createTournamentDto - Tournament creation data
   * @returns Created tournament entity
   * @throws ConflictException if tournament name already exists
   */
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

  /**
   * Updates an existing tournament.
   * Business Rules:
   * - Tournament name must remain unique if changed
   * - Only provided fields are updated
   * 
   * @param id - Tournament UUID
   * @param updateTournamentDto - Partial tournament data to update
   * @returns Updated tournament entity
   * @throws NotFoundException if tournament not found
   * @throws ConflictException if new name conflicts with existing tournament
   */
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

  /**
   * Deletes a tournament.
   * Note: Cascade delete will handle related pools and games if configured in entity.
   * 
   * @param id - Tournament UUID
   * @throws NotFoundException if tournament not found
   */
  async remove(id: string): Promise<void> {
    const tournament = await this.findOne(id);
    await this.tournamentsRepository.remove(tournament);
  }
}

