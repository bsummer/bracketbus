import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('teams')
export class Team extends BaseEntity {
  @Column()
  name: string;

  @Column()
  seed: number;

  @Column()
  region: string;

  @Column({ nullable: true, name: 'logo_url' })
  logoUrl: string;
}

