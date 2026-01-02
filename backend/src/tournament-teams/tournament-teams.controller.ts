import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { TournamentTeamsService } from './tournament-teams.service';
import { CreateTournamentTeamDto } from './dto/create-tournament-team.dto';
import { UpdateTournamentTeamDto } from './dto/update-tournament-team.dto';
import { Admin } from '../common/decorators/admin.decorator';

/**
 * Controller for tournament team management endpoints.
 * All endpoints require admin authentication.
 * 
 * @route /api/tournaments/:tournamentId/teams
 */
@Controller('tournaments/:tournamentId/teams')
export class TournamentTeamsController {
  constructor(private readonly tournamentTeamsService: TournamentTeamsService) {}

  /**
   * GET /api/tournaments/:tournamentId/teams
   * Retrieves all teams for a tournament (admin only).
   * @param tournamentId - Tournament UUID
   * @returns Array of tournament teams sorted by region and seed
   */
  @Get()
  @Admin()
  findAllByTournament(@Param('tournamentId') tournamentId: string) {
    return this.tournamentTeamsService.findAllByTournament(tournamentId);
  }

  /**
   * POST /api/tournaments/:tournamentId/teams
   * Adds a team to a tournament (admin only).
   * Validation: Team must not already be in tournament, region+seed must be unique.
   * @param tournamentId - Tournament UUID
   * @param createTournamentTeamDto - Team assignment data
   * @returns Created tournament team
   */
  @Post()
  @Admin()
  create(
    @Param('tournamentId') tournamentId: string,
    @Body() createTournamentTeamDto: CreateTournamentTeamDto,
  ) {
    return this.tournamentTeamsService.create(tournamentId, createTournamentTeamDto);
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

