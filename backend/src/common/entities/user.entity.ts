import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  username: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;
}

