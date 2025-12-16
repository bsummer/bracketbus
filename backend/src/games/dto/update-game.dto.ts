import { IsOptional, IsEnum, IsString, IsNumber } from 'class-validator';
import { GameStatus } from '../../common/entities/game.entity';

export class UpdateGameDto {
  @IsOptional()
  @IsString()
  winnerId?: string;

  @IsOptional()
  @IsNumber()
  scoreTeam1?: number;

  @IsOptional()
  @IsNumber()
  scoreTeam2?: number;

  @IsOptional()
  @IsEnum(GameStatus)
  status?: GameStatus;
}

