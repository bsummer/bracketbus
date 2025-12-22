import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pool, PoolMember, PoolMemberStatus, User, Tournament } from '../common/entities';
import { CreatePoolDto } from './dto/create-pool.dto';
import { JoinPoolDto } from './dto/join-pool.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { ScoresService } from '../scores/scores.service';
import { Score } from '../common/entities';


@Injectable()
export class PoolsService {
  constructor(
    @InjectRepository(Pool)
    private poolsRepository: Repository<Pool>,
    @InjectRepository(PoolMember)
    private poolMembersRepository: Repository<PoolMember>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Tournament)
    private tournamentsRepository: Repository<Tournament>,
    @InjectRepository(Score)
    private scoresRepository: Repository<Score>,
    private scoresService: ScoresService,
  ) {}

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async create(createPoolDto: CreatePoolDto, userId: string): Promise<Pool> {
    const tournament = await this.tournamentsRepository.findOne({
      where: { id: createPoolDto.tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    let inviteCode = this.generateInviteCode();
    // Ensure unique invite code
    while (await this.poolsRepository.findOne({ where: { inviteCode } })) {
      inviteCode = this.generateInviteCode();
    }

    const pool = this.poolsRepository.create({
      name: createPoolDto.name,
      tournamentId: createPoolDto.tournamentId,
      creatorId: userId,
      inviteCode,
    });

    const savedPool = await this.poolsRepository.save(pool);

    // Add creator as member
    await this.poolMembersRepository.save({
      poolId: savedPool.id,
      userId,
      status: PoolMemberStatus.ACTIVE,
    });

    return this.findOne(savedPool.id);
  }

  async findAll(userId: string): Promise<Pool[]> {
    return this.poolsRepository.find({
      where: {
        members: {
          userId,
          status: PoolMemberStatus.ACTIVE,
        },
      },
      relations: ['tournament', 'creator', 'members', 'members.user'],
    });
  }

  async findOne(id: string): Promise<Pool> {
    const pool = await this.poolsRepository.findOne({
      where: { id },
      relations: ['tournament', 'creator', 'members', 'members.user', 'brackets', 'brackets.user'],
    });

    if (!pool) {
      throw new NotFoundException('Pool not found');
    }

    return pool;
  }

  async findOneByName(name: string): Promise<Pool> {
    const pool = await this.poolsRepository.findOne({
      where: { name },
    });

    if (!pool) {
      throw new NotFoundException('Pool not found');
    }

    return this.findOne(pool.id);
  }

  async findOnePublic(id: string): Promise<Pool> {
    return this.findOne(id);
  }

  async join(joinPoolDto: JoinPoolDto, userId: string): Promise<Pool> {
    const pool = await this.poolsRepository.findOne({
      where: { inviteCode: joinPoolDto.inviteCode },
    });

    if (!pool) {
      throw new NotFoundException('Invalid invite code');
    }

    // Check if already a member
    const existingMember = await this.poolMembersRepository.findOne({
      where: { poolId: pool.id, userId },
    });

    if (existingMember) {
      if (existingMember.status === PoolMemberStatus.ACTIVE) {
        throw new ConflictException('Already a member of this pool');
      } else {
        // Reactivate
        existingMember.status = PoolMemberStatus.ACTIVE;
        existingMember.leftAt = null;
        await this.poolMembersRepository.save(existingMember);
        return this.findOne(pool.id);
      }
    }

    // Add as new member
    await this.poolMembersRepository.save({
      poolId: pool.id,
      userId,
      status: PoolMemberStatus.ACTIVE,
    });

    return this.findOne(pool.id);
  }

  async addMember(poolId: string, addMemberDto: AddMemberDto, userId: string): Promise<Pool> {
    const pool = await this.findOne(poolId);

    // Check if user is creator or admin
    if (pool.creatorId !== userId) {
      throw new ForbiddenException('Only pool creator can add members');
    }

    const user = await this.usersRepository.findOne({
      where: { id: addMemberDto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already a member
    const existingMember = await this.poolMembersRepository.findOne({
      where: { poolId, userId: addMemberDto.userId },
    });

    if (existingMember && existingMember.status === PoolMemberStatus.ACTIVE) {
      throw new ConflictException('User is already a member');
    }

    if (existingMember) {
      existingMember.status = PoolMemberStatus.ACTIVE;
      existingMember.leftAt = null;
      await this.poolMembersRepository.save(existingMember);
    } else {
      await this.poolMembersRepository.save({
        poolId,
        userId: addMemberDto.userId,
        status: PoolMemberStatus.ACTIVE,
      });
    }

    return this.findOne(poolId);
  }

  async removeMember(poolId: string, memberUserId: string, userId: string): Promise<void> {
    const pool = await this.findOne(poolId);

    // Check if user is creator or admin, or removing themselves
    if (pool.creatorId !== userId && memberUserId !== userId) {
      throw new ForbiddenException('Only pool creator can remove members');
    }

    const member = await this.poolMembersRepository.findOne({
      where: { poolId, userId: memberUserId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    member.status = PoolMemberStatus.LEFT;
    member.leftAt = new Date();
    await this.poolMembersRepository.save(member);
  }

  async getLeaderboard(poolId: string) {
    const pool = await this.findOne(poolId);
    // TODO: Calculate scores and return leaderboard
    return pool.brackets || [];
  }

  async getMembers(poolId: string) {
    const pool = await this.findOne(poolId);
    const brackets = pool.brackets || [];

    // Get scores for all brackets
    const bracketIds = brackets.map((b) => b.id);
    const scores = await this.scoresRepository.find({
      where: { bracketId: bracketIds.length > 0 ? bracketIds : [] },
    });

    // Combine brackets with their scores and sort by total points
    const leaderboard = brackets.map((bracket) => {
      const score = scores.find((s) => s.bracketId === bracket.id);
      return {
        ...bracket,
        totalPoints: score?.totalPoints || 0,
      };
    });

    // Sort by total points (descending)
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    return leaderboard;
  }
}

