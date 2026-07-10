import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { DreamCategory, DreamVisibility } from '../../../common/enums/database.enums';

export enum DreamSort {
  NEWEST = 'newest',
  MOST_LIKED = 'most_liked',
  MOST_SAVED = 'most_saved',
  MOST_COMMENTED = 'most_commented',
}

export class DreamQueryDto {
  @ApiPropertyOptional({ description: 'Cursor for mobile pagination (ignored server-side)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID (public dreams only)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: DreamCategory })
  @IsOptional()
  @IsEnum(DreamCategory)
  category?: DreamCategory;

  @ApiPropertyOptional({ enum: DreamVisibility, description: 'Only used on /me endpoint' })
  @IsOptional()
  @IsEnum(DreamVisibility)
  visibility?: DreamVisibility;

  @ApiPropertyOptional({ enum: DreamSort, description: 'Sort order for public feed' })
  @IsOptional()
  @IsEnum(DreamSort)
  sort?: DreamSort;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}
