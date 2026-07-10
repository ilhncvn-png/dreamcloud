import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { AdminService } from './admin.service';

// ── DTOs ──────────────────────────────────────────────────────────────────────

class AdminListQueryDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  page?: number;

  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  limit?: number;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsString()
  role?: string;

  @IsOptional() @IsString()
  status?: 'active' | 'inactive';

  @IsOptional() @IsString()
  sortBy?: string;

  @IsOptional() @IsString()
  sortDir?: 'asc' | 'desc';
}

class AdminDreamQueryDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  page?: number;

  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  limit?: number;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  visibility?: string;

  @IsOptional() @IsString()
  authorSearch?: string;

  @IsOptional() @Type(() => Boolean) @IsBoolean()
  hasReports?: boolean;

  @IsOptional() @Type(() => Boolean) @IsBoolean()
  isFeatured?: boolean;

  @IsOptional() @Type(() => Boolean) @IsBoolean()
  isHidden?: boolean;

  @IsOptional() @IsString()
  dateFrom?: string;

  @IsOptional() @IsString()
  dateTo?: string;

  @IsOptional() @IsString()
  sortBy?: string;

  @IsOptional() @IsString()
  sortDir?: 'asc' | 'desc';
}

class UpdateRoleDto {
  @IsIn(['user', 'moderator', 'admin', 'super_admin'])
  role!: string;
}

class UpdateStatusDto {
  @IsBoolean()
  isActive!: boolean;

  @IsOptional()
  lockedUntil?: string | null;
}

class UpdateProfileDto {
  @IsOptional() @IsString()
  displayName?: string;

  @IsOptional() @IsString()
  bio?: string;

  @IsOptional() @IsString()
  avatarUrl?: string;
}

class FeatureDreamDto {
  @IsBoolean()
  isFeatured!: boolean;
}

class HideDreamDto {
  @IsBoolean()
  isHidden!: boolean;

  @IsOptional() @IsString()
  note?: string;
}

class UpdateDreamMetadataDto {
  @IsOptional() @IsString()
  title?: string;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString({ each: true })
  tags?: string[];

  @IsOptional() @IsString()
  moderationNote?: string;
}

class ResolveDreamReportDto {
  @IsIn(['resolved', 'dismissed'])
  status!: string;
}

class AdminReportQueryDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  page?: number;

  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  limit?: number;

  @IsOptional() @IsString()
  status?: string;

  @IsOptional() @IsString()
  reason?: string;
}

class BulkDreamActionDto {
  @IsString({ each: true })
  ids!: string[];

  @IsIn(['hide', 'unhide', 'feature', 'unfeature', 'delete'])
  action!: string;
}

