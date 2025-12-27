import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Pool, PoolMember, PoolMemberStatus, Bracket } from '../common/entities';
import { CreateUserDto } from './dto/create-user.dto';

export interface UserWithStats {
  id: string;
  username: string;
  email: string;
  poolCount: number;
  bracketCount: number;
  createdAt: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Pool)
    private poolsRepository: Repository<Pool>,
    @InjectRepository(PoolMember)
    private poolMembersRepository: Repository<PoolMember>,
  ) {}

  async findOne(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findAllWithStats(): Promise<UserWithStats[]> {
    const result = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.id', 'id')
      .addSelect('user.username', 'username')
      .addSelect('user.email', 'email')
      .addSelect('user.created_at', 'createdAt')
      .addSelect(
        (subQuery) => {
          return subQuery
            .select('COALESCE(COUNT(poolMember.id), 0)')
            .from(PoolMember, 'poolMember')
            .where('poolMember.user_id = user.id')
            .andWhere('poolMember.status = :activeStatus', { activeStatus: PoolMemberStatus.ACTIVE });
        },
        'poolCount'
      )
      .addSelect(
        (subQuery) => {
          return subQuery
            .select('COALESCE(COUNT(bracket.id), 0)')
            .from(Bracket, 'bracket')
            .where('bracket.user_id = user.id');
        },
        'bracketCount'
      )
      .getRawMany();
  
    // Convert string counts to numbers
    return result.map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      poolCount: parseInt(row.poolCount, 10),
      bracketCount: parseInt(row.bracketCount, 10),
      createdAt: row.createdAt,
    }));
  }
  
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if username already exists
    const existingUserByUsername = await this.findByUsername(createUserDto.username);
    if (existingUserByUsername) {
      throw new ConflictException('Username already exists');
    }

    // Check if email already exists
    const existingUserByEmail = await this.findByEmail(createUserDto.email);
    if (existingUserByEmail) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    // Create user
    const user = this.usersRepository.create({
      username: createUserDto.username,
      email: createUserDto.email,
      passwordHash,
    });

    const savedUser = await this.usersRepository.save(user);

    // Optionally add user to pool
    if (createUserDto.poolId) {
      const pool = await this.poolsRepository.findOne({
        where: { id: createUserDto.poolId },
      });

      if (!pool) {
        throw new NotFoundException('Pool not found');
      }

      // Check if already a member
      const existingMember = await this.poolMembersRepository.findOne({
        where: { poolId: pool.id, userId: savedUser.id },
      });

      if (!existingMember) {
        await this.poolMembersRepository.save({
          poolId: pool.id,
          userId: savedUser.id,
          status: PoolMemberStatus.ACTIVE,
        });
      }
    }

    return savedUser;
  }
}

