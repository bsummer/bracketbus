import { IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePickDto } from './create-bracket.dto';

export class UpdateBracketDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePickDto)
  picks?: CreatePickDto[];
}

