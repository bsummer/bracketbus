import { IsString, IsOptional, IsNumber, Min, Max, IsIn } from 'class-validator';

export class UpdateTournamentTeamDto {
  @IsString()
  @IsOptional()
  @IsIn(['East', 'West', 'South', 'Midwest'])
  region?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(16)
  seed?: number;
}

