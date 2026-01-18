import { Controller, Get, Post, Put, Delete, Param, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { Admin } from '../common/decorators/admin.decorator';
import { BracketImageService } from './bracket-image.service';

/**
 * Controller for tournament management endpoints.
 * All endpoints require admin authentication.
 * 
 * @route /api/tournaments
 */
@Controller('tournaments')
export class TournamentsController {
  constructor(
    private readonly tournamentsService: TournamentsService,
    private readonly bracketImageService: BracketImageService,
  ) {}

  /**
   * GET /api/tournaments
   * Retrieves all tournaments (public).
   * @returns Array of tournaments sorted by start date
   */
  @Get()
  findAll() {
    return this.tournamentsService.findAll();
  }

  /**
   * POST /api/tournaments
   * Creates a new tournament (admin only).
   * Validation: Name must be unique, startDate must be valid date string.
   * @param createTournamentDto - Tournament creation data
   * @returns Created tournament
   */
  @Post()
  @Admin()
  create(@Body() createTournamentDto: CreateTournamentDto) {
    return this.tournamentsService.create(createTournamentDto);
  }

  /**
   * GET /api/tournaments/:id
   * Retrieves a tournament by ID (public).
   * @param id - Tournament UUID
   * @returns Tournament entity
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tournamentsService.findOne(id);
  }

  /**
   * PUT /api/tournaments/:id
   * Updates a tournament (admin only).
   * @param id - Tournament UUID
   * @param updateTournamentDto - Partial tournament data
   * @returns Updated tournament
   */
  @Put(':id')
  @Admin()
  update(@Param('id') id: string, @Body() updateTournamentDto: UpdateTournamentDto) {
    return this.tournamentsService.update(id, updateTournamentDto);
  }

  /**
   * DELETE /api/tournaments/:id
   * Deletes a tournament (admin only).
   * @param id - Tournament UUID
   * @returns Success message
   */
  @Delete(':id')
  @Admin()
  async remove(@Param('id') id: string) {
    await this.tournamentsService.remove(id);
    return { message: 'Tournament deleted successfully' };
  }

  /**
   * GET /api/tournaments/:id/bracket-image
   * Generates and downloads a bracket image with traditional layout (public).
   * @param id - Tournament UUID
   * @param res - Express response object
   */
  @Get(':id/bracket-image')
  async generateBracketImage(@Param('id') id: string, @Res() res: Response) {
    try {
      const imageBuffer = await this.bracketImageService.generateTournamentBracketImage(id);
      const tournament = await this.tournamentsService.findOne(id);
      const fileName = `${tournament.name.replace(/\s+/g, '_')}_Bracket.png`;

      res.set({
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': imageBuffer.length,
      });

      res.send(imageBuffer);
    } catch (error) {
      console.error('Bracket image generation error:', error);
      res.status(500).json({
        message: 'Failed to generate bracket image',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

