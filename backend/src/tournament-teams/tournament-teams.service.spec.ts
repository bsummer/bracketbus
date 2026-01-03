import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TournamentTeamsService } from './tournament-teams.service';
import { TournamentTeam, Tournament, Team } from '../common/entities';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('TournamentTeamsService', () => {
  let service: TournamentTeamsService;

  const mockTournamentTeamRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockTournamentRepository = {
    findOne: jest.fn(),
  };

  const mockTeamRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentTeamsService,
        {
          provide: getRepositoryToken(TournamentTeam),
          useValue: mockTournamentTeamRepository,
        },
        {
          provide: getRepositoryToken(Tournament),
          useValue: mockTournamentRepository,
        },
        {
          provide: getRepositoryToken(Team),
          useValue: mockTeamRepository,
        },
      ],
    }).compile();

    service = module.get<TournamentTeamsService>(TournamentTeamsService);
    
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const tournamentId = 'tournament-1';
    const createDto = {
      teamId: 'team-1',
      region: 'East',
      seed: 1,
    };

    it('should create a tournament team', async () => {
      const tournament = { id: tournamentId, name: 'Tournament' };
      const team = { id: 'team-1', name: 'Team 1' };
      const tournamentTeam = {
        id: 'tt-1',
        tournamentId,
        ...createDto,
      };

      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      mockTeamRepository.findOne.mockResolvedValue(team);
      mockTournamentTeamRepository.findOne
        .mockResolvedValueOnce(null) // Check for duplicate team
        .mockResolvedValueOnce(null); // Check for duplicate region+seed
      mockTournamentTeamRepository.create.mockReturnValue(tournamentTeam);
      mockTournamentTeamRepository.save.mockResolvedValue(tournamentTeam);

      const result = await service.create(tournamentId, createDto);

      expect(result).toEqual(tournamentTeam);
      expect(mockTournamentTeamRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if tournament does not exist', async () => {
      mockTournamentRepository.findOne.mockResolvedValue(null);

      await expect(service.create(tournamentId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if team does not exist', async () => {
      const tournament = { id: tournamentId, name: 'Tournament' };
      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      mockTeamRepository.findOne.mockResolvedValue(null);

      await expect(service.create(tournamentId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if team already in tournament', async () => {
      const tournament = { id: tournamentId, name: 'Tournament' };
      const team = { id: 'team-1', name: 'Team 1' };
      const existingTeam = { id: 'tt-1', tournamentId, teamId: 'team-1' };

      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      mockTeamRepository.findOne.mockResolvedValue(team);
      mockTournamentTeamRepository.findOne.mockResolvedValue(existingTeam);

      await expect(service.create(tournamentId, createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockTournamentTeamRepository.findOne).toHaveBeenCalledWith({
        where: { tournamentId, teamId: createDto.teamId },
      });
    });

    it('should throw ConflictException if region+seed combination already exists', async () => {
      const tournament = { id: tournamentId, name: 'Tournament' };
      const team = { id: 'team-1', name: 'Team 1' };
      const existingRegionSeed = {
        id: 'tt-1',
        tournamentId,
        region: 'East',
        seed: 1,
      };

      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      mockTeamRepository.findOne.mockResolvedValue(team);
      mockTournamentTeamRepository.findOne
        .mockResolvedValueOnce(null) // Check for duplicate team - not found
        .mockResolvedValueOnce(existingRegionSeed); // Check for duplicate region+seed - found

      await expect(service.create(tournamentId, createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('should update tournament team region and seed', async () => {
      const tournamentTeam = {
        id: 'tt-1',
        tournamentId: 'tournament-1',
        teamId: 'team-1',
        region: 'East',
        seed: 1,
      };
      const updateDto = { region: 'West', seed: 2 };

      mockTournamentTeamRepository.findOne
        .mockResolvedValueOnce(tournamentTeam) // findOne for existing
        .mockResolvedValueOnce(null); // Check for duplicate region+seed
      mockTournamentTeamRepository.save.mockResolvedValue({
        ...tournamentTeam,
        ...updateDto,
      });

      const result = await service.update('tt-1', updateDto);

      expect(result.region).toBe('West');
      expect(result.seed).toBe(2);
      expect(mockTournamentTeamRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if new region+seed conflicts', async () => {
      const tournamentTeam = {
        id: 'tt-1',
        tournamentId: 'tournament-1',
        teamId: 'team-1',
        region: 'East',
        seed: 1,
      };
      const updateDto = { region: 'West', seed: 2 };
      const conflictingTeam = {
        id: 'tt-2',
        tournamentId: 'tournament-1',
        region: 'West',
        seed: 2,
      };

      mockTournamentTeamRepository.findOne
        .mockResolvedValueOnce(tournamentTeam) // findOne for existing
        .mockResolvedValueOnce(conflictingTeam); // Check for duplicate region+seed - found

      await expect(service.update('tt-1', updateDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});

