import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pick, Score, Game, Bracket } from '../common/entities';

@Injectable()
export class ScoresService {
  constructor(
    @InjectRepository(Pick)
    private picksRepository: Repository<Pick>,
    @InjectRepository(Score)
    private scoresRepository: Repository<Score>,
    @InjectRepository(Bracket)
    private bracketsRepository: Repository<Bracket>,
  ) {}

  /**
   * Calculate points for a pick based on the round
   * Standard scoring: points = 2^(round - 1)
   * Round 1 = 1 point, Round 2 = 2 points, Round 3 = 4 points, etc.
   */
  private calculatePointsForRound(round: number): number {
    return Math.pow(2, round - 1);
  }

  /**
   * Calculate and update scores for all picks related to a game
   * Called when a game's winner is updated
   */
  async calculateScoresForGame(gameId: string): Promise<void> {
    const game = await this.picksRepository.manager
      .getRepository(Game)
      .findOne({
        where: { id: gameId },
        relations: ['winner'],
      });

    if (!game || !game.winnerId) {
      return; // Game doesn't exist or has no winner yet
    }
    
    // Get all picks for this game
    const picks = await this.picksRepository.find({
      where: { gameId },
      relations: ['bracket', 'game'],
    });

    // Update points for each pick
    for (const pick of picks) {
      const isCorrect = pick.predictedWinnerId === game.winnerId;
      const points = isCorrect ? this.calculatePointsForRound(pick.game.round) : 0;

      pick.pointsEarned = points;
      await this.picksRepository.save(pick);

      // Update bracket total score
      await this.updateBracketScore(pick.bracketId);
    }
  }

  /**
   * Recalculate total score for a bracket
   */
  async updateBracketScore(bracketId: string): Promise<void> {
    const picks = await this.picksRepository.find({
      where: { bracketId },
      relations: ['game'],
    });

    const totalPoints = picks.reduce((sum, pick) => sum + pick.pointsEarned, 0);

    // Find or create score record
    let score = await this.scoresRepository.findOne({
      where: { bracketId },
    });

    if (!score) {
      score = this.scoresRepository.create({
        bracketId,
        totalPoints: 0,
      });
    }

    score.totalPoints = totalPoints;
    score.lastUpdated = new Date();
    await this.scoresRepository.save(score);
  }

  /**
   * Recalculate scores for all brackets (useful for manual recalculation)
   */
  async recalculateAllScores(): Promise<void> {
    const brackets = await this.bracketsRepository.find({
      relations: ['picks', 'picks.game'],
    });

    for (const bracket of brackets) {
      await this.updateBracketScore(bracket.id);
    }
  }

  /**
   * Recalculate scores for all brackets in a pool
   */
  async recalculateScoresForPool(poolId: string): Promise<void> {
    const brackets = await this.bracketsRepository.find({
      where: { poolId },
    });

    for (const bracket of brackets) {
      await this.updateBracketScore(bracket.id);
    }
  }
}