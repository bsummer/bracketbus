import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Delete,
} from '@nestjs/common';
import { PoolsService } from './pools.service';
import { CreatePoolDto } from './dto/create-pool.dto';
import { JoinPoolDto } from './dto/join-pool.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('pools')
export class PoolsController {
  constructor(private readonly poolsService: PoolsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createPoolDto: CreatePoolDto, @Request() req) {
    return this.poolsService.create(createPoolDto, req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req) {
    return this.poolsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.poolsService.findOnePublic(id);
  }

  @Get('by-name/:name')
  findOneByName(@Param('name') name: string) {
    return this.poolsService.findOneByName(name);
  }

  @Get(':id/public')
  findOnePublic(@Param('id') id: string) {
    return this.poolsService.findOnePublic(id);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  join(@Param('id') id: string, @Body() joinPoolDto: JoinPoolDto, @Request() req) {
    return this.poolsService.join(joinPoolDto, req.user.userId);
  }

  @Get(':id/leaderboard')
  getLeaderboard(@Param('id') id: string) {
    return this.poolsService.getLeaderboard(id);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string) {
    return this.poolsService.getMembers(id);
  }

  @Post(':id/members')
  @UseGuards(JwtAuthGuard)
  addMember(@Param('id') id: string, @Body() addMemberDto: AddMemberDto, @Request() req) {
    return this.poolsService.addMember(id, addMemberDto, req.user.userId);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(JwtAuthGuard)
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req) {
    return this.poolsService.removeMember(id, memberId, req.user.userId);
  }
}

