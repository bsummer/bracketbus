/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScoresService } from './scores.service';
import { Pick, Bracket } from '../common/entities';

describe('ScoresService', () => {
  let service: ScoresService;

  const mockPicksRepository = {
    find: jest.fn(),
    save: jest.fn(),
    manager: {
      getRepository: jest.fn(),
    },
  };

  const mockBracketsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
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

      const bracket1 = { id: bracketId, picks: [{ id: 'pick-1', pointsEarned: 2, game: { round: 2 } }] };
      const bracket2 = { id: 'bracket-2', picks: [{ id: 'pick-2', pointsEarned: 0, game: { round: 2 } }] };

      mockGameRepository.findOne.mockResolvedValue(game);
      mockPicksRepository.find.mockResolvedValue(picks);
      mockPicksRepository.save
        .mockResolvedValueOnce({ ...picks[0], pointsEarned: 2 })
        .mockResolvedValueOnce({ ...picks[1], pointsEarned: 0 });
      // Mock updateBracketScore calls (called for each pick)
      mockBracketsRepository.findOne
        .mockResolvedValueOnce(bracket1)
        .mockResolvedValueOnce(bracket2);
      mockBracketsRepository.save
        .mockResolvedValueOnce(bracket1)
        .mockResolvedValueOnce(bracket2);

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
      // updateBracketScore should be called for each bracket
      expect(mockBracketsRepository.findOne).toHaveBeenCalledTimes(2);
      expect(mockBracketsRepository.save).toHaveBeenCalledTimes(2);
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

      const bracket = {
        id: bracketId,
        picks,
        pointsEarned: 0,
      };

      mockBracketsRepository.findOne.mockResolvedValue(bracket);
      mockBracketsRepository.save.mockResolvedValue({
        ...bracket,
        pointsEarned: 7, // 1 + 2 + 4
      });

      await service.updateBracketScore(bracketId);

      expect(mockBracketsRepository.findOne).toHaveBeenCalledWith({
        where: { id: bracketId },
        relations: ['picks', 'picks.game'],
      });
      expect(mockBracketsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: bracketId,
          pointsEarned: 7, // 1 + 2 + 4
        }),
      );
    });
  });

  describe('recalculateAllScores', () => {
    it('should recalculate scores for all brackets', async () => {
      const brackets = [
        { id: 'bracket-1', picks: [{ id: 'pick-1', pointsEarned: 1, game: { round: 1 } }], pointsEarned: 0 },
        { id: 'bracket-2', picks: [{ id: 'pick-2', pointsEarned: 2, game: { round: 2 } }], pointsEarned: 0 },
      ];

      mockBracketsRepository.find.mockResolvedValue(brackets);
      mockBracketsRepository.save
        .mockResolvedValueOnce({ ...brackets[0], pointsEarned: 1 })
        .mockResolvedValueOnce({ ...brackets[1], pointsEarned: 2 });

      await service.recalculateAllScores();

      expect(mockBracketsRepository.find).toHaveBeenCalledWith({
        relations: ['picks', 'picks.game'],
      });
      expect(mockBracketsRepository.save).toHaveBeenCalledTimes(2);
      expect(mockBracketsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'bracket-1', pointsEarned: 1 }),
      );
      expect(mockBracketsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'bracket-2', pointsEarned: 2 }),
      );
    });
  });

  describe('recalculateScoresForPool', () => {
    it('should recalculate scores for all brackets in a pool', async () => {
      const poolId = 'pool-1';
      const brackets = [
        { id: 'bracket-1', poolId },
        { id: 'bracket-2', poolId },
      ];

      const bracket1WithPicks = {
        id: 'bracket-1',
        poolId,
        picks: [{ id: 'pick-1', pointsEarned: 1, game: { round: 1 } }],
        pointsEarned: 0,
      };
      const bracket2WithPicks = {
        id: 'bracket-2',
        poolId,
        picks: [{ id: 'pick-2', pointsEarned: 2, game: { round: 2 } }],
        pointsEarned: 0,
      };

      mockBracketsRepository.find.mockResolvedValue(brackets);
      // updateBracketScore calls findOne and save for each bracket
      mockBracketsRepository.findOne
        .mockResolvedValueOnce(bracket1WithPicks)
        .mockResolvedValueOnce(bracket2WithPicks);
      mockBracketsRepository.save
        .mockResolvedValueOnce({ ...bracket1WithPicks, pointsEarned: 1 })
        .mockResolvedValueOnce({ ...bracket2WithPicks, pointsEarned: 2 });

      await service.recalculateScoresForPool(poolId);

      expect(mockBracketsRepository.find).toHaveBeenCalledWith({
        where: { poolId },
      });
      expect(mockBracketsRepository.findOne).toHaveBeenCalledTimes(2);
      expect(mockBracketsRepository.save).toHaveBeenCalledTimes(2);
    });
  });
});

