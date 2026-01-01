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

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateGameDto: UpdateGameDto) {
    // TODO: Add admin check
    return this.gamesService.update(id, updateGameDto, true);
  }
}

@Controller('tournaments/:tournamentId/games')
export class TournamentGamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  @Admin()
  findAllByTournament(
    @Param('tournamentId') tournamentId: string,
    @Query('round') round?: string,
  ) {
    const roundNumber = round ? parseInt(round, 10) : undefined;
    return this.gamesService.findAllByTournament(tournamentId, roundNumber);
  }

  @Post()
  @Admin()
  create(
    @Param('tournamentId') tournamentId: string,
    @Body() createDto: CreateTournamentGameDto,
  ) {
    return this.gamesService.createForTournament(tournamentId, createDto);
  }

  @Put(':id')
  @Admin()
  update(
    @Param('tournamentId') tournamentId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateTournamentGameDto,
  ) {
    return this.gamesService.updateForTournament(tournamentId, id, updateDto);
  }

  @Delete(':id')
  @Admin()
  async remove(@Param('tournamentId') tournamentId: string, @Param('id') id: string) {
    await this.gamesService.removeFromTournament(tournamentId, id);
    return { message: 'Game deleted successfully' };
  }
}

