import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoolsService } from './pools.service';
import { PoolsController } from './pools.controller';
import { Pool, PoolMember, User, Tournament, Score } from '../common/entities';
import { ScoresModule } from '../scores/scores.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pool, PoolMember, User, Tournament, Score]),
    ScoresModule,
  ],
  controllers: [PoolsController],
  providers: [PoolsService],
  exports: [PoolsService],
})
export class PoolsModule {}

