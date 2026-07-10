import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { EventEngineService } from './event-engine.service';

@ApiTags('admin/engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/engine')
export class EventEngineController {
  constructor(private readonly engineService: EventEngineService) {}

  @Get('events')
  @ApiOperation({ summary: 'Live event stream — recent platform events (dreams, matches, signals)' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getLiveEvents(
    @Query('hours') hours?: string,
    @Query('limit') limit?: string,
  ) {
    return this.engineService.getLiveEvents(
      hours ? parseInt(hours) : 24,
      limit ? parseInt(limit) : 60,
    );
  }

  @Get('events/stats')
  @ApiOperation({ summary: 'Event stats for a given time window' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  getEventStats(@Query('hours') hours?: string) {
    return this.engineService.getEventStats(hours ? parseInt(hours) : 24);
  }

  @Get('users/:userId/timeline')
  @ApiOperation({ summary: 'Full dream timeline for a user (emotion history, symbols, resonance, frequency)' })
  getUserTimeline(@Param('userId') userId: string) {
    return this.engineService.getUserTimeline(userId);
  }

  @Get('dreams/:dreamId/graph')
  @ApiOperation({ summary: 'Dream graph — nodes (symbols, emotions, archetypes, themes, places) + connections' })
  getDreamGraph(@Param('dreamId') dreamId: string) {
    return this.engineService.getDreamGraph(dreamId);
  }

  @Get('users/:userId/insights')
  @ApiOperation({ summary: 'AI-generated insights for a user — behavioral patterns and subconscious analysis' })
  getUserInsights(@Param('userId') userId: string) {
    return this.engineService.getUserInsights(userId);
  }
}
