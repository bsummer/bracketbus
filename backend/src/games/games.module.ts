import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { Game, TournamentTeam } from '../common/entities';
import { ScoresModule } from '../scores/scores.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game, TournamentTeam]),
    ScoresModule,
  ],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}

