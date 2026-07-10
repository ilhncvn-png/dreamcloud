import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { IntelligenceService } from './intelligence.service';

@ApiTags('intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('intelligence')
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Get('dreams/:dreamId/analysis')
  @ApiOperation({ summary: 'Full intelligence analysis for a dream — emotions, symbols, archetypes, scores' })
  getDreamAnalysis(
    @Param('dreamId') dreamId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.intelligenceService.getDreamAnalysis(dreamId, user.sub);
  }

  @Get('dreams/:dreamId/similar')
  @ApiOperation({ summary: 'Dreams similar to the given dream with match scores and shared elements' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getSimilarDreams(
    @Param('dreamId') dreamId: string,
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    return this.intelligenceService.getSimilarDreams(dreamId, user.sub, limit ? parseInt(limit) : 5);
  }

  @Get('users/me/resonance')
  @ApiOperation({ summary: 'Resonance score and connection profile for the authenticated user' })
  getUserResonance(@CurrentUser() user: JwtPayload) {
    return this.intelligenceService.getUserResonance(user.sub);
  }

  @Get('collective/mood')
  @ApiOperation({ summary: 'Current collective mood — dominant emotion, emerging symbols, platform state' })
  getCollectiveMood() {
    return this.intelligenceService.getCollectiveMood();
  }

  @Get('users/me/connections')
  @ApiOperation({ summary: 'Recent dream connections for the authenticated user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getUserConnections(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    return this.intelligenceService.getUserConnections(user.sub, limit ? parseInt(limit) : 20);
  }

  @Get('users/me/notifications')
  @ApiOperation({ summary: 'Intelligence notifications — new matches, seen-in-dreams patterns, AI events' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getIntelligenceNotifications(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    return this.intelligenceService.getIntelligenceNotifications(user.sub, limit ? parseInt(limit) : 20);
  }

  @Get('users/me/timeline')
  @ApiOperation({ summary: 'Personal dream timeline — emotion history, symbol evolution, resonance, frequency' })
  getUserDreamTimeline(@CurrentUser() user: JwtPayload) {
    return this.intelligenceService.getUserDreamTimeline(user.sub);
  }

  @Get('dreams/:dreamId/graph')
  @ApiOperation({ summary: 'Dream graph nodes and connections for a specific dream' })
  getDreamGraph(
    @Param('dreamId') dreamId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.intelligenceService.getDreamGraphForUser(dreamId, user.sub);
  }

  @Get('users/me/insights')
  @ApiOperation({ summary: 'AI-generated personal insights — behavioral patterns, subconscious analysis' })
  getUserAIInsights(@CurrentUser() user: JwtPayload) {
    return this.intelligenceService.getUserAIInsights(user.sub);
  }

  @Get('events/recent')
  @ApiOperation({ summary: 'Recent anonymized platform events — new dreams and high resonance matches' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getRecentPlatformEvents(@Query('limit') limit?: string) {
    return this.intelligenceService.getRecentPlatformEvents(limit ? parseInt(limit) : 20);
  }

  @Get('users/me/smart-notifications')
  @ApiOperation({ summary: 'Smart prioritized notifications — resonance alerts, symbol events, mood updates' })
  getSmartNotifications(@CurrentUser() user: JwtPayload) {
    return this.intelligenceService.getSmartNotifications(user.sub);
  }
}
