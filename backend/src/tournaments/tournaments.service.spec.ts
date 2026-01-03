import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TournamentsService } from './tournaments.service';
import { Tournament } from '../common/entities/tournament.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('TournamentsService', () => {
  let service: TournamentsService;
  let repository: Repository<Tournament>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentsService,
        {
          provide: getRepositoryToken(Tournament),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TournamentsService>(TournamentsService);
    repository = module.get<Repository<Tournament>>(
      getRepositoryToken(Tournament),
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of tournaments', async () => {
      const tournaments = [
        { id: '1', name: 'Tournament 1', startDate: new Date() },
        { id: '2', name: 'Tournament 2', startDate: new Date() },
      ];
      mockRepository.find.mockResolvedValue(tournaments);

      const result = await service.findAll();

      expect(result).toEqual(tournaments);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { startDate: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a tournament by id', async () => {
      const tournament = { id: '1', name: 'Tournament 1', startDate: new Date() };
      mockRepository.findOne.mockResolvedValue(tournament);

      const result = await service.findOne('1');

      expect(result).toEqual(tournament);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException if tournament not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a tournament', async () => {
      const createDto = { name: 'New Tournament', startDate: '2025-03-15' };
      const tournament = { id: '1', ...createDto, startDate: new Date(createDto.startDate) };

      mockRepository.findOne.mockResolvedValue(null); // No duplicate
      mockRepository.create.mockReturnValue(tournament);
      mockRepository.save.mockResolvedValue(tournament);

      const result = await service.create(createDto);

      expect(result).toEqual(tournament);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { name: createDto.name },
      });
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if tournament name already exists', async () => {
      const createDto = { name: 'Existing Tournament', startDate: '2025-03-15' };
      const existingTournament = { id: '1', name: 'Existing Tournament' };

      mockRepository.findOne.mockResolvedValue(existingTournament);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a tournament', async () => {
      const tournament = { id: '1', name: 'Old Name', startDate: new Date() };
      const updateDto = { name: 'New Name' };
      const updatedTournament = { ...tournament, name: 'New Name' };

      mockRepository.findOne
        .mockResolvedValueOnce(tournament) // findOne for existing tournament
        .mockResolvedValueOnce(null); // findOne for duplicate check
      mockRepository.save.mockResolvedValue(updatedTournament);

      const result = await service.update('1', updateDto);

      expect(result.name).toBe('New Name');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if new name conflicts with existing tournament', async () => {
      const tournament = { id: '1', name: 'Old Name', startDate: new Date() };
      const updateDto = { name: 'Existing Name' };
      const existingTournament = { id: '2', name: 'Existing Name' };

      mockRepository.findOne
        .mockResolvedValueOnce(tournament) // findOne for existing tournament
        .mockResolvedValueOnce(existingTournament); // findOne for duplicate check

      await expect(service.update('1', updateDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete a tournament', async () => {
      const tournament = { id: '1', name: 'Tournament', startDate: new Date() };
      mockRepository.findOne.mockResolvedValue(tournament);
      mockRepository.remove.mockResolvedValue(tournament);

      await service.remove('1');

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(mockRepository.remove).toHaveBeenCalledWith(tournament);
    });

    it('should throw NotFoundException if tournament not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('1')).rejects.toThrow(NotFoundException);
    });
  });
});

