/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PoolsService } from './pools.service';
import { ScoresService } from '../scores/scores.service';
import {
  Pool,
  PoolMember,
  PoolMemberStatus,
  User,
  Tournament,
  Score,
} from '../common/entities';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';

describe('PoolsService', () => {
  let service: PoolsService;

  const mockPoolsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockPoolMembersRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockUsersRepository = {
    findOne: jest.fn(),
  };

  const mockTournamentsRepository = {
    findOne: jest.fn(),
  };

  const mockScoresRepository = {
    find: jest.fn(),
  };

  const mockScoresService = {
    calculateScoresForGame: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoolsService,
        {
          provide: getRepositoryToken(Pool),
          useValue: mockPoolsRepository,
        },
        {
          provide: getRepositoryToken(PoolMember),
          useValue: mockPoolMembersRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(Tournament),
          useValue: mockTournamentsRepository,
        },
        {
          provide: getRepositoryToken(Score),
          useValue: mockScoresRepository,
        },
        {
          provide: ScoresService,
          useValue: mockScoresService,
        },
      ],
    }).compile();

    service = module.get<PoolsService>(PoolsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const userId = 'user-1';
    const tournamentId = 'tournament-1';
    const createDto = {
      name: 'My Pool',
      tournamentId,
    };

    it('should create a pool with unique invite code', async () => {
      const tournament = { id: tournamentId, name: 'Tournament' };
      const pool = {
        id: 'pool-1',
        name: createDto.name,
        tournamentId,
        creatorId: userId,
        inviteCode: 'ABC12345',
      };

      mockTournamentsRepository.findOne.mockResolvedValue(tournament);
      // Chain findOne calls: duplicate check (no duplicate), final findOne with relations
      mockPoolsRepository.findOne
        .mockResolvedValueOnce(null) // No duplicate invite code
        .mockResolvedValueOnce({ // Final findOne call at end of create
          ...pool,
          tournament,
          creator: { id: userId },
          members: [],
          brackets: [],
        });
      mockPoolsRepository.create.mockReturnValue(pool);
      mockPoolsRepository.save.mockResolvedValue(pool);
      mockPoolMembersRepository.save.mockResolvedValue({
        poolId: pool.id,
        userId,
        status: PoolMemberStatus.ACTIVE,
      });

      const _result = await service.create(createDto, userId);

      expect(mockTournamentsRepository.findOne).toHaveBeenCalledWith({
        where: { id: tournamentId },
      });
      expect(mockPoolsRepository.save).toHaveBeenCalled();
      expect(mockPoolMembersRepository.save).toHaveBeenCalledWith({
        poolId: pool.id,
        userId,
        status: PoolMemberStatus.ACTIVE,
      });
    });

    it('should generate new invite code if duplicate exists', async () => {
      const tournament = { id: tournamentId, name: 'Tournament' };
      const pool = {
        id: 'pool-1',
        name: createDto.name,
        tournamentId,
        creatorId: userId,
        inviteCode: 'NEWCODE1',
      };

      mockTournamentsRepository.findOne.mockResolvedValue(tournament);
      // Chain all findOne calls: duplicate check (exists), duplicate check (unique), final findOne with relations
      mockPoolsRepository.findOne
        .mockResolvedValueOnce({ id: 'existing-pool' }) // First code exists
        .mockResolvedValueOnce(null) // Second code is unique
        .mockResolvedValueOnce({ // Final findOne call at end of create
          ...pool,
          tournament,
          creator: { id: userId },
          members: [],
          brackets: [],
        });
      mockPoolsRepository.create.mockReturnValue(pool);
      mockPoolsRepository.save.mockResolvedValue(pool);
      mockPoolMembersRepository.save.mockResolvedValue({});

      await service.create(createDto, userId);

      expect(mockPoolsRepository.findOne).toHaveBeenCalledTimes(3); // Check for duplicate (x2), then findOne
    });

    it('should throw NotFoundException if tournament not found', async () => {
      mockTournamentsRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a pool by id', async () => {
      const poolId = 'pool-1';
      const pool = {
        id: poolId,
        name: 'My Pool',
        tournament: { id: 'tournament-1' },
        creator: { id: 'user-1' },
        members: [],
        brackets: [],
        winner: null,
      };

      mockPoolsRepository.findOne.mockResolvedValue(pool);

      const result = await service.findOne(poolId);

      expect(result).toEqual(pool);
      expect(mockPoolsRepository.findOne).toHaveBeenCalledWith({
        where: { id: poolId },
        relations: ['tournament', 'creator', 'members', 'members.user', 'brackets', 'brackets.user', 'brackets.winner'],
      });
    });

    it('should throw NotFoundException if pool not found', async () => {
      mockPoolsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('join', () => {
    const userId = 'user-1';
    const joinDto = { inviteCode: 'ABC12345' };

    it('should join a pool with valid invite code', async () => {
      const pool = { id: 'pool-1', inviteCode: 'ABC12345' };

      mockPoolsRepository.findOne.mockResolvedValue(pool);
      mockPoolMembersRepository.findOne.mockResolvedValue(null); // Not a member yet
      mockPoolMembersRepository.save.mockResolvedValue({
        poolId: pool.id,
        userId,
        status: PoolMemberStatus.ACTIVE,
      });
      mockPoolsRepository.findOne.mockResolvedValueOnce(pool).mockResolvedValueOnce({
        ...pool,
        tournament: { id: 'tournament-1' },
        creator: { id: 'creator-1' },
        members: [],
        brackets: [],
      });

      const _result = await service.join(joinDto, userId);

      expect(mockPoolsRepository.findOne).toHaveBeenCalledWith({
        where: { inviteCode: joinDto.inviteCode },
      });
      expect(mockPoolMembersRepository.save).toHaveBeenCalledWith({
        poolId: pool.id,
        userId,
        status: PoolMemberStatus.ACTIVE,
      });
    });

    it('should throw NotFoundException if invite code is invalid', async () => {
      mockPoolsRepository.findOne.mockResolvedValue(null);

      await expect(service.join(joinDto, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if already a member', async () => {
      const pool = { id: 'pool-1', inviteCode: 'ABC12345' };
      const existingMember = {
        id: 'member-1',
        poolId: pool.id,
        userId,
        status: PoolMemberStatus.ACTIVE,
      };

      mockPoolsRepository.findOne.mockResolvedValue(pool);
      mockPoolMembersRepository.findOne.mockResolvedValue(existingMember);

      await expect(service.join(joinDto, userId)).rejects.toThrow(ConflictException);
    });

    it('should reactivate member if they previously left', async () => {
      const pool = { id: 'pool-1', inviteCode: 'ABC12345' };
      const existingMember = {
        id: 'member-1',
        poolId: pool.id,
        userId,
        status: PoolMemberStatus.LEFT,
        leftAt: new Date(),
      };

      mockPoolsRepository.findOne.mockResolvedValue(pool);
      mockPoolMembersRepository.findOne.mockResolvedValue(existingMember);
      mockPoolMembersRepository.save.mockResolvedValue({
        ...existingMember,
        status: PoolMemberStatus.ACTIVE,
        leftAt: null,
      });
      mockPoolsRepository.findOne.mockResolvedValueOnce(pool).mockResolvedValueOnce({
        ...pool,
        tournament: { id: 'tournament-1' },
        creator: { id: 'creator-1' },
        members: [],
        brackets: [],
      });

      await service.join(joinDto, userId);

      expect(mockPoolMembersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PoolMemberStatus.ACTIVE,
          leftAt: null,
        }),
      );
    });
  });

  describe('addMember', () => {
    const poolId = 'pool-1';
    const creatorId = 'creator-1';
    const addMemberDto = { userId: 'user-2' };

    it('should add a member to pool', async () => {
      const pool = {
        id: poolId,
        creatorId,
        tournament: { id: 'tournament-1' },
        creator: { id: creatorId },
        members: [],
        brackets: [],
      };
      const user = { id: 'user-2', username: 'newuser' };

      mockPoolsRepository.findOne.mockResolvedValue(pool);
      mockUsersRepository.findOne.mockResolvedValue(user);
      mockPoolMembersRepository.findOne.mockResolvedValue(null);
      mockPoolMembersRepository.save.mockResolvedValue({
        poolId,
        userId: 'user-2',
        status: PoolMemberStatus.ACTIVE,
      });
      mockPoolsRepository.findOne.mockResolvedValueOnce(pool).mockResolvedValueOnce(pool);

      await service.addMember(poolId, addMemberDto, creatorId);

      expect(mockPoolMembersRepository.save).toHaveBeenCalledWith({
        poolId,
        userId: 'user-2',
        status: PoolMemberStatus.ACTIVE,
      });
    });

    it('should throw ForbiddenException if user is not creator', async () => {
      const pool = {
        id: poolId,
        creatorId: 'other-creator',
        tournament: { id: 'tournament-1' },
        creator: { id: 'other-creator' },
        members: [],
        brackets: [],
      };

      mockPoolsRepository.findOne.mockResolvedValue(pool);

      await expect(service.addMember(poolId, addMemberDto, 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      const pool = {
        id: poolId,
        creatorId,
        tournament: { id: 'tournament-1' },
        creator: { id: creatorId },
        members: [],
        brackets: [],
      };

      mockPoolsRepository.findOne.mockResolvedValue(pool);
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.addMember(poolId, addMemberDto, creatorId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if user is already a member', async () => {
      const pool = {
        id: poolId,
        creatorId,
        tournament: { id: 'tournament-1' },
        creator: { id: creatorId },
        members: [],
        brackets: [],
      };
      const user = { id: 'user-2', username: 'newuser' };
      const existingMember = {
        id: 'member-1',
        poolId,
        userId: 'user-2',
        status: PoolMemberStatus.ACTIVE,
      };

      mockPoolsRepository.findOne.mockResolvedValue(pool);
      mockUsersRepository.findOne.mockResolvedValue(user);
      mockPoolMembersRepository.findOne.mockResolvedValue(existingMember);

      await expect(service.addMember(poolId, addMemberDto, creatorId)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});