// ── Controller ────────────────────────────────────────────────────────────────

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Dashboard ────────────────────────────────────────────────────────────

  @Get('overview')
  @ApiOperation({ summary: 'Dashboard overview stats' })
  getOverview() {
    return this.adminService.getOverview();
  }

  // ── Users list ────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'Paginated user list with optional search/filter/sort' })
  @ApiQuery({ name: 'page',    required: false, type: Number })
  @ApiQuery({ name: 'limit',   required: false, type: Number })
  @ApiQuery({ name: 'search',  required: false, type: String })
  @ApiQuery({ name: 'role',    required: false, type: String })
  @ApiQuery({ name: 'status',  required: false, type: String })
  @ApiQuery({ name: 'sortBy',  required: false, type: String })
  @ApiQuery({ name: 'sortDir', required: false, type: String })
  getUsers(@Query() query: AdminListQueryDto) {
    return this.adminService.getUsers(
      query.page  ?? 1,
      query.limit ?? 20,
      query.search ?? '',
      query.role,
      query.status,
      query.sortBy,
      query.sortDir,
    );
  }

  // ── User detail ───────────────────────────────────────────────────────────

  @Get('users/:id')
  @ApiOperation({ summary: 'Full user detail' })
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  // ── Role change ───────────────────────────────────────────────────────────

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update a user role (enforces permission hierarchy)' })
  updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.updateUserRole(admin.sub, admin.role, id, dto.role);
  }

  // ── Status change (ban/unban) ─────────────────────────────────────────────

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Ban or unban a user account' })
  updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.updateUserStatus(
      admin.sub, admin.role, id, dto.isActive,
      dto.lockedUntil ? new Date(dto.lockedUntil) : null,
    );
  }

  // ── Profile edit ──────────────────────────────────────────────────────────

  @Patch('users/:id/profile')
  @ApiOperation({ summary: 'Edit a user profile (display name, bio, avatar)' })
  updateUserProfile(
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.updateUserProfile(admin.sub, admin.role, id, dto);
  }

  // ── Password reset ────────────────────────────────────────────────────────

  @Post('users/:id/reset-password')
  @ApiOperation({ summary: 'Issue a password reset token for a user' })
  resetUserPassword(
    @Param('id') id: string,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.resetUserPassword(admin.sub, admin.role, id);
  }

  // ── User activity ─────────────────────────────────────────────────────────

  @Get('users/:id/activity')
  @ApiOperation({ summary: 'Recent activity for a specific user' })
  getUserActivity(@Param('id') id: string) {
    return this.adminService.getUserActivity(id);
  }

  // ── User dreams ───────────────────────────────────────────────────────────

  @Get('users/:id/dreams')
  @ApiOperation({ summary: 'Paginated dreams for a specific user' })
  @ApiQuery({ name: 'page',  required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getUserDreams(
    @Param('id') id: string,
    @Query() query: AdminListQueryDto,
  ) {
    return this.adminService.getUserDreams(id, query.page ?? 1, query.limit ?? 10);
  }

  // ── Dreams list (enhanced) ────────────────────────────────────────────────

  @Get('dreams')
  @ApiOperation({ summary: 'Paginated dream list with full filtering/sorting' })
  @ApiQuery({ name: 'page',         required: false, type: Number })
  @ApiQuery({ name: 'limit',        required: false, type: Number })
  @ApiQuery({ name: 'search',       required: false, type: String })
  @ApiQuery({ name: 'category',     required: false, type: String })
  @ApiQuery({ name: 'visibility',   required: false, type: String })
  @ApiQuery({ name: 'authorSearch', required: false, type: String })
  @ApiQuery({ name: 'hasReports',   required: false, type: Boolean })
  @ApiQuery({ name: 'isFeatured',   required: false, type: Boolean })
  @ApiQuery({ name: 'isHidden',     required: false, type: Boolean })
  @ApiQuery({ name: 'dateFrom',     required: false, type: String })
  @ApiQuery({ name: 'dateTo',       required: false, type: String })
  @ApiQuery({ name: 'sortBy',       required: false, type: String })
  @ApiQuery({ name: 'sortDir',      required: false, type: String })
  getDreams(@Query() query: AdminDreamQueryDto) {
    return this.adminService.getDreams(
      query.page        ?? 1,
      query.limit       ?? 20,
      query.search,
      query.category,
      query.visibility,
      query.authorSearch,
      query.hasReports,
      query.isFeatured,
      query.isHidden,
      query.dateFrom,
      query.dateTo,
      query.sortBy,
      query.sortDir,
    );
  }

  // ── Dream detail ──────────────────────────────────────────────────────────

  @Get('dreams/:id')
  @ApiOperation({ summary: 'Full dream detail with analysis, comments and reports' })
  getDreamById(@Param('id') id: string) {
    return this.adminService.getDreamById(id);
  }

  // ── Feature/unfeature dream ───────────────────────────────────────────────

  @Patch('dreams/:id/feature')
  @ApiOperation({ summary: 'Feature or unfeature a dream' })
  featureDream(
    @Param('id') id: string,
    @Body() dto: FeatureDreamDto,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.featureDream(admin.sub, id, dto.isFeatured);
  }

  // ── Hide/unhide dream ─────────────────────────────────────────────────────

  @Patch('dreams/:id/hide')
  @ApiOperation({ summary: 'Hide or unhide a dream with optional moderation note' })
  hideDream(
    @Param('id') id: string,
    @Body() dto: HideDreamDto,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.hideDream(admin.sub, id, dto.isHidden, dto.note);
  }

  // ── Soft delete dream ─────────────────────────────────────────────────────

  @Delete('dreams/:id')
  @ApiOperation({ summary: 'Soft delete a dream' })
  softDeleteDream(
    @Param('id') id: string,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.softDeleteDream(admin.sub, id);
  }

  // ── Update dream metadata ─────────────────────────────────────────────────

  @Patch('dreams/:id/metadata')
  @ApiOperation({ summary: 'Edit dream metadata (title, category, tags, moderation note)' })
  updateDreamMetadata(
    @Param('id') id: string,
    @Body() dto: UpdateDreamMetadataDto,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.updateDreamMetadata(admin.sub, id, dto);
  }

  // ── Dream reports ─────────────────────────────────────────────────────────

  @Get('dreams/:id/reports')
  @ApiOperation({ summary: 'Get all reports for a specific dream' })
  getDreamReports(@Param('id') id: string) {
    return this.adminService.getDreamReports(id);
  }

  // ── Resolve report ────────────────────────────────────────────────────────

  @Patch('reports/:id/resolve')
  @ApiOperation({ summary: 'Resolve or dismiss a dream report' })
  resolveDreamReport(
    @Param('id') id: string,
    @Body() dto: ResolveDreamReportDto,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.resolveDreamReport(admin.sub, id, dto.status);
  }

  // ── Dream analytics ───────────────────────────────────────────────────────

  @Get('analytics/dreams')
  @ApiOperation({ summary: 'Dream analytics: top lists, category/visibility breakdowns, counts' })
  getDreamAnalytics() {
    return this.adminService.getDreamAnalytics();
  }

  // ── All reports ───────────────────────────────────────────────────────────

  @Get('reports')
  @ApiOperation({ summary: 'All dream reports with optional status/reason filter' })
  @ApiQuery({ name: 'page',   required: false, type: Number })
  @ApiQuery({ name: 'limit',  required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'reason', required: false, type: String })
  getAllReports(@Query() query: AdminReportQueryDto) {
    return this.adminService.getAllReports(
      query.page  ?? 1,
      query.limit ?? 20,
      query.status,
      query.reason,
    );
  }

  // ── Enhanced dashboard metrics ─────────────────────────────────────────────

  @Get('dashboard/metrics')
  @ApiOperation({ summary: 'Enhanced dashboard metrics: top categories, users, recent logs' })
  getDashboardMetrics() {
    return this.adminService.getDashboardMetrics();
  }

  // ── Bulk dream action ─────────────────────────────────────────────────────

  @Post('dreams/bulk')
  @ApiOperation({ summary: 'Bulk dream action: hide/unhide/feature/unfeature/delete' })
  bulkDreamAction(
    @Body() dto: BulkDreamActionDto,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.bulkDreamAction(admin.sub, dto.ids, dto.action);
  }

  // ── Activity feed ─────────────────────────────────────────────────────────

  @Get('activity')
  @ApiOperation({ summary: 'Recent app activity feed' })
  getActivity() {
    return this.adminService.getActivity();
  }

  // ── Admin logs ────────────────────────────────────────────────────────────

  @Get('logs')
  @ApiOperation({ summary: 'Paginated admin audit logs' })
  @ApiQuery({ name: 'page',       required: false, type: Number })
  @ApiQuery({ name: 'limit',      required: false, type: Number })
  @ApiQuery({ name: 'actionType', required: false, type: String })
  getLogs(@Query() query: AdminListQueryDto & { actionType?: string }) {
    return this.adminService.getLogs(query.page ?? 1, query.limit ?? 50, query.actionType || undefined);
  }

  // ── Dream Intelligence ─────────────────────────────────────────────────────

  @Get('intelligence')
  @ApiOperation({ summary: 'Community dream intelligence: trending symbols, themes, emotions, ratios' })
  getDreamIntelligence() {
    return this.adminService.getDreamIntelligence();
  }

  // ── Growth Analytics ───────────────────────────────────────────────────────

  @Get('analytics/growth')
  @ApiOperation({ summary: 'User growth analytics: daily new users, daily active, totals' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getGrowthAnalytics(@Query('days') days?: string) {
    return this.adminService.getGrowthAnalytics(days ? parseInt(days, 10) : 30);
  }

  // ── Engagement Analytics ───────────────────────────────────────────────────

  @Get('analytics/engagement')
  @ApiOperation({ summary: 'Engagement analytics: daily dreams, likes, comments, saves totals' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getEngagementAnalytics(@Query('days') days?: string) {
    return this.adminService.getEngagementAnalytics(days ? parseInt(days, 10) : 30);
  }

  // ── Moderation Summary ─────────────────────────────────────────────────────

  @Get('moderation/summary')
  @ApiOperation({ summary: 'Moderation overview: pending reports, banned users, repeat offenders' })
  getModerationSummary() {
    return this.adminService.getModerationSummary();
  }

  // ── Community Health ───────────────────────────────────────────────────────

  @Get('community-health')
  @ApiOperation({ summary: 'Community health: mood score, positivity/anxiety indexes, emotion distribution' })
  getCommunityHealth() {
    return this.adminService.getCommunityHealth();
  }

  // ── Operational Alerts ─────────────────────────────────────────────────────

  @Get('alerts')
  @ApiOperation({ summary: 'Operational alerts: report spikes, ban waves, high risk content' })
  getOperationalAlerts() {
    return this.adminService.getOperationalAlerts();
  }

  // ── User Risk ──────────────────────────────────────────────────────────────

  @Get('risk')
  @ApiOperation({ summary: 'User risk list sorted by risk score (reports + hidden content)' })
  @ApiQuery({ name: 'page',  required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getUserRiskList(@Query() query: AdminListQueryDto) {
    return this.adminService.getUserRiskList(query.page ?? 1, query.limit ?? 50);
  }

  // ── Employees ──────────────────────────────────────────────────────────────

  @Get('employees')
  @ApiOperation({ summary: 'Admin staff list with action counts and last login' })
  getEmployees() {
    return this.adminService.getEmployees();
  }

  // ── Support Tickets ────────────────────────────────────────────────────────

  @Get('support/tickets')
  @ApiOperation({ summary: 'Support tickets list (paginated, filterable by status/priority)' })
  @ApiQuery({ name: 'page',     required: false, type: Number })
  @ApiQuery({ name: 'limit',    required: false, type: Number })
  @ApiQuery({ name: 'status',   required: false, type: String })
  @ApiQuery({ name: 'priority', required: false, type: String })
  getSupportTickets(
    @Query() query: AdminListQueryDto & { status?: string; priority?: string },
  ) {
    return this.adminService.getSupportTickets(
      query.page  ?? 1,
      query.limit ?? 20,
      query.status   || undefined,
      query.priority || undefined,
    );
  }

  @Post('support/tickets')
  @ApiOperation({ summary: 'Create a new support ticket' })
  createSupportTicket(
    @Body() body: {
      subject: string;
      description?: string;
      priority?: string;
      category?: string;
      reporterUserId?: string;
      reporterEmail?: string;
      reporterName?: string;
    },
  ) {
    return this.adminService.createSupportTicket(body);
  }

  @Patch('support/tickets/:id')
  @ApiOperation({ summary: 'Update support ticket status, priority, assignment, or notes' })
  updateSupportTicket(
    @Param('id') id: string,
    @Body() body: {
      status?: string;
      priority?: string;
      assignedToId?: string | null;
      resolutionNotes?: string;
      internalNotes?: string;
    },
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.updateSupportTicket(id, admin.sub, body);
  }

  // ── Phase 8 — AI Operators & Intelligence ──────────────────────────────────

  @Get('operators')
  @ApiOperation({ summary: '6 AI operators with real-time health, findings, recommendations' })
  getAIOperators() {
    return this.adminService.getAIOperators();
  }

  @Get('dream-weather')
  @ApiOperation({ summary: 'Community emotional state mapped to weather conditions' })
  getDreamWeather() {
    return this.adminService.getDreamWeather();
  }

  @Get('global-emotion')
  @ApiOperation({ summary: 'Global emotion distribution, energy level, coherence, hourly flow' })
  getGlobalEmotion() {
    return this.adminService.getGlobalEmotion();
  }

  @Get('predictions')
  @ApiOperation({ summary: 'AI-generated platform predictions derived from trend analysis' })
  getPredictions() {
    return this.adminService.getPredictions();
  }

  @Get('trend-radar')
  @ApiOperation({ summary: '6-dimension trend radar: lucid, positivity, diversity, engagement, safety, volume' })
  getTrendRadar() {
    return this.adminService.getTrendRadar();
  }

  @Get('ai-recommendations')
  @ApiOperation({ summary: 'Consolidated prioritized recommendations from all AI operators' })
  getAIRecommendations() {
    return this.adminService.getAIRecommendations();
  }

  // ── Phase 9 — Dream Intelligence Center ──────────────────────────────────────

  @Get('consciousness-map')
  @ApiOperation({ summary: 'Platform consciousness dimensions, overall score, tier, 7-day trend' })
  getConsciousnessMap() {
    return this.adminService.getConsciousnessMap();
  }

  @Get('emotion-map')
  @ApiOperation({ summary: 'Emotion timeline, top emotions, hourly flow, velocity index' })
  getEmotionMap() {
    return this.adminService.getEmotionMap();
  }

  @Get('symbol-analysis')
  @ApiOperation({ summary: 'Top symbols, categories, co-occurrence relationships, emerging symbols' })
  getSymbolAnalysis() {
    return this.adminService.getSymbolAnalysis();
  }

  @Get('archetype-analysis')
  @ApiOperation({ summary: 'Archetype distribution from dream_figures, activation score, dominant emotions' })
  getArchetypeAnalysis() {
    return this.adminService.getArchetypeAnalysis();
  }

  @Get('dream-genome')
  @ApiOperation({ summary: 'Platform DNA: genome signature, symbol/emotion/theme genes, combinations' })
  getDreamGenome() {
    return this.adminService.getDreamGenome();
  }

  @Get('global-dream-map')
  @ApiOperation({ summary: 'Dream distribution by country from user_profiles.location_country' })
  getGlobalDreamMap() {
    return this.adminService.getGlobalDreamMap();
  }

  @Get('collective-consciousness')
  @ApiOperation({ summary: 'Collective mood, alignment, resonance, shared symbols/themes, coherence level' })
  getCollectiveConsciousness() {
    return this.adminService.getCollectiveConsciousness();
  }

  // ── App Config ────────────────────────────────────────────────────────────

  @Get('app-configs')
  @ApiOperation({ summary: 'List all platform app_config toggles' })
  getAppConfigs() {
    return this.adminService.getAppConfigs();
  }

  @Patch('app-configs/:key')
  @ApiOperation({ summary: 'Update a platform toggle value' })
  updateAppConfig(
    @Param('key') key: string,
    @Body() body: { value: boolean },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.updateAppConfig(key, body.value, user.sub);
  }

  // ── Feature Flags ─────────────────────────────────────────────────────────

  @Get('feature-flags')
  @ApiOperation({ summary: 'List all feature flags' })
  getFeatureFlags() {
    return this.adminService.getFeatureFlags();
  }

  @Post('feature-flags')
  @ApiOperation({ summary: 'Create a new feature flag' })
  createFeatureFlag(
    @Body() body: { key: string; name: string; description?: string; enabled?: boolean; targetAudience?: string; rolloutPercentage?: number },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.createFeatureFlag(body, user.sub);
  }

  @Patch('feature-flags/:id')
  @ApiOperation({ summary: 'Update a feature flag' })
  updateFeatureFlag(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; enabled?: boolean; targetAudience?: string; rolloutPercentage?: number },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.updateFeatureFlag(id, body, user.sub);
  }

  @Delete('feature-flags/:id')
  @ApiOperation({ summary: 'Delete a feature flag' })
  deleteFeatureFlag(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.adminService.deleteFeatureFlag(id, user.sub);
  }

  // ── Admin Notifications ───────────────────────────────────────────────────

  @Post('notifications/send')
  @ApiOperation({ summary: 'Send platform-wide admin notification' })
  sendAdminNotification(
    @Body() body: { type: string; title: string; message: string; targetAudience?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.sendAdminNotification(body, user.sub);
  }

  @Get('notifications/history')
  @ApiOperation({ summary: 'Notification send history' })
  @ApiQuery({ name: 'page',  required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getNotificationHistory(
    @Query('page')  page  = '1',
    @Query('limit') limit = '50',
  ) {
    return this.adminService.getNotificationHistory(parseInt(page), parseInt(limit));
  }

  // ── Moderation Rules ──────────────────────────────────────────────────────

  @Get('moderation-rules')
  @ApiOperation({ summary: 'Get moderation automation rules (single-row config)' })
  getModerationRules() {
    return this.adminService.getModerationRules();
  }

  @Patch('moderation-rules')
  @ApiOperation({ summary: 'Update moderation automation rules' })
  updateModerationRules(
    @Body() body: {
      autoHideThreshold?: number; reportThreshold?: number; banThreshold?: number;
      suspiciousUserThreshold?: number; aiRiskThreshold?: number; restrictedWords?: string[];
      rateLimitPerMinute?: number; rateLimitPerHour?: number;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.updateModerationRules(body, user.sub);
  }

  // ── Live Stream ───────────────────────────────────────────────────────────

  @Get('live-stream')
  @ApiOperation({ summary: 'Enhanced real-time event stream from all platform tables' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getLiveStream(
    @Query('hours') hours = '24',
    @Query('limit') limit = '60',
  ) {
    return this.adminService.getLiveStream(parseInt(hours), parseInt(limit));
  }

  // ── Moderation Queue ──────────────────────────────────────────────────────

  @Get('moderation-queue')
  @ApiOperation({ summary: 'Moderation queue with full dream/user context' })
  @ApiQuery({ name: 'page',   required: false, type: Number })
  @ApiQuery({ name: 'limit',  required: false, type: Number })
  @ApiQuery({ name: 'filter', required: false, enum: ['pending', 'resolved', 'all'] })
  getModerationQueue(
    @Query('page')   page   = '1',
    @Query('limit')  limit  = '20',
    @Query('filter') filter = 'pending',
  ) {
    return this.adminService.getModerationQueue(
      parseInt(page), parseInt(limit),
      filter as 'pending' | 'resolved' | 'all',
    );
  }

  @Post('moderation-queue/:id/resolve')
  @ApiOperation({ summary: 'Resolve a report with action (resolve | remove_dream | warn_user | ban_user)' })
  resolveModerationReport(
    @Param('id') id: string,
    @Body() body: { action: 'resolve' | 'remove_dream' | 'warn_user' | 'ban_user'; note?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.resolveModerationReport(id, body.action, body.note ?? '', user.sub);
  }

  @Post('moderation-queue/:id/dismiss')
  @ApiOperation({ summary: 'Dismiss a report without action' })
  dismissModerationReport(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.adminService.dismissModerationReport(id, user.sub);
  }

  // ── Platform Health ───────────────────────────────────────────────────────

  @Get('platform-health/live')
  @ApiOperation({ summary: 'Real-time platform health computed from dream_emotions table' })
  getPlatformHealthLive() {
    return this.adminService.getPlatformHealthLive();
  }

  @Get('platform-health/history')
  @ApiOperation({ summary: 'Historical health snapshots' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getPlatformHealthHistory(@Query('days') days = '30') {
    return this.adminService.getPlatformHealthHistory(parseInt(days));
  }

  @Post('platform-health/snapshot')
  @ApiOperation({ summary: 'Persist current platform health snapshot' })
  savePlatformHealthSnapshot(@CurrentUser() user: JwtPayload) {
    return this.adminService.savePlatformHealthSnapshot(user.sub);
  }

  // ── AI Signals ────────────────────────────────────────────────────────────

  @Get('ai-signals')
  @ApiOperation({ summary: 'Recent AI-generated intelligence signals' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAISignals(@Query('limit') limit = '30') {
    return this.adminService.getAISignals(parseInt(limit));
  }

  @Post('ai-signals/generate')
  @ApiOperation({ summary: 'Analyse current metrics and generate new AI signals' })
  generateAISignals(@CurrentUser() user: JwtPayload) {
    return this.adminService.generateAISignals(user.sub);
  }

  // ── Admin Notification Queue ──────────────────────────────────────────────

  @Get('notification-queue')
  @ApiOperation({ summary: 'Admin internal notification queue' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAdminNotificationQueue(@Query('limit') limit = '30') {
    return this.adminService.getAdminNotificationQueue(parseInt(limit));
  }

  @Post('notification-queue/:id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markAdminNotificationRead(@Param('id') id: string) {
    return this.adminService.markAdminNotificationRead(id);
  }

  @Post('notification-queue/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAdminNotificationsRead() {
    return this.adminService.markAllAdminNotificationsRead();
  }

  // ── Dream Analysis Pipeline ───────────────────────────────────────────────

  @Post('dream-analysis/:dreamId/analyze')
  @ApiOperation({ summary: 'Trigger AI analysis for a single dream' })
  triggerDreamAnalysis(@Param('dreamId') dreamId: string, @CurrentUser() user: JwtPayload) {
    return this.adminService.triggerDreamAnalysis(dreamId, user.sub);
  }

  @Post('dream-analysis/bulk')
  @ApiOperation({ summary: 'Bulk analyse up to 100 unprocessed dreams' })
  bulkDreamAnalysis(@CurrentUser() user: JwtPayload) {
    return this.adminService.bulkDreamAnalysis(user.sub);
  }

  @Get('dream-analysis/:dreamId')
  @ApiOperation({ summary: 'Get stored analysis for a dream' })
  getDreamAnalysis(@Param('dreamId') dreamId: string) {
    return this.adminService.getDreamAnalysisResult(dreamId);
  }

  @Get('dream-analysis-stats')
  @ApiOperation({ summary: 'Platform-wide dream analysis statistics' })
  getPlatformAnalysisStats() {
    return this.adminService.getPlatformAnalysisStats();
  }

  // ── User Intelligence System ──────────────────────────────────────────────────

  @Get('users/:id/intelligence')
  @ApiOperation({ summary: 'User intelligence profile: emotion/symbol patterns, resonance scores' })
  getUserIntelligenceProfile(@Param('id') id: string) {
    return this.adminService.getUserIntelligenceProfile(id);
  }

  @Get('users/:id/risk-profile')
  @ApiOperation({ summary: 'User risk profile: spam, report, suspicious behavior scores' })
  getUserRiskProfile(@Param('id') id: string) {
    return this.adminService.getUserRiskProfile(id);
  }

  @Get('users/:id/moderation-history')
  @ApiOperation({ summary: 'Reports and admin actions taken against this user' })
  getUserModerationHistory(@Param('id') id: string) {
    return this.adminService.getUserModerationHistory(id);
  }

  @Get('dreams/:id/collective-relevance')
  @ApiOperation({ summary: 'How a dream relates to collective platform patterns' })
  getDreamCollectiveRelevance(@Param('id') id: string) {
    return this.adminService.getDreamCollectiveRelevance(id);
  }

  @Get('intelligence/emotional-trends')
  @ApiOperation({ summary: 'Week-by-week emotional trend breakdown' })
  @ApiQuery({ name: 'days', required: false })
  getEmotionalTrends(@Query('days') days?: string) {
    return this.adminService.getEmotionalTrends(days ? parseInt(days) : 28);
  }

  @Get('intelligence/resonance-events')
  @ApiOperation({ summary: 'High-resonance dream match events' })
  @ApiQuery({ name: 'limit', required: false })
  getResonanceEvents(@Query('limit') limit?: string) {
    return this.adminService.getResonanceEvents(limit ? parseInt(limit) : 10);
  }

  @Get('intelligence/collective-summary')
  @ApiOperation({ summary: 'Collective intelligence: top symbols, emotions, dominant mood, resonance count' })
  getCollectiveIntelligenceSummary() {
    return this.adminService.getCollectiveIntelligenceSummary();
  }

  // ── Dream Connection Engine ───────────────────────────────────────────────────

  @Get('connections')
  @ApiOperation({ summary: 'Paginated dream-to-dream connections ordered by match score' })
  @ApiQuery({ name: 'page',     required: false })
  @ApiQuery({ name: 'limit',    required: false })
  @ApiQuery({ name: 'minScore', required: false })
  getDreamConnections(
    @Query('page')     page?:     string,
    @Query('limit')    limit?:    string,
    @Query('minScore') minScore?: string,
  ) {
    return this.adminService.getDreamConnections(
      page     ? parseInt(page)     : 1,
      limit    ? parseInt(limit)    : 30,
      minScore ? parseInt(minScore) : 0,
    );
  }

  @Post('connections/compute-resonance')
  @ApiOperation({ summary: 'Compute and persist user resonance scores from dream_matches' })
  computeUserResonanceScores(@CurrentUser() user: JwtPayload) {
    return this.adminService.computeUserResonanceScores(user.sub);
  }

  @Get('connections/user-resonance')
  @ApiOperation({ summary: 'Paginated user resonance scores' })
  @ApiQuery({ name: 'page',  required: false })
  @ApiQuery({ name: 'limit', required: false })
  getUserResonanceScores(
    @Query('page')  page?:  string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUserResonanceScores(
      page  ? parseInt(page)  : 1,
      limit ? parseInt(limit) : 30,
    );
  }

  @Post('connections/compute-seen')
  @ApiOperation({ summary: 'Detect and persist cross-user symbol / figure / location patterns' })
  computeSeenInDreams(@CurrentUser() user: JwtPayload) {
    return this.adminService.computeSeenInDreams(user.sub);
  }

  @Get('connections/seen-in-dreams')
  @ApiOperation({ summary: 'Cross-user patterns seen across multiple dreamers' })
  @ApiQuery({ name: 'type',  required: false })
  @ApiQuery({ name: 'limit', required: false })
  getSeenInDreams(
    @Query('type')  type?:  string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getSeenInDreams(type ?? null, limit ? parseInt(limit) : 50);
  }

  @Get('connections/feed')
  @ApiOperation({ summary: 'Recent dream connection events' })
  @ApiQuery({ name: 'limit', required: false })
  getConnectionFeed(@Query('limit') limit?: string) {
    return this.adminService.getConnectionFeed(limit ? parseInt(limit) : 40);
  }

  @Get('connections/collective-signals')
  @ApiOperation({ summary: 'Emerging symbols, emotional shifts, recurring themes, global resonance' })
  @ApiQuery({ name: 'days', required: false })
  getCollectiveSignals(@Query('days') days?: string) {
    return this.adminService.getCollectiveSignals(days ? parseInt(days) : 7);
  }
}
