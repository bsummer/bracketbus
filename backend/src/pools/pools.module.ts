import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoolsService } from './pools.service';
import { PoolsController } from './pools.controller';
import { Pool, PoolMember, User, Tournament } from '../common/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Pool, PoolMember, User, Tournament])],
  controllers: [PoolsController],
  providers: [PoolsService],
  exports: [PoolsService],
})
export class PoolsModule {}

