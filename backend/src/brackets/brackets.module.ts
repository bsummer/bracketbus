import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BracketsService } from './brackets.service';
import { BracketsController } from './brackets.controller';
import { Bracket, Pick, Pool, PoolMember, PoolMemberStatus, Game, Tournament, TournamentTeam } from '../common/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Bracket, Pick, Pool, PoolMember, Game, Tournament, TournamentTeam])],
  controllers: [BracketsController],
  providers: [BracketsService],
  exports: [BracketsService],
})
export class BracketsModule {}

