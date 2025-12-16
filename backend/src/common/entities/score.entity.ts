import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Bracket } from './bracket.entity';

@Entity('scores')
export class Score extends BaseEntity {
  @OneToOne(() => Bracket)
  @JoinColumn({ name: 'bracket_id' })
  bracket: Bracket;

  @Column({ name: 'bracket_id', unique: true })
  bracketId: string;

  @Column({ default: 0, name: 'total_points' })
  totalPoints: number;

  @Column({ type: 'timestamp', name: 'last_updated', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdated: Date;
}

