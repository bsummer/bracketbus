import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScoresService } from './scores.service';
import { Pick, Score, Bracket } from '../common/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Pick, Score, Bracket])],
  providers: [ScoresService],
  exports: [ScoresService],
})
export class ScoresModule {}