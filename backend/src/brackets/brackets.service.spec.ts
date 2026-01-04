/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BracketsService } from './brackets.service';
import {
  Bracket,
  Pick,
  Pool,
  PoolMember,
  PoolMemberStatus,
  Game,
  Tournament,
  GameStatus,
  TournamentTeam,
} from '../common/entities';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

describe('BracketsService', () => {
  let service: BracketsService;

  const mockBracketsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockPicksRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockPoolsRepository = {
    findOne: jest.fn(),
  };

  const mockPoolMembersRepository = {
    findOne: jest.fn(),
  };

  const mockGamesRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockTournamentsRepository = {
    findOne: jest.fn(),
  };

  const mockTournamentTeamRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BracketsService,
        {
          provide: getRepositoryToken(Bracket),
          useValue: mockBracketsRepository,
        },
        {
          provide: getRepositoryToken(Pick),
          useValue: mockPicksRepository,
        },
        {
          provide: getRepositoryToken(Pool),
          useValue: mockPoolsRepository,
        },
        {
          provide: getRepositoryToken(PoolMember),
          useValue: mockPoolMembersRepository,
        },
        {
          provide: getRepositoryToken(Game),
          useValue: mockGamesRepository,
        },
        {
          provide: getRepositoryToken(Tournament),
          useValue: mockTournamentsRepository,
        },
        {
          provide: getRepositoryToken(TournamentTeam),
          useValue: mockTournamentTeamRepository,
        },
      ],
    }).compile();

    service = module.get<BracketsService>(BracketsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const userId = 'user-1';
    const poolId = 'pool-1';
    const createDto = {
      name: 'My Bracket',
      poolId,
      picks: [
        { gameId: 'game-1', predictedWinnerId: 'team-1' },
        { gameId: 'game-2', predictedWinnerId: 'team-3' },
      ],
    };

    const pool = {
      id: poolId,
      tournamentId: 'tournament-1',
      tournament: { id: 'tournament-1', startDate: new Date('2025-04-01') },
    };

    const member = {
      id: 'member-1',
      poolId,
      userId,
      status: PoolMemberStatus.ACTIVE,
    };

    const games = [
      {
        id: 'game-1',
        round: 1,
        gameNumber: 1,
        team1Id: 'team-1',
        team2Id: 'team-2',
        team1: { id: 'team-1' },
        team2: { id: 'team-2' },
      },
      {
        id: 'game-2',
        round: 1,
        gameNumber: 2,
        team1Id: 'team-3',
        team2Id: 'team-4',
        team1: { id: 'team-3' },
        team2: { id: 'team-4' },
      },
    ];

    it('should create a bracket successfully', async () => {
      const bracket = { id: 'bracket-1', ...createDto, userId };
      const savedBracket = { ...bracket, picks: [] };

      // Create mock picks with game data for updateBracketWinner
      const mockPicks = [
        {
          id: 'pick-1',
          bracketId: bracket.id,
          gameId: 'game-1',
          predictedWinnerId: 'team-1',
          game: { id: 'game-1', gameNumber: 1, round: 1 },
        },
        {
          id: 'pick-2',
          bracketId: bracket.id,
          gameId: 'game-2',
          predictedWinnerId: 'team-3',
          game: { id: 'game-2', gameNumber: 2, round: 1 },
        },
      ];

      const bracketWithPicks = {
        ...savedBracket,
        pool,
        picks: mockPicks,
      };

      mockPoolsRepository.findOne
        .mockResolvedValueOnce(pool) // For create method
        .mockResolvedValueOnce(pool) // For checkBracketLocked in create
        .mockResolvedValueOnce(pool) // For checkBracketLocked in findOne (called from updateBracketWinner)
        .mockResolvedValueOnce(pool); // For checkBracketLocked in findOne (called at end of create)
      mockPoolMembersRepository.findOne.mockResolvedValue(member);
      mockBracketsRepository.findOne
        .mockResolvedValueOnce(null) // Initial check for existing bracket in create
        .mockResolvedValueOnce(bracketWithPicks) // For updateBracketWinner -> findOne
        .mockResolvedValueOnce(bracketWithPicks); // Final return from create -> findOne
      mockGamesRepository.find.mockResolvedValue(games);
      mockGamesRepository.findOne
        .mockResolvedValueOnce(null) // For checkBracketLocked in create
        .mockResolvedValueOnce(null) // For checkBracketLocked in findOne (called from updateBracketWinner)
        .mockResolvedValueOnce(null); // For checkBracketLocked in findOne (called at end of create)
      mockBracketsRepository.create.mockReturnValue(bracket);
      mockBracketsRepository.save
        .mockResolvedValueOnce(savedBracket) // Save bracket
        .mockResolvedValueOnce(bracketWithPicks); // Save in updateBracketWinner
      mockPicksRepository.create.mockImplementation((pick) => pick);
      mockPicksRepository.save.mockResolvedValue(mockPicks);
      mockTournamentTeamRepository.find.mockResolvedValue([]);

      const _result = await service.create(createDto, userId);

      expect(mockPoolsRepository.findOne).toHaveBeenCalledWith({
        where: { id: poolId },
        relations: ['tournament'],
      });
      expect(mockPoolMembersRepository.findOne).toHaveBeenCalledWith({
        where: {
          poolId,
          userId,
          status: PoolMemberStatus.ACTIVE,
        },
      });
      expect(mockBracketsRepository.save).toHaveBeenCalled();
      expect(mockPicksRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if pool not found', async () => {
      mockPoolsRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not a pool member', async () => {
      mockPoolsRepository.findOne.mockResolvedValue(pool);
      mockPoolMembersRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, userId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if user already has a bracket in pool', async () => {
      mockPoolsRepository.findOne.mockResolvedValue(pool);
      mockPoolMembersRepository.findOne.mockResolvedValue(member);
      mockBracketsRepository.findOne.mockResolvedValue({ id: 'existing-bracket' });

      await expect(service.create(createDto, userId)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if invalid game IDs', async () => {
      mockPoolsRepository.findOne.mockResolvedValue(pool);
      mockPoolMembersRepository.findOne.mockResolvedValue(member);
      mockBracketsRepository.findOne.mockResolvedValue(null);
      mockGamesRepository.find.mockResolvedValue([games[0]]); // Only one game found

      await expect(service.create(createDto, userId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if predicted winner not in game teams (Round 1)', async () => {
      mockPoolsRepository.findOne.mockResolvedValue(pool);
      mockPoolMembersRepository.findOne.mockResolvedValue(member);
      mockBracketsRepository.findOne.mockResolvedValue(null);
      const invalidPickDto = {
        ...createDto,
        picks: [{ gameId: 'game-1', predictedWinnerId: 'invalid-team' }],
      };
      mockGamesRepository.find.mockResolvedValue([games[0]]);

      await expect(service.create(invalidPickDto, userId)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if tournament has started', async () => {
      const firstGame = {
        id: 'first-game',
        round: 1,
        gameNumber: 1,
        status: GameStatus.IN_PROGRESS,
        tournamentId: 'tournament-1',
      };

      // Ensure pool has tournament relation for checkBracketLocked
      const poolWithTournament = {
        ...pool,
        tournament: { id: 'tournament-1', startDate: new Date('2025-04-01') },
      };

      // Mock poolsRepository.findOne: first call in create, second call in checkBracketLocked
      mockPoolsRepository.findOne
        .mockResolvedValueOnce(poolWithTournament) // First call in create method (line 131)
        .mockResolvedValueOnce(poolWithTournament); // Second call in checkBracketLocked (line 93)
      mockPoolMembersRepository.findOne.mockResolvedValue(member);
      mockBracketsRepository.findOne.mockResolvedValue(null); // No existing bracket
      mockGamesRepository.find.mockResolvedValue(games); // For validation in create
      // Mock gamesRepository.findOne: called in checkBracketLocked (line 106)
      // This should return firstGame which has status IN_PROGRESS, causing checkBracketLocked to return true
      mockGamesRepository.findOne.mockResolvedValueOnce(firstGame);

      await expect(service.create(createDto, userId)).rejects.toThrow(ForbiddenException);
      
      // Verify that bracket was not saved (exception should be thrown before save)
      expect(mockBracketsRepository.save).not.toHaveBeenCalled();
      // Verify that checkBracketLocked was called (gamesRepository.findOne should be called)
      expect(mockGamesRepository.findOne).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return brackets for a user', async () => {
      const userId = 'user-1';
      const brackets = [
        {
          id: 'bracket-1',
          userId,
          pool: { id: 'pool-1', tournamentId: 'tournament-1' },
          picks: [],
        },
      ];

      mockBracketsRepository.find.mockResolvedValue(brackets);
      mockTournamentTeamRepository.find.mockResolvedValue([]);

      const result = await service.findAll(userId);

      expect(mockBracketsRepository.find).toHaveBeenCalledWith({
        where: { userId },
        relations: ['pool', 'pool.tournament', 'picks', 'picks.game', 'picks.predictedWinner'],
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual(brackets);
    });
  });

  describe('findOne', () => {
    it('should return a bracket by id', async () => {
      const bracketId = 'bracket-1';
      const bracket = {
        id: bracketId,
        pool: { id: 'pool-1', tournamentId: 'tournament-1' },
        picks: [],
      };

      mockBracketsRepository.findOne.mockResolvedValue(bracket);
      mockTournamentTeamRepository.find.mockResolvedValue([]);
      mockPoolsRepository.findOne.mockResolvedValue({
        id: 'pool-1',
        tournament: { id: 'tournament-1' },
      });
      mockGamesRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(bracketId);

      expect(mockBracketsRepository.findOne).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if bracket not found', async () => {
      mockBracketsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const bracketId = 'bracket-1';
    const userId = 'user-1';
    const bracket = {
      id: bracketId,
      userId,
      poolId: 'pool-1',
      pool: { id: 'pool-1', tournamentId: 'tournament-1' },
      picks: [],
    };

    it('should update a bracket successfully', async () => {
      const updateDto = {
        picks: [{ gameId: 'game-1', predictedWinnerId: 'team-1' }],
      };

      // Set gameDate to a future date to avoid "game has already started" error
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const game = {
        id: 'game-1',
        round: 1,
        gameNumber: 1,
        team1Id: 'team-1',
        team2Id: 'team-2',
        status: GameStatus.SCHEDULED,
        gameDate: futureDate,
      };

      const mockPick = {
        id: 'pick-1',
        bracketId,
        gameId: 'game-1',
        predictedWinnerId: 'team-1',
        game: { id: 'game-1', gameNumber: 1, round: 1 },
      };

      const bracketWithPicks = {
        ...bracket,
        picks: [mockPick],
      };

      // Mock findOne calls: first in update (line 285), second in updateBracketWinner (line 353), third at end (line 335)
      mockBracketsRepository.findOne
        .mockResolvedValueOnce(bracket) // First call in update (line 285)
        .mockResolvedValueOnce(bracketWithPicks) // Second call in updateBracketWinner (line 353)
        .mockResolvedValueOnce(bracketWithPicks); // Third call at end of update (line 335)
      mockTournamentTeamRepository.find
        .mockResolvedValueOnce([]) // For first findOne
        .mockResolvedValueOnce([]) // For updateBracketWinner findOne
        .mockResolvedValueOnce([]); // For final findOne
      // Mock poolsRepository.findOne: called in checkBracketLocked
      // First findOne (line 285) -> checkBracketLocked internally
      // Direct checkBracketLocked (line 291)
      // updateBracketWinner -> findOne -> checkBracketLocked internally
      // Final findOne (line 335) -> checkBracketLocked internally
      mockPoolsRepository.findOne
        .mockResolvedValueOnce({
          id: 'pool-1',
          tournament: { id: 'tournament-1' },
        })
        .mockResolvedValueOnce({
          id: 'pool-1',
          tournament: { id: 'tournament-1' },
        })
        .mockResolvedValueOnce({
          id: 'pool-1',
          tournament: { id: 'tournament-1' },
        })
        .mockResolvedValueOnce({
          id: 'pool-1',
          tournament: { id: 'tournament-1' },
        });
      // Mock gamesRepository.findOne: called in checkBracketLocked (4 times total)
      mockGamesRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockGamesRepository.find.mockResolvedValue([game]);
      mockPicksRepository.delete.mockResolvedValue({});
      mockPicksRepository.create.mockImplementation((pick) => pick);
      mockPicksRepository.save.mockResolvedValue([mockPick]);
      mockBracketsRepository.save.mockResolvedValue(bracketWithPicks);

      const _result = await service.update(bracketId, updateDto, userId);

      expect(mockPicksRepository.delete).toHaveBeenCalledWith({ bracketId });
      expect(mockPicksRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not bracket owner', async () => {
      const otherUserBracket = { ...bracket, userId: 'other-user' };
      // findOne is called first (line 285), which calls checkBracketLocked internally
      // findOne returns a DTO (BracketResponseDto) which includes isLocked
      // The user check happens at line 287, before any picks processing
      // When updateDto is empty {}, picks processing is skipped, but user check should still throw
      mockBracketsRepository.findOne.mockResolvedValueOnce(otherUserBracket);
      mockTournamentTeamRepository.find.mockResolvedValueOnce([]);
      mockPoolsRepository.findOne.mockResolvedValueOnce({
        id: 'pool-1',
        tournament: { id: 'tournament-1' },
      });
      mockGamesRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.update(bracketId, {}, userId)).rejects.toThrow(ForbiddenException);
      // Verify that the user check happened (findOne was called)
      expect(mockBracketsRepository.findOne).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if bracket is locked', async () => {
      const lockedBracket = { ...bracket, lockedAt: new Date() };
      // findOne is called first (line 285), which calls checkBracketLocked internally
      // checkBracketLocked checks lockedAt first and returns true immediately, so no repository calls
      mockBracketsRepository.findOne.mockResolvedValueOnce(lockedBracket);
      mockTournamentTeamRepository.find.mockResolvedValueOnce([]);
      // checkBracketLocked will return true because lockedAt is set, so it won't call poolsRepository or gamesRepository
      // Even when called from findOne, it checks lockedAt first

      await expect(service.update(bracketId, {}, userId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    const bracketId = 'bracket-1';
    const userId = 'user-1';
    const bracket = {
      id: bracketId,
      userId,
      poolId: 'pool-1',
      pool: { id: 'pool-1', tournamentId: 'tournament-1' },
      picks: [],
    };

    it('should delete a bracket successfully', async () => {
      // findOne returns a DTO (BracketResponseDto) which includes isLocked property
      const bracketDto = {
        ...bracket,
        isLocked: false,
      };
      mockBracketsRepository.findOne.mockResolvedValueOnce(bracket);
      mockTournamentTeamRepository.find.mockResolvedValueOnce([]);
      mockPoolsRepository.findOne.mockResolvedValueOnce({
        id: 'pool-1',
        tournament: { id: 'tournament-1' },
      });
      mockGamesRepository.findOne.mockResolvedValueOnce(null);
      mockBracketsRepository.remove.mockResolvedValue(bracketDto);

      await service.remove(bracketId, userId);

      // remove is called with the DTO returned from findOne (which has isLocked property)
      expect(mockBracketsRepository.remove).toHaveBeenCalledWith(
        expect.objectContaining({
          id: bracketId,
          userId,
          poolId: 'pool-1',
          isLocked: false,
        }),
      );
    });

    it('should throw ForbiddenException if user is not bracket owner', async () => {
      const otherUserBracket = { ...bracket, userId: 'other-user' };
      mockBracketsRepository.findOne.mockResolvedValueOnce(otherUserBracket);
      mockTournamentTeamRepository.find.mockResolvedValueOnce([]);
      // checkBracketLocked won't be called because exception is thrown before

      await expect(service.remove(bracketId, userId)).rejects.toThrow(ForbiddenException);
    });
  });
});

