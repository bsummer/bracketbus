import { IsString, IsNotEmpty, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePickDto {
  @IsUUID()
  @IsNotEmpty()
  gameId: string;

  @IsUUID()
  @IsNotEmpty()
  predictedWinnerId: string;
}

export class CreateBracketDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  poolId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePickDto)
  picks: CreatePickDto[];
}

