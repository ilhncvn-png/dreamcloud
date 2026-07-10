import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DreamCategory, DreamVisibility } from '../../../common/enums/database.enums';
import { AnalysisSummaryDto } from '../../analysis/dto/analysis-response.dto';
import type { Dream } from '../entities/dream.entity';

export class DreamAuthorDto {
  @ApiProperty() id: string;
  @ApiProperty() username: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional() avatarUrl: string | null;
}

export class DreamResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiPropertyOptional({ type: DreamAuthorDto }) author: DreamAuthorDto | null;
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
  @ApiProperty() isLiked: boolean;
  @ApiProperty() isSaved: boolean;
  @ApiProperty() isHidden: boolean;
  @ApiProperty() dreamedAt: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional({ type: AnalysisSummaryDto }) analysis: AnalysisSummaryDto | null;

  static from(
    dream: Dream,
    context: { isLiked: boolean; isSaved: boolean; analysis?: AnalysisSummaryDto | null } = { isLiked: false, isSaved: false },
  ): DreamResponseDto {
    const dto = new DreamResponseDto();
    dto.id = dream.id;
    dto.userId = dream.userId;
    dto.author = dream.user
      ? {
          id: dream.user.id,
          username: dream.user.username,
          email: dream.user.email,
          avatarUrl: dream.user.profile?.avatarUrl ?? null,
        }
      : null;
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
    dto.isLiked = context.isLiked;
    dto.isSaved = context.isSaved;
    dto.isHidden = dream.isHidden;
    dto.dreamedAt = dream.dreamedAt;
    dto.createdAt = dream.createdAt;
    dto.updatedAt = dream.updatedAt;
    dto.analysis = context.analysis ?? null;
    return dto;
  }
}

export class PaginatedDreamsDto {
  @ApiProperty({ type: [DreamResponseDto] }) items: DreamResponseDto[];
  @ApiProperty() meta: { total: number; page: number; limit: number; pages: number };
}
