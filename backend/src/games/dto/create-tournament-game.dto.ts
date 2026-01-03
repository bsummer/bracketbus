import { IsNumber, IsNotEmpty, Min, Max, IsString, IsOptional, IsIn, IsUUID, ValidateIf } from 'class-validator';
import { GameStatus } from '../../common/entities/game.entity';

export class CreateTournamentGameDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  round: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  gameNumber: number;

  // For Round 1: region is required
  // For Round 2+: region is optional
  @IsString()
  @IsOptional()
  @IsIn(['East', 'West', 'South', 'Midwest'])
  @ValidateIf((o) => o.round === 1)
  @IsNotEmpty()
  region?: string;

  // For Round 1: team1Id and team2Id are required
  @IsUUID()
  @IsOptional()
  @ValidateIf((o) => o.round === 1)
  @IsNotEmpty()
  team1Id?: string;

  @IsUUID()
  @IsOptional()
  @ValidateIf((o) => o.round === 1)
  @IsNotEmpty()
  team2Id?: string;

  // For Round 2+: parentGame1Id and parentGame2Id are required (unless Round 2 uses region+seed)
  @IsUUID()
  @IsOptional()
  @ValidateIf((o) => o.round >= 2 && !(o.round === 2 && o.region && o.seed))
  @IsNotEmpty()
  parentGame1Id?: string;

  @IsUUID()
  @IsOptional()
  @ValidateIf((o) => o.round >= 2 && !(o.round === 2 && o.region && o.seed))
  @IsNotEmpty()
  parentGame2Id?: string;

  // For Round 2: can use region + seed instead of parent games
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(16)
  @ValidateIf((o) => o.round === 2 && !o.parentGame1Id)
  seed?: number;

  @IsOptional()
  @IsString()
  gameDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(['scheduled', 'in_progress', 'completed'])
  status?: GameStatus;
}

