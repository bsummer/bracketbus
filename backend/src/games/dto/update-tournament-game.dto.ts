import { IsOptional, IsNumber, IsString, IsUUID, IsEnum, IsDateString, Min, IsIn } from 'class-validator';
import { GameStatus } from '../../common/entities/game.entity';

export class UpdateTournamentGameDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  gameNumber?: number;

  @IsOptional()
  @IsString()
  @IsIn(['East', 'West', 'South', 'Midwest'])
  region?: string;

  @IsOptional()
  @IsUUID()
  team1Id?: string;

  @IsOptional()
  @IsUUID()
  team2Id?: string;

  @IsOptional()
  @IsUUID()
  parentGame1Id?: string;

  @IsOptional()
  @IsUUID()
  parentGame2Id?: string;

  @IsOptional()
  @IsEnum(GameStatus)
  status?: GameStatus;

  @IsOptional()
  @IsDateString()
  gameDate?: string;

  @IsOptional()
  @IsNumber()
  scoreTeam1?: number;

  @IsOptional()
  @IsNumber()
  scoreTeam2?: number;

  @IsOptional()
  @IsUUID()
  winnerId?: string;
}

