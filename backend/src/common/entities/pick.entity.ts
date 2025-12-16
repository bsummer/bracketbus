import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Bracket } from './bracket.entity';
import { Game } from './game.entity';
import { Team } from './team.entity';

@Entity('picks')
@Unique(['bracketId', 'gameId'])
export class Pick extends BaseEntity {
  @ManyToOne(() => Bracket, (bracket) => bracket.picks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bracket_id' })
  bracket: Bracket;

  @Column({ name: 'bracket_id' })
  bracketId: string;

  @ManyToOne(() => Game)
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @Column({ name: 'game_id' })
  gameId: string;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'predicted_winner_id' })
  predictedWinner: Team;

  @Column({ name: 'predicted_winner_id' })
  predictedWinnerId: string;

  @Column({ default: 0, name: 'points_earned' })
  pointsEarned: number;
}

