import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamesService } from './games.service';
import { GamesController, TournamentGamesController } from './games.controller';
import { Game, TournamentTeam, Tournament, Team, User } from '../common/entities';
import { ScoresModule } from '../scores/scores.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game, TournamentTeam, Tournament, Team, User]),
    ScoresModule,
    CommonModule,
  ],
  controllers: [GamesController, TournamentGamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}

