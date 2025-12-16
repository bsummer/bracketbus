import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tournament } from './tournament.entity';
import { User } from './user.entity';
import { PoolMember } from './pool-member.entity';
import { Bracket } from './bracket.entity';

@Entity('pools')
export class Pool extends BaseEntity {
  @Column()
  name: string;

  @ManyToOne(() => Tournament)
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @Column({ name: 'tournament_id' })
  tournamentId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column({ name: 'creator_id' })
  creatorId: string;

  @Column({ unique: true, name: 'invite_code', length: 8 })
  inviteCode: string;

  @OneToMany(() => PoolMember, (member) => member.pool)
  members: PoolMember[];

  @OneToMany(() => Bracket, (bracket) => bracket.pool)
  brackets: Bracket[];
}

