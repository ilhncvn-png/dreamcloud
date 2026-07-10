import {
  Controller, Get, Post, Patch, Delete,
  Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { OsEngineService, type CreateAutomationRuleDto, type CreateScenarioDto } from './os-engine.service';

@ApiTags('admin/os')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/os')
export class OsEngineController {
  constructor(private readonly os: OsEngineService) {}

  // ── Automation Rules ────────────────────────────────────────────────────────

  @Get('automation')
  @ApiOperation({ summary: 'List all automation rules' })
  getAutomationRules() { return this.os.getAutomationRules(); }

  @Post('automation')
  @ApiOperation({ summary: 'Create a new automation rule' })
  createAutomationRule(
    @Body() dto: CreateAutomationRuleDto,
    @CurrentUser() user: JwtPayload,
  ) { return this.os.createAutomationRule(dto, user.sub); }

  @Patch('automation/:id/toggle')
  @ApiOperation({ summary: 'Toggle automation rule active/paused' })
  toggleAutomationRule(@Param('id') id: string) { return this.os.toggleAutomationRule(id); }

  @Delete('automation/:id')
  @ApiOperation({ summary: 'Delete automation rule' })
  deleteAutomationRule(@Param('id') id: string) { return this.os.deleteAutomationRule(id); }

  // ── Scenario Engine ─────────────────────────────────────────────────────────

  @Get('scenarios')
  @ApiOperation({ summary: 'List all scenario rules (IF/THEN chains)' })
  getScenarios() { return this.os.getScenarios(); }

  @Post('scenarios')
  @ApiOperation({ summary: 'Create a new scenario rule' })
  createScenario(
    @Body() dto: CreateScenarioDto,
    @CurrentUser() user: JwtPayload,
  ) { return this.os.createScenario(dto, user.sub); }

  @Patch('scenarios/:id/toggle')
  @ApiOperation({ summary: 'Toggle scenario active/paused' })
  toggleScenario(@Param('id') id: string) { return this.os.toggleScenario(id); }

  @Delete('scenarios/:id')
  @ApiOperation({ summary: 'Delete scenario rule' })
  deleteScenario(@Param('id') id: string) { return this.os.deleteScenario(id); }

  // ── Alert Center ────────────────────────────────────────────────────────────

  @Get('alerts')
  @ApiOperation({ summary: 'Get all alert categories — critical, warnings, intelligence, system' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  getAlerts(@Query('hours') hours?: string) {
    return this.os.getAlerts(hours ? parseInt(hours) : 48);
  }

  // ── AI Observer ─────────────────────────────────────────────────────────────

  @Get('observer')
  @ApiOperation({ summary: 'AI Observer — mood trend, symbol trends, anomalies, collective changes' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getObserverData(@Query('days') days?: string) {
    return this.os.getAIObserverData(days ? parseInt(days) : 30);
  }

  // ── Scheduler ───────────────────────────────────────────────────────────────

  @Get('scheduler')
  @ApiOperation({ summary: 'List all scheduler jobs with status and timing' })
  getSchedulerJobs() { return this.os.getSchedulerJobs(); }

  @Post('scheduler/:name/trigger')
  @ApiOperation({ summary: 'Manually trigger a scheduler job by name' })
  triggerJob(@Param('name') name: string) { return this.os.triggerJob(name); }

  @Patch('scheduler/:id/toggle')
  @ApiOperation({ summary: 'Enable/disable a scheduler job' })
  toggleSchedulerJob(@Param('id') id: string) { return this.os.toggleSchedulerJob(id); }
}
