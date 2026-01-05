import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScoresService } from './scores.service';
import { Pick, Bracket } from '../common/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Pick, Bracket])],
  providers: [ScoresService],
  exports: [ScoresService],
})
export class ScoresModule {}