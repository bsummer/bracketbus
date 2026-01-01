import { IsString, IsNotEmpty, IsNumber, Min, Max, IsUUID, IsIn } from 'class-validator';

export class CreateTournamentTeamDto {
  @IsUUID()
  @IsNotEmpty()
  tournamentId: string; // Will be set from URL parameter by controller

  @IsUUID()
  @IsNotEmpty()
  teamId: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['East', 'West', 'South', 'Midwest'])
  region: string;

  @IsNumber()
  @Min(1)
  @Max(16)
  seed: number;
}

