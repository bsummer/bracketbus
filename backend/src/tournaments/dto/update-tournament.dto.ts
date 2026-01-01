import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateTournamentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;
}

