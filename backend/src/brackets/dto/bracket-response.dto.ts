import { Bracket, User } from '../../common/entities';

export class BracketResponseDto {
  id: string;
  name: string;
  userId: string;
  poolId: string;
  lockedAt: Date | null;
  isLocked: boolean;
  created_at: Date;
  updated_at: Date;
  user: User;
  pool: any;
  picks: any[];

  static fromEntity(bracket: Bracket, isLocked: boolean): BracketResponseDto {
    return {
      id: bracket.id,
      name: bracket.name,
      userId: bracket.userId,
      poolId: bracket.poolId,
      lockedAt: bracket.lockedAt,
      isLocked: isLocked,
      created_at: bracket.created_at,
      updated_at: bracket.updated_at,
      user: bracket.user,
      pool: bracket.pool,
      picks: bracket.picks,
    };
  }
}