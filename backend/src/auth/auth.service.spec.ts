/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../common/entities';
import { UnauthorizedException } from '@nestjs/common';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  
  const mockUsersRepository = {
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockUsersService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password hash when credentials are valid', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        passwordHash: 'hashed-password',
        email: 'test@example.com',
        role: UserRole.USER,
      };

      mockUsersRepository.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('testuser', 'password');

      expect(result).toEqual({
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.USER,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null when user does not exist', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('testuser', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        passwordHash: 'hashed-password',
      };

      mockUsersRepository.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('testuser', 'wrong-password');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and user when credentials are valid', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.USER,
      };

      const token = 'jwt-token';

      mockUsersRepository.findOne.mockResolvedValue({
        ...user,
        passwordHash: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.login({
        username: 'testuser',
        password: 'password',
      });

      expect(result).toEqual({
        access_token: token,
        user: {
          id: 'user-1',
          username: 'testuser',
          role: UserRole.USER,
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        username: 'testuser',
        sub: 'user-1',
        role: UserRole.USER,
      });
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({
          username: 'testuser',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUserById', () => {
    it('should return user when found', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
      };

      mockUsersRepository.findOne.mockResolvedValue(user);

      const result = await service.validateUserById('user-1');

      expect(result).toEqual(user);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should return null when user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUserById('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const createUserDto = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
      };

      const createdUser = {
        id: 'user-1',
        username: 'newuser',
        email: 'newuser@example.com',
      };

      mockUsersService.create.mockResolvedValue(createdUser);

      const result = await service.register(createUserDto);

      expect(result).toEqual({
        message: 'User created successfully',
        user: {
          id: 'user-1',
          username: 'newuser',
          email: 'newuser@example.com',
        },
      });
      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
    });
  });
});

