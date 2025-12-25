import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tournament } from './tournament.entity';
import { Team } from './team.entity';

@Entity('tournament_teams')
@Unique(['tournamentId', 'teamId'])
export class TournamentTeam extends BaseEntity {
  @ManyToOne(() => Tournament)
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @Column({ name: 'tournament_id' })
  tournamentId: string;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ name: 'team_id' })
  teamId: string;

  @Column()
  seed: number;

  @Column()
  region: string;
}

