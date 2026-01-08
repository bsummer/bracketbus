import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { GamesService } from './games.service';
import { UpdateGameDto } from './dto/update-game.dto';
import { CreateTournamentGameDto } from './dto/create-tournament-game.dto';
import { UpdateTournamentGameDto } from './dto/update-tournament-game.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Admin } from '../common/decorators/admin.decorator';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  findAll() {
    return this.gamesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gamesService.findOne(id);
  }

  /**
   * PUT /api/games/:id
   * Updates a game (admin only - uses JwtAuthGuard).
   * @param id - Game UUID
   * @param updateGameDto - Partial game data
   * @returns Updated game
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateGameDto: UpdateGameDto) {
    return this.gamesService.update(id, updateGameDto, true);
  }
}

/**
 * Controller for tournament game management endpoints.
 * All endpoints require admin authentication.
 * 
 * @route /api/tournaments/:tournamentId/games
 */
@Controller('tournaments/:tournamentId/games')
export class TournamentGamesController {
  constructor(private readonly gamesService: GamesService) {}

  /**
   * GET /api/tournaments/:tournamentId/games
   * Retrieves all games for a tournament, optionally filtered by round (public).
   * @param tournamentId - Tournament UUID
   * @param round - Optional round number query parameter
   * @returns Array of games with team data
   */
  @Get()
  findAllByTournament(
    @Param('tournamentId') tournamentId: string,
    @Query('round') round?: string,
  ) {
    const roundNumber = round ? parseInt(round, 10) : undefined;
    return this.gamesService.findAllByTournament(tournamentId, roundNumber);
  }

  /**
   * POST /api/tournaments/:tournamentId/games
   * Creates a new game for a tournament (admin only).
   * Round 1 requires: region, team1Id, team2Id
   * Round 2+ requires: parentGame1Id, parentGame2Id
   * @param tournamentId - Tournament UUID
   * @param createDto - Game creation data
   * @returns Created game
   */
  @Post()
  @Admin()
  create(
    @Param('tournamentId') tournamentId: string,
    @Body() createDto: CreateTournamentGameDto,
  ) {
    return this.gamesService.createForTournament(tournamentId, createDto);
  }

  /**
   * PUT /api/tournaments/:tournamentId/games/:id
   * Updates a game in a tournament (admin only).
   * @param tournamentId - Tournament UUID
   * @param id - Game UUID
   * @param updateDto - Partial game data
   * @returns Updated game
   */
  @Put(':id')
  @Admin()
  update(
    @Param('tournamentId') tournamentId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateTournamentGameDto,
  ) {
    return this.gamesService.updateForTournament(tournamentId, id, updateDto);
  }

  /**
   * DELETE /api/tournaments/:tournamentId/games/:id
   * Deletes a game from a tournament (admin only).
   * @param tournamentId - Tournament UUID
   * @param id - Game UUID
   * @returns Success message
   */
  @Delete(':id')
  @Admin()
  async remove(@Param('tournamentId') tournamentId: string, @Param('id') id: string) {
    await this.gamesService.removeFromTournament(tournamentId, id);
    return { message: 'Game deleted successfully' };
  }
}

