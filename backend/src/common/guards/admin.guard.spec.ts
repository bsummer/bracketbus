import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminGuard } from './admin.guard';
import { User, UserRole } from '../entities/user.entity';
import { ForbiddenException } from '@nestjs/common';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let userRepository: Repository<User>;

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockGetRequest = jest.fn();
  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: mockGetRequest,
    }),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminGuard,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    guard = module.get<AdminGuard>(AdminGuard);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access for admin user', async () => {
    const request = {
      user: { userId: 'user-1' },
    };
    const adminUser = {
      id: 'user-1',
      username: 'admin',
      role: UserRole.ADMIN,
    };

    mockGetRequest.mockReturnValue(request);
    mockUserRepository.findOne.mockResolvedValue(adminUser);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(mockUserRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'user-1' },
    });
  });

  it('should deny access for non-admin user', async () => {
    const request = {
      user: { userId: 'user-1' },
    };
    const regularUser = {
      id: 'user-1',
      username: 'user1',
      role: UserRole.USER,
    };

    mockGetRequest.mockReturnValue(request);
    mockUserRepository.findOne.mockResolvedValue(regularUser);

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should deny access if user not authenticated', async () => {
    const request = {
      user: null,
    };

    mockGetRequest.mockReturnValue(request);

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should deny access if user not found in database', async () => {
    const request = {
      user: { userId: 'user-1' },
    };

    mockGetRequest.mockReturnValue(request);
    mockUserRepository.findOne.mockResolvedValue(null);

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      ForbiddenException,
    );
  });
});

