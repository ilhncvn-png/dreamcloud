import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DreamCategory, DreamVisibility } from '../../../common/enums/database.enums';
import type { Dream } from '../entities/dream.entity';

export class DreamResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiPropertyOptional() title: string | null;
  @ApiProperty() content: string;
  @ApiProperty({ enum: DreamCategory }) category: DreamCategory;
  @ApiProperty({ enum: DreamVisibility }) visibility: DreamVisibility;
  @ApiProperty() isDraft: boolean;
  @ApiProperty({ type: [String] }) tags: string[];
  @ApiProperty() likeCount: number;
  @ApiProperty() commentCount: number;
  @ApiProperty() matchCount: number;
  @ApiProperty() saveCount: number;
  @ApiProperty() isHidden: boolean;
  @ApiProperty() dreamedAt: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static from(dream: Dream): DreamResponseDto {
    const dto = new DreamResponseDto();
    dto.id = dream.id;
    dto.userId = dream.userId;
    dto.title = dream.title;
    dto.content = dream.content;
    dto.category = dream.category;
    dto.visibility = dream.visibility;
    dto.isDraft = dream.isDraft;
    dto.tags = dream.tags;
    dto.likeCount = dream.likeCount;
    dto.commentCount = dream.commentCount;
    dto.matchCount = dream.matchCount;
    dto.saveCount = dream.saveCount;
    dto.isHidden = dream.isHidden;
    dto.dreamedAt = dream.dreamedAt;
    dto.createdAt = dream.createdAt;
    dto.updatedAt = dream.updatedAt;
    return dto;
  }
}

export class PaginatedDreamsDto {
  @ApiProperty({ type: [DreamResponseDto] }) items: DreamResponseDto[];
  @ApiProperty() meta: { total: number; page: number; limit: number; pages: number };
}
