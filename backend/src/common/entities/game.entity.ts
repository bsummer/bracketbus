import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tournament } from './tournament.entity';
import { Team } from './team.entity';
import { Pick } from './pick.entity';

export enum GameStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Entity('games')
export class Game extends BaseEntity {
  @Column()
  round: number;

  @ManyToOne(() => Tournament)
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @Column({ name: 'tournament_id' })
  tournamentId: string;

  @Column({ name: 'game_number' })
  gameNumber: number;

  @Column({ nullable: true, name: 'parent_game1_id' })
  parentGame1Id: string | null;

  @Column({ nullable: true, name: 'parent_game2_id' })
  parentGame2Id: string | null;

  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'team1_id' })
  team1: Team | null;

  @Column({ nullable: true, name: 'team1_id' })
  team1Id: string | null;

  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'team2_id' })
  team2: Team | null;

  @Column({ nullable: true, name: 'team2_id' })
  team2Id: string | null;

  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'winner_id' })
  winner: Team | null;

  @Column({ nullable: true, name: 'winner_id' })
  winnerId: string | null;

  @Column({ nullable: true, name: 'score_team1' })
  scoreTeam1: number | null;

  @Column({ nullable: true, name: 'score_team2' })
  scoreTeam2: number | null;

  @Column({ type: 'timestamp', nullable: true, name: 'game_date' })
  gameDate: Date | null;

  @Column({
    type: 'enum',
    enum: GameStatus,
    default: GameStatus.SCHEDULED,
  })
  status: GameStatus;

  @OneToMany(() => Pick, (pick) => pick.game)
  picks: Pick[];
}

