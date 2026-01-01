import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { Admin } from '../common/decorators/admin.decorator';

@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get()
  @Admin()
  findAll() {
    return this.tournamentsService.findAll();
  }

  @Post()
  @Admin()
  create(@Body() createTournamentDto: CreateTournamentDto) {
    return this.tournamentsService.create(createTournamentDto);
  }

  @Get(':id')
  @Admin()
  findOne(@Param('id') id: string) {
    return this.tournamentsService.findOne(id);
  }

  @Put(':id')
  @Admin()
  update(@Param('id') id: string, @Body() updateTournamentDto: UpdateTournamentDto) {
    return this.tournamentsService.update(id, updateTournamentDto);
  }

  @Delete(':id')
  @Admin()
  async remove(@Param('id') id: string) {
    await this.tournamentsService.remove(id);
    return { message: 'Tournament deleted successfully' };
  }
}

