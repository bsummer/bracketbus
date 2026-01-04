/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User, Pool, PoolMember, PoolMemberStatus } from '../common/entities';
import { ConflictException, NotFoundException } from '@nestjs/common';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;

  const mockUsersRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockPoolsRepository = {
    findOne: jest.fn(),
  };

  const mockPoolMembersRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(Pool),
          useValue: mockPoolsRepository,
        },
        {
          provide: getRepositoryToken(PoolMember),
          useValue: mockPoolMembersRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const user = { id: 'user-1', username: 'testuser' };
      mockUsersRepository.findOne.mockResolvedValue(user);

      const result = await service.findOne('user-1');

      expect(result).toEqual(user);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });

    it('should return null when user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should return a user by username', async () => {
      const user = { id: 'user-1', username: 'testuser' };
      mockUsersRepository.findOne.mockResolvedValue(user);

      const result = await service.findByUsername('testuser');

      expect(result).toEqual(user);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({ where: { username: 'testuser' } });
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      const user = { id: 'user-1', email: 'test@example.com' };
      mockUsersRepository.findOne.mockResolvedValue(user);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(user);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [
        { id: 'user-1', username: 'user1' },
        { id: 'user-2', username: 'user2' },
      ];
      mockUsersRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(mockUsersRepository.find).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const createDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
    };

    it('should create a user successfully', async () => {
      const hashedPassword = 'hashed-password';
      const user = {
        id: 'user-1',
        username: createDto.username,
        email: createDto.email,
        passwordHash: hashedPassword,
      };

      mockUsersRepository.findOne
        .mockResolvedValueOnce(null) // Username check
        .mockResolvedValueOnce(null); // Email check
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUsersRepository.create.mockReturnValue(user);
      mockUsersRepository.save.mockResolvedValue(user);

      const result = await service.create(createDto);

      expect(result).toEqual(user);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({ where: { username: createDto.username } });
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({ where: { email: createDto.email } });
      expect(bcrypt.hash).toHaveBeenCalledWith(createDto.password, 10);
      expect(mockUsersRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if username already exists', async () => {
      const existingUser = { id: 'user-1', username: createDto.username };
      mockUsersRepository.findOne.mockResolvedValue(existingUser);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUsersRepository.findOne
        .mockResolvedValueOnce(null) // Username check
        .mockResolvedValueOnce({ id: 'user-1', email: createDto.email }); // Email check

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should add user to pool if poolId provided', async () => {
      const hashedPassword = 'hashed-password';
      const user = {
        id: 'user-1',
        username: createDto.username,
        email: createDto.email,
        passwordHash: hashedPassword,
      };
      const pool = { id: 'pool-1', name: 'My Pool' };
      const createDtoWithPool = { ...createDto, poolId: 'pool-1' };

      mockUsersRepository.findOne
        .mockResolvedValueOnce(null) // Username check
        .mockResolvedValueOnce(null); // Email check
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUsersRepository.create.mockReturnValue(user);
      mockUsersRepository.save.mockResolvedValue(user);
      mockPoolsRepository.findOne.mockResolvedValue(pool);
      mockPoolMembersRepository.findOne.mockResolvedValue(null);
      mockPoolMembersRepository.save.mockResolvedValue({
        poolId: 'pool-1',
        userId: 'user-1',
        status: PoolMemberStatus.ACTIVE,
      });

      await service.create(createDtoWithPool);

      expect(mockPoolsRepository.findOne).toHaveBeenCalledWith({ where: { id: 'pool-1' } });
      expect(mockPoolMembersRepository.save).toHaveBeenCalledWith({
        poolId: 'pool-1',
        userId: 'user-1',
        status: PoolMemberStatus.ACTIVE,
      });
    });

    it('should throw NotFoundException if pool not found', async () => {
      const hashedPassword = 'hashed-password';
      const user = {
        id: 'user-1',
        username: createDto.username,
        email: createDto.email,
        passwordHash: hashedPassword,
      };
      const createDtoWithPool = { ...createDto, poolId: 'invalid-pool' };

      mockUsersRepository.findOne
        .mockResolvedValueOnce(null) // Username check
        .mockResolvedValueOnce(null); // Email check
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUsersRepository.create.mockReturnValue(user);
      mockUsersRepository.save.mockResolvedValue(user);
      mockPoolsRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDtoWithPool)).rejects.toThrow(NotFoundException);
    });
  });
});

