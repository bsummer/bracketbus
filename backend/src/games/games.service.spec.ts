/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GamesService } from './games.service';
import { Game, TournamentTeam, Tournament, Team, GameStatus } from '../common/entities';
import { ScoresService } from '../scores/scores.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

describe('GamesService', () => {
  let service: GamesService;

  const mockGamesRepository = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockTournamentTeamRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockTournamentsRepository = {
    findOne: jest.fn(),
  };

  const mockTeamsRepository = {
    findOne: jest.fn(),
  };

  const mockScoresService = {
    calculateScoresForGame: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        {
          provide: getRepositoryToken(Game),
          useValue: mockGamesRepository,
        },
        {
          provide: getRepositoryToken(TournamentTeam),
          useValue: mockTournamentTeamRepository,
        },
        {
          provide: getRepositoryToken(Tournament),
          useValue: mockTournamentsRepository,
        },
        {
          provide: getRepositoryToken(Team),
          useValue: mockTeamsRepository,
        },
        {
          provide: ScoresService,
          useValue: mockScoresService,
        },
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
    
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllByTournament', () => {
    it('should return games for a tournament', async () => {
      const tournamentId = 'tournament-1';
      const tournament = { id: tournamentId, name: 'Tournament' };
      const games = [
        { id: 'game-1', tournamentId, round: 1, gameNumber: 1 },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(games),
      };

      mockTournamentsRepository.findOne.mockResolvedValue(tournament);
      mockGamesRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockTournamentTeamRepository.find.mockResolvedValue([]);

      const result = await service.findAllByTournament(tournamentId);

      expect(result).toEqual(games);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'game.tournament_id = :tournamentId',
        { tournamentId },
      );
    });

    it('should throw NotFoundException if tournament does not exist', async () => {
      mockTournamentsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findAllByTournament('invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createForTournament - Round 1', () => {
    const tournamentId = 'tournament-1';
    const createDto = {
      round: 1,
      gameNumber: 1,
      region: 'East',
      team1Id: 'team-1',
      team2Id: 'team-2',
      status: GameStatus.SCHEDULED,
    };

    it('should create a Round 1 game', async () => {
      const tournament = { id: tournamentId, name: 'Tournament' };
      const team1TournamentTeam = {
        id: 'tt-1',
        tournamentId,
        teamId: 'team-1',
        region: 'East',
      };
      const team2TournamentTeam = {
        id: 'tt-2',
        tournamentId,
        teamId: 'team-2',
        region: 'East',
      };
      const game = { id: 'game-1', tournamentId, ...createDto };

      mockTournamentsRepository.findOne.mockResolvedValue(tournament);
      // Mock the sequence of calls in createForTournament:
      // 1. Check for duplicate game number (gamesRepository.findOne)
      // 2-3. Find tournament teams for team1 and team2 (tournamentTeamRepository.findOne)
      // 4-5. validateTeamNotInOtherGame checks (gamesRepository.findOne twice)
      mockGamesRepository.findOne
        .mockResolvedValueOnce(null) // No duplicate game number
        .mockResolvedValueOnce(null) // Check team1 in other game - not found (validateTeamNotInOtherGame)
        .mockResolvedValueOnce(null); // Check team2 in other game - not found (validateTeamNotInOtherGame)
      mockTournamentTeamRepository.findOne
        .mockResolvedValueOnce(team1TournamentTeam)
        .mockResolvedValueOnce(team2TournamentTeam);
      mockGamesRepository.create.mockReturnValue(game);
      mockGamesRepository.save.mockResolvedValue(game);

      const result = await service.createForTournament(tournamentId, createDto);

      expect(result).toEqual(game);
      expect(mockGamesRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if game number already exists', async () => {
      const tournament = { id: tournamentId, name: 'Tournament' };
      const existingGame = {
        id: 'game-1',
        tournamentId,
        round: 1,
        gameNumber: 1,
      };

      mockTournamentsRepository.findOne.mockResolvedValue(tournament);
      mockGamesRepository.findOne.mockResolvedValue(existingGame);

      await expect(
        service.createForTournament(tournamentId, createDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if region is missing for Round 1', async () => {
      const tournament = { id: tournamentId, name: 'Tournament' };
      const invalidDto = { ...createDto, region: undefined };

      mockTournamentsRepository.findOne.mockResolvedValue(tournament);
      mockGamesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createForTournament(tournamentId, invalidDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if teams are missing for Round 1', async () => {
      const tournament = { id: tournamentId, name: 'Tournament' };
      const invalidDto = { ...createDto, team1Id: undefined };

      mockTournamentsRepository.findOne.mockResolvedValue(tournament);
      mockGamesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createForTournament(tournamentId, invalidDto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createForTournament - Round 2+', () => {
    const tournamentId = 'tournament-1';
    const createDto = {
      round: 2,
      gameNumber: 1,
      parentGame1Id: 'game-1',
      parentGame2Id: 'game-2',
      status: GameStatus.SCHEDULED,
    };

    it('should create a Round 2+ game with parent games', async () => {
      const tournament = { id: tournamentId, name: 'Tournament' };
      const parentGame1 = {
        id: 'game-1',
        tournamentId,
        round: 1,
        gameNumber: 1,
      };
      const parentGame2 = {
        id: 'game-2',
        tournamentId,
        round: 1,
        gameNumber: 2,
      };
      const game = { id: 'game-3', tournamentId, ...createDto };

      mockTournamentsRepository.findOne.mockResolvedValue(tournament);
      mockGamesRepository.findOne
        .mockResolvedValueOnce(null) // No duplicate game number
        .mockResolvedValueOnce(parentGame1) // Parent game 1
        .mockResolvedValueOnce(parentGame2) // Parent game 2
        .mockResolvedValueOnce(null) // Check parent game 1 not used
        .mockResolvedValueOnce(null); // Check parent game 2 not used
      mockGamesRepository.create.mockReturnValue(game);
      mockGamesRepository.save.mockResolvedValue(game);

      const result = await service.createForTournament(tournamentId, createDto);

      expect(result).toEqual(game);
      expect(mockGamesRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if parent games are missing', async () => {
      const tournament = { id: tournamentId, name: 'Tournament' };
      const invalidDto = { ...createDto, parentGame1Id: undefined };

      mockTournamentsRepository.findOne.mockResolvedValue(tournament);
      mockGamesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createForTournament(tournamentId, invalidDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if parent game is from wrong round', async () => {
      const tournament = { id: tournamentId, name: 'Tournament' };
      const parentGame1 = {
        id: 'game-1',
        tournamentId,
        round: 2, // Wrong round - should be 1
        gameNumber: 1,
      };

      mockTournamentsRepository.findOne.mockResolvedValue(tournament);
      mockGamesRepository.findOne
        .mockResolvedValueOnce(null) // No duplicate game number
        .mockResolvedValueOnce(parentGame1); // Parent game 1

      await expect(
        service.createForTournament(tournamentId, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if parent game already used', async () => {
      const tournament = { id: tournamentId, name: 'Tournament' };
      const parentGame1 = {
        id: 'game-1',
        tournamentId,
        round: 1,
        gameNumber: 1,
      };
      const parentGame2 = {
        id: 'game-2',
        tournamentId,
        round: 1,
        gameNumber: 2,
      };
      const existingGame = {
        id: 'game-3',
        tournamentId,
        round: 2,
        parentGame1Id: 'game-1',
      };

      mockTournamentsRepository.findOne.mockResolvedValue(tournament);
      mockGamesRepository.findOne
        .mockResolvedValueOnce(null) // No duplicate game number
        .mockResolvedValueOnce(parentGame1) // Parent game 1
        .mockResolvedValueOnce(parentGame2) // Parent game 2
        .mockResolvedValueOnce(existingGame); // Parent game 1 already used

      await expect(
        service.createForTournament(tournamentId, createDto),
      ).rejects.toThrow(ConflictException);
    });
  });
});

