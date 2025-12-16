import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BracketsService } from './brackets.service';
import { CreateBracketDto } from './dto/create-bracket.dto';
import { UpdateBracketDto } from './dto/update-bracket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('brackets')
@UseGuards(JwtAuthGuard)
export class BracketsController {
  constructor(private readonly bracketsService: BracketsService) {}

  @Post()
  create(@Body() createBracketDto: CreateBracketDto, @Request() req) {
    return this.bracketsService.create(createBracketDto, req.user.userId);
  }

  @Get()
  findAll(@Request() req) {
    return this.bracketsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bracketsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateBracketDto: UpdateBracketDto, @Request() req) {
    return this.bracketsService.update(id, updateBracketDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.bracketsService.remove(id, req.user.userId);
  }
}

