import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Pool } from './pool.entity';
import { User } from './user.entity';

export enum PoolMemberStatus {
  ACTIVE = 'active',
  LEFT = 'left',
}

@Entity('pool_members')
@Unique(['poolId', 'userId'])
export class PoolMember extends BaseEntity {
  @ManyToOne(() => Pool)
  @JoinColumn({ name: 'pool_id' })
  pool: Pool;

  @Column({ name: 'pool_id' })
  poolId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'timestamp', name: 'joined_at', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;

  @Column({
    type: 'enum',
    enum: PoolMemberStatus,
    default: PoolMemberStatus.ACTIVE,
  })
  status: PoolMemberStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'left_at' })
  leftAt: Date | null;
}

