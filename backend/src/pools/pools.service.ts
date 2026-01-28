import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pool, PoolMember, PoolMemberStatus, User, Tournament, Bracket } from '../common/entities';
import { CreatePoolDto } from './dto/create-pool.dto';
import { JoinPoolDto } from './dto/join-pool.dto';
import { AddMemberDto } from './dto/add-member.dto';


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
    // Use query builder to filter pools by user membership, but load all active members
    const queryBuilder = this.poolsRepository.createQueryBuilder('pool')
    .leftJoinAndSelect('pool.tournament', 'tournament')
    .leftJoinAndSelect('pool.creator', 'creator')
    .leftJoin('pool.members', 'userMember')
    .leftJoinAndSelect('pool.members', 'allMembers')
    .leftJoinAndSelect('allMembers.user', 'user')
    .where('userMember.userId = :userId', { userId })
    .andWhere('userMember.status = :status', { status: PoolMemberStatus.ACTIVE });

    const pools = await queryBuilder.getMany();

    // Filter members to only active ones for each pool
    return pools.map((pool) => ({
      ...pool,
      members: pool.members?.filter((member) => member.status === PoolMemberStatus.ACTIVE) || [],
    }));
  }

  async findAllForAdmin(): Promise<Pool[]> {
    return this.poolsRepository.find({
      relations: ['tournament', 'creator'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Pool> {
    const pool = await this.poolsRepository.findOne({
      where: { id },
      relations: ['tournament', 'creator', 'members', 'members.user', 'brackets', 'brackets.user', 'brackets.winner'],
    });

    if (!pool) {
      throw new NotFoundException('Pool not found');
    }

    return pool;
  }

  async findOneByCode(inviteCode: string): Promise<Pool> {
    const pool = await this.poolsRepository.findOne({
      where: { inviteCode }
    });

    if (!pool) {
      throw new NotFoundException('Pool not found');
    }

    return this.findOne(pool.id);
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
    const brackets = pool.brackets || [];
    const activeMembers = (pool.members || []).filter(
      (member) => member.status === PoolMemberStatus.ACTIVE
    );

    // Create a map of userId to bracket for quick lookup
    const bracketMap = new Map<string, Bracket>();
    brackets.forEach((bracket) => {
      bracketMap.set(bracket.userId, bracket);
    });

    // Build leaderboard entries for all active members
    const leaderboard = activeMembers.map((member) => {
      const bracket = bracketMap.get(member.userId);
      
      if (bracket) {
        // Member has a bracket
        return {
          ...bracket,
          totalPoints: bracket.pointsEarned || 0,
          hasBracket: true,
          rank: 0, // Will be calculated after sorting
        };
      } else {
        // Member doesn't have a bracket yet
        return {
          id: null,
          name: null,
          userId: member.userId,
          poolId: pool.id,
          user: member.user,
          totalPoints: 0,
          pointsEarned: 0,
          winnerId: null,
          winner: null,
          hasBracket: false,
          rank: 0, // Will be calculated after sorting
        };
      }
    });

    // Sort by hasBracket first (members with brackets come first), then by total points (descending), then by username for ties
    leaderboard.sort((a, b) => {
      // Members with brackets rank above members without brackets
      if (a.hasBracket !== b.hasBracket) {
        return b.hasBracket ? 1 : -1;
      }
      
      // Within same bracket status, sort by points
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      
      // For same points, sort by username
      const usernameA = a.user?.username || '';
      const usernameB = b.user?.username || '';
      return usernameA.localeCompare(usernameB);
    });

    // Calculate ranks
    // Rank is based on points, with ties getting the same rank
    // Members with brackets (even 0 points) rank above members without brackets
    let currentRank = 1;
    let previousPoints: number | null = null;
    let previousHasBracket: boolean | null = null;

    leaderboard.forEach((entry, index) => {
      // If this is the first entry, or points/hasBracket status changed, update rank
      if (index === 0) {
        entry.rank = currentRank;
        previousPoints = entry.totalPoints;
        previousHasBracket = entry.hasBracket;
      } else {
        // Check if rank should change
        // Rank changes if:
        // 1. Points changed, OR
        // 2. hasBracket status changed (members with brackets vs without)
        if (
          entry.totalPoints !== previousPoints ||
          entry.hasBracket !== previousHasBracket
        ) {
          // Rank is the position in the array (1-indexed)
          currentRank = index + 1;
        }
        entry.rank = currentRank;
        previousPoints = entry.totalPoints;
        previousHasBracket = entry.hasBracket;
      }
    });

    return leaderboard;
  }

  async getMembers(poolId: string) {
    const pool = await this.findOne(poolId);
    const brackets = pool.brackets || [];

    return this.leaderboard(brackets);
  }

  async leaderboard(brackets: Bracket[]) {
    // Combine brackets with their scores and sort by total points
    const leaderboard = brackets.map((bracket) => {
      const score = bracket.pointsEarned || 0; // scores.find((s) => s.bracketId === bracket.id);
      return {
        ...bracket,
        totalPoints: score,
      };
    });
  
    // Sort by total points (descending)
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
  
    return leaderboard;
  }
}


