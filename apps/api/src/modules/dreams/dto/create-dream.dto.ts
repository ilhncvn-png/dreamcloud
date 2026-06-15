import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { DreamCategory, DreamVisibility } from '../../../common/enums/database.enums';

export class CreateDreamDto {
  @ApiPropertyOptional({ example: 'The flying forest', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiProperty({ example: 'I was flying over a dark forest...', maxLength: 10000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;

  @ApiPropertyOptional({ enum: DreamCategory, default: DreamCategory.NORMAL })
  @IsOptional()
  @IsEnum(DreamCategory)
  category?: DreamCategory;

  @ApiPropertyOptional({ enum: DreamVisibility, default: DreamVisibility.FOLLOWERS })
  @IsOptional()
  @IsEnum(DreamVisibility)
  visibility?: DreamVisibility;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;

  @ApiPropertyOptional({
    type: [String],
    example: ['forest', 'flying', 'night'],
    maxItems: 20,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @ApiPropertyOptional({
    description: 'When the dream occurred (ISO 8601). Defaults to now.',
    example: '2026-06-14T03:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dreamedAt?: string;
}
