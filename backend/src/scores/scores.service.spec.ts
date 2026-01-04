/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScoresService } from './scores.service';
import { Pick, Score, Bracket } from '../common/entities';

describe('ScoresService', () => {
  let service: ScoresService;

  const mockPicksRepository = {
    find: jest.fn(),
    save: jest.fn(),
    manager: {
      getRepository: jest.fn(),
    },
  };

  const mockScoresRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockBracketsRepository = {
    find: jest.fn(),
  };

  const mockGameRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoresService,
        {
          provide: getRepositoryToken(Pick),
          useValue: mockPicksRepository,
        },
        {
          provide: getRepositoryToken(Score),
          useValue: mockScoresRepository,
        },
        {
          provide: getRepositoryToken(Bracket),
          useValue: mockBracketsRepository,
        },
      ],
    }).compile();

    service = module.get<ScoresService>(ScoresService);
    mockPicksRepository.manager.getRepository.mockReturnValue(mockGameRepository);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateScoresForGame', () => {
    const gameId = 'game-1';
    const bracketId = 'bracket-1';

    it('should calculate and update scores for correct picks', async () => {
      const game = {
        id: gameId,
        round: 2,
        winnerId: 'team-1',
        winner: { id: 'team-1' },
      };

      const picks = [
        {
          id: 'pick-1',
          gameId,
          bracketId,
          predictedWinnerId: 'team-1', // Correct
          game: { id: gameId, round: 2 },
          bracket: { id: bracketId },
        },
        {
          id: 'pick-2',
          gameId,
          bracketId: 'bracket-2',
          predictedWinnerId: 'team-2', // Incorrect
          game: { id: gameId, round: 2 },
          bracket: { id: 'bracket-2' },
        },
      ];

      mockGameRepository.findOne.mockResolvedValue(game);
      mockPicksRepository.find.mockResolvedValue(picks);
      mockPicksRepository.save.mockResolvedValue(picks);
      mockScoresRepository.findOne.mockResolvedValue(null);
      mockScoresRepository.create.mockImplementation((score) => score);
      mockScoresRepository.save.mockResolvedValue({});
      mockPicksRepository.find.mockResolvedValueOnce(picks).mockResolvedValueOnce([
        { id: 'pick-1', pointsEarned: 2 },
      ]);

      await service.calculateScoresForGame(gameId);

      expect(mockPicksRepository.save).toHaveBeenCalledTimes(2);
      // First pick should have 2 points (2^(2-1) = 2)
      expect(mockPicksRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          predictedWinnerId: 'team-1',
          pointsEarned: 2,
        }),
      );
      // Second pick should have 0 points (incorrect)
      expect(mockPicksRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          predictedWinnerId: 'team-2',
          pointsEarned: 0,
        }),
      );
    });

    it('should return early if game has no winner', async () => {
      const game = {
        id: gameId,
        round: 2,
        winnerId: null,
      };

      mockGameRepository.findOne.mockResolvedValue(game);

      await service.calculateScoresForGame(gameId);

      expect(mockPicksRepository.find).not.toHaveBeenCalled();
    });

    it('should return early if game does not exist', async () => {
      mockGameRepository.findOne.mockResolvedValue(null);

      await service.calculateScoresForGame(gameId);

      expect(mockPicksRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('updateBracketScore', () => {
    const bracketId = 'bracket-1';

    it('should calculate and update total bracket score', async () => {
      const picks = [
        { id: 'pick-1', bracketId, pointsEarned: 1, game: { id: 'game-1', round: 1 } },
        { id: 'pick-2', bracketId, pointsEarned: 2, game: { id: 'game-2', round: 2 } },
        { id: 'pick-3', bracketId, pointsEarned: 4, game: { id: 'game-3', round: 3 } },
      ];

      const existingScore = {
        id: 'score-1',
        bracketId,
        totalPoints: 0,
      };

      mockPicksRepository.find.mockResolvedValue(picks);
      mockScoresRepository.findOne.mockResolvedValue(existingScore);
      mockScoresRepository.save.mockResolvedValue({
        ...existingScore,
        totalPoints: 7,
      });

      await service.updateBracketScore(bracketId);

      expect(mockScoresRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          bracketId,
          totalPoints: 7, // 1 + 2 + 4
        }),
      );
    });

    it('should create score record if it does not exist', async () => {
      const picks = [
        { id: 'pick-1', bracketId, pointsEarned: 1, game: { id: 'game-1', round: 1 } },
      ];

      mockPicksRepository.find.mockResolvedValue(picks);
      mockScoresRepository.findOne.mockResolvedValue(null);
      mockScoresRepository.create.mockReturnValue({
        bracketId,
        totalPoints: 0,
      });
      mockScoresRepository.save.mockResolvedValue({
        bracketId,
        totalPoints: 1,
      });

      await service.updateBracketScore(bracketId);

      expect(mockScoresRepository.create).toHaveBeenCalledWith({
        bracketId,
        totalPoints: 0,
      });
      expect(mockScoresRepository.save).toHaveBeenCalled();
    });
  });

  describe('recalculateAllScores', () => {
    it('should recalculate scores for all brackets', async () => {
      const brackets = [
        { id: 'bracket-1', picks: [{ id: 'pick-1', pointsEarned: 1, game: { round: 1 } }] },
        { id: 'bracket-2', picks: [{ id: 'pick-2', pointsEarned: 2, game: { round: 2 } }] },
      ];

      mockBracketsRepository.find.mockResolvedValue(brackets);
      mockPicksRepository.find
        .mockResolvedValueOnce(brackets[0].picks)
        .mockResolvedValueOnce(brackets[1].picks);
      mockScoresRepository.findOne.mockResolvedValue(null);
      mockScoresRepository.create.mockImplementation((score) => score);
      mockScoresRepository.save.mockResolvedValue({});

      await service.recalculateAllScores();

      expect(mockBracketsRepository.find).toHaveBeenCalledWith({
        relations: ['picks', 'picks.game'],
      });
      expect(mockPicksRepository.find).toHaveBeenCalledTimes(2);
    });
  });

  describe('recalculateScoresForPool', () => {
    it('should recalculate scores for all brackets in a pool', async () => {
      const poolId = 'pool-1';
      const brackets = [
        { id: 'bracket-1', poolId },
        { id: 'bracket-2', poolId },
      ];

      mockBracketsRepository.find.mockResolvedValue(brackets);
      mockPicksRepository.find
        .mockResolvedValueOnce([{ id: 'pick-1', pointsEarned: 1, game: { round: 1 } }])
        .mockResolvedValueOnce([{ id: 'pick-2', pointsEarned: 2, game: { round: 2 } }]);
      mockScoresRepository.findOne.mockResolvedValue(null);
      mockScoresRepository.create.mockImplementation((score) => score);
      mockScoresRepository.save.mockResolvedValue({});

      await service.recalculateScoresForPool(poolId);

      expect(mockBracketsRepository.find).toHaveBeenCalledWith({
        where: { poolId },
      });
      expect(mockPicksRepository.find).toHaveBeenCalledTimes(2);
    });
  });
});

