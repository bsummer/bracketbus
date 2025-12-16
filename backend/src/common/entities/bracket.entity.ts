import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Pool } from './pool.entity';
import { Pick } from './pick.entity';

@Entity('brackets')
@Unique(['userId', 'poolId'])
export class Bracket extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  name: string;

  @ManyToOne(() => Pool)
  @JoinColumn({ name: 'pool_id' })
  pool: Pool;

  @Column({ name: 'pool_id' })
  poolId: string;

  @Column({ type: 'timestamp', nullable: true, name: 'locked_at' })
  lockedAt: Date | null;

  @OneToMany(() => Pick, (pick) => pick.bracket, { cascade: true })
  picks: Pick[];
}

