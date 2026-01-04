/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TeamsService } from './teams.service';
import { Team } from '../common/entities';

describe('TeamsService', () => {
  let service: TeamsService;

  const mockTeamsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: getRepositoryToken(Team),
          useValue: mockTeamsRepository,
        },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all teams ordered by name', async () => {
      const teams = [
        { id: 'team-1', name: 'Alabama' },
        { id: 'team-2', name: 'Duke' },
        { id: 'team-3', name: 'Kansas' },
      ];

      mockTeamsRepository.find.mockResolvedValue(teams);

      const result = await service.findAll();

      expect(result).toEqual(teams);
      expect(mockTeamsRepository.find).toHaveBeenCalledWith({
        order: { name: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a team by id', async () => {
      const team = { id: 'team-1', name: 'Duke' };
      mockTeamsRepository.findOne.mockResolvedValue(team);

      const result = await service.findOne('team-1');

      expect(result).toEqual(team);
      expect(mockTeamsRepository.findOne).toHaveBeenCalledWith({ where: { id: 'team-1' } });
    });

    it('should return null when team not found', async () => {
      mockTeamsRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne('invalid-id');

      expect(result).toBeNull();
    });
  });
});

