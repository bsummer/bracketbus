import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreatePoolDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  tournamentId: string;
}

