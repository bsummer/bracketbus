import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { TournamentTeamsService } from './tournament-teams.service';
import { CreateTournamentTeamDto } from './dto/create-tournament-team.dto';
import { UpdateTournamentTeamDto } from './dto/update-tournament-team.dto';
import { Admin } from '../common/decorators/admin.decorator';

@Controller('tournaments/:tournamentId/teams')
export class TournamentTeamsController {
  constructor(private readonly tournamentTeamsService: TournamentTeamsService) {}

  @Get()
  @Admin()
  findAllByTournament(@Param('tournamentId') tournamentId: string) {
    return this.tournamentTeamsService.findAllByTournament(tournamentId);
  }

  @Post()
  @Admin()
  create(
    @Param('tournamentId') tournamentId: string,
    @Body() createTournamentTeamDto: CreateTournamentTeamDto,
  ) {
    // Ensure tournamentId from URL matches the DTO
    return this.tournamentTeamsService.create({
      ...createTournamentTeamDto,
      tournamentId,
    });
  }

  @Put(':id')
  @Admin()
  update(
    @Param('tournamentId') tournamentId: string,
    @Param('id') id: string,
    @Body() updateTournamentTeamDto: UpdateTournamentTeamDto,
  ) {
    return this.tournamentTeamsService.update(id, updateTournamentTeamDto);
  }

  @Delete(':id')
  @Admin()
  async remove(@Param('tournamentId') tournamentId: string, @Param('id') id: string) {
    await this.tournamentTeamsService.remove(id);
    return { message: 'Tournament team removed successfully' };
  }
}

