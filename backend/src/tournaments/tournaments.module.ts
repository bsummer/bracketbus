import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { BracketImageService } from './bracket-image.service';
import { Tournament } from '../common/entities/tournament.entity';
import { User } from '../common/entities/user.entity';
import { CommonModule } from '../common/common.module';
import { GamesModule } from '../games/games.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tournament, User]),
    CommonModule,
    GamesModule,
  ],
  controllers: [TournamentsController],
  providers: [TournamentsService, BracketImageService],
  exports: [TournamentsService],
})
export class TournamentsModule {}

