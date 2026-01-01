import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TournamentTeam, Tournament, Team } from '../common/entities';
import { CreateTournamentTeamDto } from './dto/create-tournament-team.dto';
import { UpdateTournamentTeamDto } from './dto/update-tournament-team.dto';

@Injectable()
export class TournamentTeamsService {
  constructor(
    @InjectRepository(TournamentTeam)
    private tournamentTeamsRepository: Repository<TournamentTeam>,
    @InjectRepository(Tournament)
    private tournamentsRepository: Repository<Tournament>,
    @InjectRepository(Team)
    private teamsRepository: Repository<Team>,
  ) {}

  async findAllByTournament(tournamentId: string): Promise<TournamentTeam[]> {
    // Verify tournament exists
    const tournament = await this.tournamentsRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
    }

    return this.tournamentTeamsRepository.find({
      where: { tournamentId },
      relations: ['team'],
      order: { region: 'ASC', seed: 'ASC' },
    });
  }

  async findOne(id: string): Promise<TournamentTeam> {
    const tournamentTeam = await this.tournamentTeamsRepository.findOne({
      where: { id },
      relations: ['team', 'tournament'],
    });

    if (!tournamentTeam) {
      throw new NotFoundException(`Tournament team with ID ${id} not found`);
    }

    return tournamentTeam;
  }

  async create(createTournamentTeamDto: CreateTournamentTeamDto): Promise<TournamentTeam> {
    // Verify tournament exists
    const tournament = await this.tournamentsRepository.findOne({
      where: { id: createTournamentTeamDto.tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${createTournamentTeamDto.tournamentId} not found`);
    }

    // Verify team exists
    const team = await this.teamsRepository.findOne({
      where: { id: createTournamentTeamDto.teamId },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${createTournamentTeamDto.teamId} not found`);
    }

    // Check if team is already in tournament
    const existingTeam = await this.tournamentTeamsRepository.findOne({
      where: {
        tournamentId: createTournamentTeamDto.tournamentId,
        teamId: createTournamentTeamDto.teamId,
      },
    });

    if (existingTeam) {
      throw new ConflictException('This team is already in the tournament');
    }

    // Check if (region, seed) combination is already used
    const existingRegionSeed = await this.tournamentTeamsRepository.findOne({
      where: {
        tournamentId: createTournamentTeamDto.tournamentId,
        region: createTournamentTeamDto.region,
        seed: createTournamentTeamDto.seed,
      },
    });

    if (existingRegionSeed) {
      throw new ConflictException(
        `This seed/region combination (${createTournamentTeamDto.region} #${createTournamentTeamDto.seed}) is already assigned in this tournament`,
      );
    }

    const tournamentTeam = this.tournamentTeamsRepository.create({
      tournamentId: createTournamentTeamDto.tournamentId,
      teamId: createTournamentTeamDto.teamId,
      region: createTournamentTeamDto.region,
      seed: createTournamentTeamDto.seed,
    });

    return this.tournamentTeamsRepository.save(tournamentTeam);
  }

  async update(id: string, updateTournamentTeamDto: UpdateTournamentTeamDto): Promise<TournamentTeam> {
    const tournamentTeam = await this.findOne(id);

    // If updating region or seed, check for conflicts
    if (updateTournamentTeamDto.region !== undefined || updateTournamentTeamDto.seed !== undefined) {
      const newRegion = updateTournamentTeamDto.region ?? tournamentTeam.region;
      const newSeed = updateTournamentTeamDto.seed ?? tournamentTeam.seed;

      // Check if (region, seed) combination is already used by another tournament team
      const existingRegionSeed = await this.tournamentTeamsRepository.findOne({
        where: {
          tournamentId: tournamentTeam.tournamentId,
          region: newRegion,
          seed: newSeed,
        },
      });

      // Allow if it's the same record being updated
      if (existingRegionSeed && existingRegionSeed.id !== id) {
        throw new ConflictException(
          `This seed/region combination (${newRegion} #${newSeed}) is already assigned in this tournament`,
        );
      }
    }

    // Update fields
    if (updateTournamentTeamDto.region !== undefined) {
      tournamentTeam.region = updateTournamentTeamDto.region;
    }
    if (updateTournamentTeamDto.seed !== undefined) {
      tournamentTeam.seed = updateTournamentTeamDto.seed;
    }

    return this.tournamentTeamsRepository.save(tournamentTeam);
  }

  async remove(id: string): Promise<void> {
    const tournamentTeam = await this.findOne(id);
    await this.tournamentTeamsRepository.remove(tournamentTeam);
  }
}

