import { IsString, IsNotEmpty, Length } from 'class-validator';

export class JoinPoolDto {
  @IsString()
  @IsNotEmpty()
  @Length(8, 8)
  inviteCode: string;
}

