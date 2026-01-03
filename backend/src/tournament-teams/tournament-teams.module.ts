import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentTeamsController } from './tournament-teams.controller';
import { TournamentTeamsService } from './tournament-teams.service';
import { TournamentTeam, Tournament, Team, User } from '../common/entities';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TournamentTeam, Tournament, Team, User]),
    CommonModule,
  ],
  controllers: [TournamentTeamsController],
  providers: [TournamentTeamsService],
  exports: [TournamentTeamsService],
})
export class TournamentTeamsModule {}

