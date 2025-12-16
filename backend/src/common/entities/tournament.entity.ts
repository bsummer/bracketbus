import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Pool } from './pool.entity';
import { Game } from './game.entity';

@Entity('tournaments')
export class Tournament extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @OneToMany(() => Pool, (pool) => pool.tournament)
  pools: Pool[];

  @OneToMany(() => Game, (game) => game.tournament)
  games: Game[];
}

