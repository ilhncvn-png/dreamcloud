import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DreamMentionsService } from './mentions.service';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@UseGuards(JwtAuthGuard)
@Controller('mentions')
export class MentionsController {
  constructor(private readonly mentionsService: DreamMentionsService) {}

  // Who dreamed about the current user
  @Get('me')
  async getMyMentions(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = user.sub;
    const result = await this.mentionsService.getMentionsOfMe(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return {
      items: result.items.map(m => ({
        id:                  m.id,
        dreamId:             m.dream_id,
        dreamerUserId:       m.dreamer_user_id,
        dreamerUsername:     m.dreamer_username,
        dreamerDisplayName:  m.dreamer_display_name,
        dreamerAvatarUrl:    m.dreamer_avatar_url,
        dreamTitle:          m.dream_title,
        matchedName:         m.matched_name,
        confidenceScore:     m.confidence_score,
        createdAt:           m.created_at,
      })),
      meta: {
        total:  result.total,
        page:   page ? parseInt(page, 10) : 1,
        limit:  limit ? parseInt(limit, 10) : 20,
        pages:  Math.ceil(result.total / (limit ? parseInt(limit, 10) : 20)),
      },
    };
  }

  // All mentions inside a specific dream
  @Get('dream/:id')
  async getMentionsInDream(@Param('id', ParseUUIDPipe) dreamId: string) {
    const rows = await this.mentionsService.getMentionsInDream(dreamId);
    return rows.map(m => ({
      id:                  m.id,
      dreamId:             m.dream_id,
      dreamerUserId:       m.dreamer_user_id,
      dreamerUsername:     m.dreamer_username,
      dreamerDisplayName:  m.dreamer_display_name,
      dreamerAvatarUrl:    m.dreamer_avatar_url,
      dreamTitle:          m.dream_title,
      matchedName:         m.matched_name,
      confidenceScore:     m.confidence_score,
      createdAt:           m.created_at,
    }));
  }

  // Aggregate stats for the current user
  @Get('stats')
  async getMyStats(@CurrentUser() user: JwtPayload) {
    const userId = user.sub;
    return this.mentionsService.getMentionStats(userId);
  }
}
