import { api } from './client';
import type {
  AdminOverview,
  AdminUser,
  AdminUserDetail,
  AdminDream,
  AdminDreamDetail,
  AdminDreamReport,
  AdminReport,
  DreamAnalytics,
  DashboardMetrics,
  DreamIntelligenceData,
  GrowthAnalytics,
  EngagementAnalytics,
  ModerationSummary,
  CommunityHealthData,
  OperationalAlertsData,
  UserRiskEntry,
  EmployeeEntry,
  SupportTicket,
  AIOperatorsData,
  DreamWeatherData,
  GlobalEmotionData,
  PredictionCenterData,
  TrendRadarData,
  AIRecommendationsData,
  ConsciousnessMapData,
  EmotionMapData,
  SymbolAnalysisData,
  ArchetypeAnalysisData,
  DreamGenomeData,
  GlobalDreamMapData,
  CollectiveConsciousnessData,
  AdminLogEntry,
  ActivityEvent,
  AuthTokens,
  PaginatedResult,
  StoredAdmin,
  AppConfigEntry,
  FeatureFlag,
  AdminNotificationEntry,
  ModerationRules,
  LiveStreamEvent,
  ModerationQueueItem,
  PlatformHealthLive,
  AISignal,
  AdminNotificationItem,
  DreamAnalysisResult,
  PlatformAnalysisStats,
  UserIntelligenceProfile,
  UserRiskProfile,
  ModerationHistoryItem,
  DreamCollectiveRelevance,
  EmotionalTrend,
  ResonanceEvent,
  CollectiveIntelligenceSummary,
  DreamConnection,
  UserResonanceScore,
  SeenInDream,
  ConnectionFeedEvent,
  CollectiveSignals,
} from '../types/admin.types';
import { decodeJwtPayload, isAdminRole } from '../store/auth.store';
import axios from 'axios';

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function adminLogin(email: string, password: string): Promise<StoredAdmin> {
  const { data: body } = await api.post<{ data: AuthTokens }>('/auth/login', { email, password });
  const tokens = body.data;
  const payload = decodeJwtPayload(tokens.accessToken);
  const role    = String(payload?.['role']  ?? '');
  const sub     = String(payload?.['sub']   ?? '');
  const mail    = String(payload?.['email'] ?? email);
  console.log('[admin login] jwt payload:', { sub, mail, role });
  if (!isAdminRole(role)) throw new Error(`Bu hesabın admin yetkisi yok. (mevcut rol: "${role || 'boş'}")`);

  let username = mail.split('@')[0];
  try {
    const tmpApi = axios.create({ baseURL: '/api/v1' });
    const meRes  = await tmpApi.get<{ data: { username: string; role: string } }>(
      '/auth/me', { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
    );
    username = meRes.data.data.username;
  } catch { /* fallback */ }

  return { id: sub, email: mail, username, role, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
}

// ── Overview ──────────────────────────────────────────────────────────────────

export async function fetchOverview(): Promise<AdminOverview> {
  const { data } = await api.get<{ data: AdminOverview }>('/admin/overview');
  return data.data;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function fetchUsers(
  page = 1, limit = 20, search = '',
  role?: string, status?: 'active' | 'inactive',
  sortBy?: string, sortDir?: 'asc' | 'desc',
): Promise<PaginatedResult<AdminUser>> {
  const { data } = await api.get<{ data: PaginatedResult<AdminUser> }>('/admin/users', {
    params: { page, limit, search: search || undefined, role: role || undefined, status: status || undefined, sortBy: sortBy || undefined, sortDir: sortDir || undefined },
  });
  return data.data;
}

export async function fetchUserById(userId: string): Promise<AdminUserDetail> {
  const { data } = await api.get<{ data: AdminUserDetail }>(`/admin/users/${userId}`);
  return data.data;
}

export async function updateUserRole(userId: string, role: string): Promise<void> {
  await api.patch(`/admin/users/${userId}/role`, { role });
}

export async function updateUserStatus(userId: string, isActive: boolean, lockedUntil?: string | null): Promise<void> {
  await api.patch(`/admin/users/${userId}/status`, { isActive, lockedUntil });
}

export async function updateUserProfile(userId: string, data: { displayName?: string; bio?: string; avatarUrl?: string }): Promise<void> {
  await api.patch(`/admin/users/${userId}/profile`, data);
}

export async function resetUserPassword(userId: string): Promise<{ ok: boolean; resetToken: string }> {
  const { data } = await api.post<{ data: { ok: boolean; resetToken: string } }>(`/admin/users/${userId}/reset-password`);
  return data.data;
}

export async function fetchUserActivity(userId: string): Promise<ActivityEvent[]> {
  const { data } = await api.get<{ data: ActivityEvent[] }>(`/admin/users/${userId}/activity`);
  return data.data;
}

export async function fetchUserDreams(userId: string, page = 1, limit = 10): Promise<PaginatedResult<AdminDream>> {
  const { data } = await api.get<{ data: PaginatedResult<AdminDream> }>(`/admin/users/${userId}/dreams`, { params: { page, limit } });
  return data.data;
}

// ── Dreams ────────────────────────────────────────────────────────────────────

export interface FetchDreamsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  visibility?: string;
  authorSearch?: string;
  hasReports?: boolean;
  isFeatured?: boolean;
  isHidden?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export async function fetchDreams(params: FetchDreamsParams = {}): Promise<PaginatedResult<AdminDream>> {
  const { data } = await api.get<{ data: PaginatedResult<AdminDream> }>('/admin/dreams', {
    params: {
      page:         params.page ?? 1,
      limit:        params.limit ?? 20,
      search:       params.search       || undefined,
      category:     params.category     || undefined,
      visibility:   params.visibility   || undefined,
      authorSearch: params.authorSearch || undefined,
      hasReports:   params.hasReports   ?? undefined,
      isFeatured:   params.isFeatured   ?? undefined,
      isHidden:     params.isHidden      ?? undefined,
      dateFrom:     params.dateFrom     || undefined,
      dateTo:       params.dateTo       || undefined,
      sortBy:       params.sortBy       || undefined,
      sortDir:      params.sortDir      || undefined,
    },
  });
  return data.data;
}

export async function fetchDreamById(dreamId: string): Promise<AdminDreamDetail> {
  const { data } = await api.get<{ data: AdminDreamDetail }>(`/admin/dreams/${dreamId}`);
  return data.data;
}

export async function featureDream(dreamId: string, isFeatured: boolean): Promise<void> {
  await api.patch(`/admin/dreams/${dreamId}/feature`, { isFeatured });
}

export async function hideDream(dreamId: string, isHidden: boolean, note?: string): Promise<void> {
  await api.patch(`/admin/dreams/${dreamId}/hide`, { isHidden, note });
}

export async function deleteDream(dreamId: string): Promise<void> {
  await api.delete(`/admin/dreams/${dreamId}`);
}

export async function updateDreamMetadata(
  dreamId: string,
  data: { title?: string; category?: string; tags?: string[]; moderationNote?: string },
): Promise<void> {
  await api.patch(`/admin/dreams/${dreamId}/metadata`, data);
}

export async function fetchDreamReports(dreamId: string): Promise<AdminDreamReport[]> {
  const { data } = await api.get<{ data: AdminDreamReport[] }>(`/admin/dreams/${dreamId}/reports`);
  return data.data;
}

export async function resolveDreamReport(reportId: string, status: 'resolved' | 'dismissed'): Promise<void> {
  await api.patch(`/admin/reports/${reportId}/resolve`, { status });
}

export async function fetchDreamAnalytics(): Promise<DreamAnalytics> {
  const { data } = await api.get<{ data: DreamAnalytics }>('/admin/analytics/dreams');
  return data.data;
}

export async function fetchAllReports(params: {
  page?: number; limit?: number; status?: string; reason?: string;
} = {}): Promise<PaginatedResult<AdminReport>> {
  const { data } = await api.get<{ data: PaginatedResult<AdminReport> }>('/admin/reports', {
    params: {
      page:   params.page   ?? 1,
      limit:  params.limit  ?? 20,
      status: params.status || undefined,
      reason: params.reason || undefined,
    },
  });
  return data.data;
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const { data } = await api.get<{ data: DashboardMetrics }>('/admin/dashboard/metrics');
  return data.data;
}

export async function bulkDreamAction(
  ids: string[],
  action: 'hide' | 'unhide' | 'feature' | 'unfeature' | 'delete',
): Promise<{ affected: number }> {
  const { data } = await api.post<{ data: { affected: number } }>('/admin/dreams/bulk', { ids, action });
  return data.data;
}

export async function fetchDreamIntelligence(): Promise<DreamIntelligenceData> {
  const { data } = await api.get<{ data: DreamIntelligenceData }>('/admin/intelligence');
  return data.data;
}

export async function fetchGrowthAnalytics(days = 30): Promise<GrowthAnalytics> {
  const { data } = await api.get<{ data: GrowthAnalytics }>('/admin/analytics/growth', { params: { days } });
  return data.data;
}

export async function fetchEngagementAnalytics(days = 30): Promise<EngagementAnalytics> {
  const { data } = await api.get<{ data: EngagementAnalytics }>('/admin/analytics/engagement', { params: { days } });
  return data.data;
}

export async function fetchModerationSummary(): Promise<ModerationSummary> {
  const { data } = await api.get<{ data: ModerationSummary }>('/admin/moderation/summary');
  return data.data;
}

// ── Phase 7 — OS endpoints ────────────────────────────────────────────────────

export async function fetchCommunityHealth(): Promise<CommunityHealthData> {
  const { data } = await api.get<{ data: CommunityHealthData }>('/admin/community-health');
  return data.data;
}

export async function fetchOperationalAlerts(): Promise<OperationalAlertsData> {
  const { data } = await api.get<{ data: OperationalAlertsData }>('/admin/alerts');
  return data.data;
}

export async function fetchUserRiskList(page = 1, limit = 50): Promise<PaginatedResult<UserRiskEntry>> {
  const { data } = await api.get<{ data: PaginatedResult<UserRiskEntry> }>('/admin/risk', { params: { page, limit } });
  return data.data;
}

export async function fetchEmployees(): Promise<EmployeeEntry[]> {
  const { data } = await api.get<{ data: EmployeeEntry[] }>('/admin/employees');
  return data.data;
}

export async function fetchSupportTickets(params: {
  page?: number; limit?: number; status?: string; priority?: string;
} = {}): Promise<PaginatedResult<SupportTicket>> {
  const { data } = await api.get<{ data: PaginatedResult<SupportTicket> }>('/admin/support/tickets', {
    params: {
      page:     params.page     ?? 1,
      limit:    params.limit    ?? 20,
      status:   params.status   || undefined,
      priority: params.priority || undefined,
    },
  });
  return data.data;
}

export async function createSupportTicket(body: {
  subject: string;
  description?: string;
  priority?: string;
  category?: string;
  reporterEmail?: string;
  reporterName?: string;
}): Promise<SupportTicket> {
  const { data } = await api.post<{ data: SupportTicket }>('/admin/support/tickets', body);
  return data.data;
}

export async function updateSupportTicket(id: string, body: {
  status?: string;
  priority?: string;
  assignedToId?: string | null;
  resolutionNotes?: string;
  internalNotes?: string;
}): Promise<SupportTicket> {
  const { data } = await api.patch<{ data: SupportTicket }>(`/admin/support/tickets/${id}`, body);
  return data.data;
}

// ── Phase 8 — AI Operators & Intelligence ────────────────────────────────────

export async function fetchAIOperators(): Promise<AIOperatorsData> {
  const { data } = await api.get<{ data: AIOperatorsData }>('/admin/operators');
  return data.data;
}

export async function fetchDreamWeather(): Promise<DreamWeatherData> {
  const { data } = await api.get<{ data: DreamWeatherData }>('/admin/dream-weather');
  return data.data;
}

export async function fetchGlobalEmotion(): Promise<GlobalEmotionData> {
  const { data } = await api.get<{ data: GlobalEmotionData }>('/admin/global-emotion');
  return data.data;
}

export async function fetchPredictions(): Promise<PredictionCenterData> {
  const { data } = await api.get<{ data: PredictionCenterData }>('/admin/predictions');
  return data.data;
}

export async function fetchTrendRadar(): Promise<TrendRadarData> {
  const { data } = await api.get<{ data: TrendRadarData }>('/admin/trend-radar');
  return data.data;
}

export async function fetchAIRecommendations(): Promise<AIRecommendationsData> {
  const { data } = await api.get<{ data: AIRecommendationsData }>('/admin/ai-recommendations');
  return data.data;
}

// ── Phase 9 — Dream Intelligence Center ──────────────────────────────────────

export async function fetchConsciousnessMap(): Promise<ConsciousnessMapData> {
  const { data } = await api.get<{ data: ConsciousnessMapData }>('/admin/consciousness-map');
  return data.data;
}

export async function fetchEmotionMap(): Promise<EmotionMapData> {
  const { data } = await api.get<{ data: EmotionMapData }>('/admin/emotion-map');
  return data.data;
}

export async function fetchSymbolAnalysis(): Promise<SymbolAnalysisData> {
  const { data } = await api.get<{ data: SymbolAnalysisData }>('/admin/symbol-analysis');
  return data.data;
}

export async function fetchArchetypeAnalysis(): Promise<ArchetypeAnalysisData> {
  const { data } = await api.get<{ data: ArchetypeAnalysisData }>('/admin/archetype-analysis');
  return data.data;
}

export async function fetchDreamGenome(): Promise<DreamGenomeData> {
  const { data } = await api.get<{ data: DreamGenomeData }>('/admin/dream-genome');
  return data.data;
}

export async function fetchGlobalDreamMap(): Promise<GlobalDreamMapData> {
  const { data } = await api.get<{ data: GlobalDreamMapData }>('/admin/global-dream-map');
  return data.data;
}

export async function fetchCollectiveConsciousness(): Promise<CollectiveConsciousnessData> {
  const { data } = await api.get<{ data: CollectiveConsciousnessData }>('/admin/collective-consciousness');
  return data.data;
}

// ── Activity ──────────────────────────────────────────────────────────────────

export async function fetchActivity(): Promise<ActivityEvent[]> {
  const { data } = await api.get<{ data: ActivityEvent[] }>('/admin/activity');
  return data.data;
}

// ── Admin logs ────────────────────────────────────────────────────────────────

export async function fetchAdminLogs(page = 1, limit = 50, actionType?: string): Promise<PaginatedResult<AdminLogEntry>> {
  const { data } = await api.get<{ data: PaginatedResult<AdminLogEntry> }>('/admin/logs', {
    params: { page, limit, actionType: actionType || undefined },
  });
  return data.data;
}

// ── App Config ────────────────────────────────────────────────────────────────

export async function fetchAppConfigs(): Promise<AppConfigEntry[]> {
  const { data } = await api.get<{ data: AppConfigEntry[] }>('/admin/app-configs');
  return data.data;
}

export async function updateAppConfigEntry(key: string, value: boolean): Promise<void> {
  await api.patch(`/admin/app-configs/${encodeURIComponent(key)}`, { value });
}

// ── Feature Flags ─────────────────────────────────────────────────────────────

export async function fetchFeatureFlags(): Promise<FeatureFlag[]> {
  const { data } = await api.get<{ data: FeatureFlag[] }>('/admin/feature-flags');
  return data.data;
}

export async function createFeatureFlag(dto: {
  key: string; name: string; description?: string;
  enabled?: boolean; targetAudience?: string; rolloutPercentage?: number;
}): Promise<FeatureFlag> {
  const { data } = await api.post<{ data: FeatureFlag }>('/admin/feature-flags', dto);
  return data.data;
}

export async function updateFeatureFlag(id: string, dto: {
  name?: string; description?: string; enabled?: boolean;
  targetAudience?: string; rolloutPercentage?: number;
}): Promise<FeatureFlag> {
  const { data } = await api.patch<{ data: FeatureFlag }>(`/admin/feature-flags/${id}`, dto);
  return data.data;
}

export async function deleteFeatureFlag(id: string): Promise<void> {
  await api.delete(`/admin/feature-flags/${id}`);
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function sendAdminNotification(dto: {
  type: string; title: string; message: string; targetAudience?: string;
}): Promise<AdminNotificationEntry> {
  const { data } = await api.post<{ data: AdminNotificationEntry }>('/admin/notifications/send', dto);
  return data.data;
}

export async function fetchNotificationHistory(page = 1, limit = 50): Promise<PaginatedResult<AdminNotificationEntry>> {
  const { data } = await api.get<{ data: PaginatedResult<AdminNotificationEntry> }>('/admin/notifications/history', {
    params: { page, limit },
  });
  return data.data;
}

// ── Moderation Rules ──────────────────────────────────────────────────────────

export async function fetchModerationRules(): Promise<ModerationRules> {
  const { data } = await api.get<{ data: ModerationRules }>('/admin/moderation-rules');
  return data.data;
}

export async function updateModerationRules(dto: Partial<ModerationRules>): Promise<ModerationRules> {
  const { data } = await api.patch<{ data: ModerationRules }>('/admin/moderation-rules', dto);
  return data.data;
}

// ── Live Stream ───────────────────────────────────────────────────────────────

export async function fetchLiveStream(hours = 24, limit = 60): Promise<LiveStreamEvent[]> {
  const { data } = await api.get<{ data: LiveStreamEvent[] }>('/admin/live-stream', {
    params: { hours, limit },
  });
  return data.data;
}

// ── Moderation Queue ──────────────────────────────────────────────────────────

export async function fetchModerationQueue(
  page = 1, limit = 20, filter: 'pending' | 'resolved' | 'all' = 'pending',
): Promise<PaginatedResult<ModerationQueueItem>> {
  const { data } = await api.get<{ data: PaginatedResult<ModerationQueueItem> }>('/admin/moderation-queue', {
    params: { page, limit, filter },
  });
  return data.data;
}

export async function resolveModerationReport(
  id: string,
  action: 'resolve' | 'remove_dream' | 'warn_user' | 'ban_user',
  note?: string,
): Promise<void> {
  await api.post(`/admin/moderation-queue/${id}/resolve`, { action, note });
}

export async function dismissModerationReport(id: string): Promise<void> {
  await api.post(`/admin/moderation-queue/${id}/dismiss`);
}

// ── Platform Health ───────────────────────────────────────────────────────────

export async function fetchPlatformHealthLive(): Promise<PlatformHealthLive> {
  const { data } = await api.get<{ data: PlatformHealthLive }>('/admin/platform-health/live');
  return data.data;
}

export async function fetchPlatformHealthHistory(days = 30): Promise<Array<Record<string, unknown>>> {
  const { data } = await api.get<{ data: Array<Record<string, unknown>> }>('/admin/platform-health/history', {
    params: { days },
  });
  return data.data;
}

export async function savePlatformHealthSnapshot(): Promise<void> {
  await api.post('/admin/platform-health/snapshot');
}

// ── AI Signals ────────────────────────────────────────────────────────────────

export async function fetchAISignals(limit = 30): Promise<AISignal[]> {
  const { data } = await api.get<{ data: AISignal[] }>('/admin/ai-signals', { params: { limit } });
  return data.data;
}

export async function generateAISignals(): Promise<{ count: number }> {
  const { data } = await api.post<{ data: { count: number } }>('/admin/ai-signals/generate');
  return data.data;
}

// ── Admin Notification Queue ──────────────────────────────────────────────────

export async function fetchAdminNotificationQueue(limit = 30): Promise<{ items: AdminNotificationItem[]; unreadCount: number }> {
  const { data } = await api.get<{ data: { items: AdminNotificationItem[]; unreadCount: number } }>('/admin/notification-queue', {
    params: { limit },
  });
  return data.data;
}

export async function markAdminNotificationRead(id: string): Promise<void> {
  await api.post(`/admin/notification-queue/${id}/read`);
}

export async function markAllAdminNotificationsRead(): Promise<void> {
  await api.post('/admin/notification-queue/read-all');
}

// ── Dream Analysis ────────────────────────────────────────────────────────────

export async function triggerDreamAnalysis(dreamId: string): Promise<DreamAnalysisResult> {
  const { data } = await api.post<{ data: DreamAnalysisResult }>(`/admin/dream-analysis/${dreamId}/analyze`);
  return data.data;
}

export async function bulkDreamAnalysis(): Promise<{ processed: number }> {
  const { data } = await api.post<{ data: { processed: number } }>('/admin/dream-analysis/bulk');
  return data.data;
}

export async function fetchDreamAnalysis(dreamId: string): Promise<DreamAnalysisResult | null> {
  const { data } = await api.get<{ data: DreamAnalysisResult | null }>(`/admin/dream-analysis/${dreamId}`);
  return data.data;
}

export async function fetchPlatformAnalysisStats(): Promise<PlatformAnalysisStats> {
  const { data } = await api.get<{ data: PlatformAnalysisStats }>('/admin/dream-analysis-stats');
  return data.data;
}

// ── User Intelligence System ──────────────────────────────────────────────────

export async function fetchUserIntelligenceProfile(userId: string): Promise<UserIntelligenceProfile> {
  const { data } = await api.get<{ data: UserIntelligenceProfile }>(`/admin/users/${userId}/intelligence`);
  return data.data;
}

export async function fetchUserRiskProfile(userId: string): Promise<UserRiskProfile> {
  const { data } = await api.get<{ data: UserRiskProfile }>(`/admin/users/${userId}/risk-profile`);
  return data.data;
}

export async function fetchUserModerationHistory(userId: string): Promise<ModerationHistoryItem[]> {
  const { data } = await api.get<{ data: ModerationHistoryItem[] }>(`/admin/users/${userId}/moderation-history`);
  return data.data;
}

export async function fetchDreamCollectiveRelevance(dreamId: string): Promise<DreamCollectiveRelevance> {
  const { data } = await api.get<{ data: DreamCollectiveRelevance }>(`/admin/dreams/${dreamId}/collective-relevance`);
  return data.data;
}

export async function fetchEmotionalTrends(days = 28): Promise<EmotionalTrend[]> {
  const { data } = await api.get<{ data: EmotionalTrend[] }>(`/admin/intelligence/emotional-trends?days=${days}`);
  return data.data;
}

export async function fetchResonanceEvents(limit = 10): Promise<ResonanceEvent[]> {
  const { data } = await api.get<{ data: ResonanceEvent[] }>(`/admin/intelligence/resonance-events?limit=${limit}`);
  return data.data;
}

export async function fetchCollectiveIntelligenceSummary(): Promise<CollectiveIntelligenceSummary> {
  const { data } = await api.get<{ data: CollectiveIntelligenceSummary }>('/admin/intelligence/collective-summary');
  return data.data;
}

// ── Dream Connection Engine ───────────────────────────────────────────────────

export async function fetchDreamConnections(
  page = 1, limit = 30, minScore = 0,
): Promise<PaginatedResult<DreamConnection>> {
  const { data } = await api.get<{ data: PaginatedResult<DreamConnection> }>(
    `/admin/connections?page=${page}&limit=${limit}&minScore=${minScore}`,
  );
  return data.data;
}

export async function computeUserResonanceScores(): Promise<{ upserted: number }> {
  const { data } = await api.post<{ data: { upserted: number } }>('/admin/connections/compute-resonance');
  return data.data;
}

export async function fetchUserResonanceScores(
  page = 1, limit = 30,
): Promise<PaginatedResult<UserResonanceScore>> {
  const { data } = await api.get<{ data: PaginatedResult<UserResonanceScore> }>(
    `/admin/connections/user-resonance?page=${page}&limit=${limit}`,
  );
  return data.data;
}

export async function computeSeenInDreams(): Promise<{ upserted: number }> {
  const { data } = await api.post<{ data: { upserted: number } }>('/admin/connections/compute-seen');
  return data.data;
}

export async function fetchSeenInDreams(
  type?: string, limit = 50,
): Promise<SeenInDream[]> {
  const q = type ? `?type=${type}&limit=${limit}` : `?limit=${limit}`;
  const { data } = await api.get<{ data: SeenInDream[] }>(`/admin/connections/seen-in-dreams${q}`);
  return data.data;
}

export async function fetchConnectionFeed(limit = 40): Promise<ConnectionFeedEvent[]> {
  const { data } = await api.get<{ data: ConnectionFeedEvent[] }>(`/admin/connections/feed?limit=${limit}`);
  return data.data;
}

export async function fetchCollectiveSignals(days = 7): Promise<CollectiveSignals> {
  const { data } = await api.get<{ data: CollectiveSignals }>(`/admin/connections/collective-signals?days=${days}`);
  return data.data;
}

// ── Dream Event Engine (Phase 10) ─────────────────────────────────────────────

export interface LiveEvent {
  id: string;
  event_type: 'NEW_DREAM' | 'NEW_MATCH' | 'AI_SIGNAL' | 'NEW_CONNECTION';
  occurred_at: string;
  score_pct?: number;
  resonance_level?: string;
  category?: string;
  severity?: string;
  message?: string;
  dream_id?: string;
  user_id?: string;
  top_emotion?: string;
  top_symbol?: string;
  pattern_type?: string;
  pattern_value?: string;
}

export interface EventStats {
  total_dreams: number;
  total_matches: number;
  total_ai_events: number;
  active_users: number;
  window_hours: number;
}

export interface TimelineWeekEmotion { week: string; emotion: string; count: number }
export interface TimelineSymbol { week: string; manifestation: string; count: number }
export interface TimelineResonance { created_at: string; score_pct: number; resonance_level: string }
export interface TimelineFrequency { week: string; count: number }
export interface UserTimeline {
  emotionHistory: TimelineWeekEmotion[];
  symbolEvolution: TimelineSymbol[];
  resonanceHistory: TimelineResonance[];
  dreamFrequency: TimelineFrequency[];
  totals: { total_dreams: number; avg_dream_score: number; avg_resonance: number } | null;
}

export interface GraphNode {
  id: string;
  type: 'symbol' | 'emotion' | 'archetype' | 'theme' | 'place';
  label: string;
  color: string;
  weight?: number;
  isPrimary?: boolean;
  tone?: string;
}
export interface GraphConnection {
  id: string;
  score: number;
  resonance_level: string;
  other_user: string;
  other_title: string | null;
  shared_symbols: string[] | null;
  shared_emotions: string[] | null;
}
export interface DreamGraph {
  dreamId: string;
  nodes: GraphNode[];
  connections: GraphConnection[];
  summary: { symbolCount: number; emotionCount: number; archetypeCount: number; themeCount: number; placeCount: number; connectionCount: number };
}

export interface InsightCard { type: string; title: string; body: string; color: string }
export interface UserInsights {
  insights: InsightCard[];
  topEmotions: Array<{ emotion: string; count: number; avg_intensity: number }>;
  topSymbols: Array<{ manifestation: string; count: number }>;
  topArchetypes: Array<{ archetype: string; count: number }>;
  resonanceStats: { total: number; avgScore: number; peakScore: number };
  dreamStats: { totalDreams: number; avgDreamScore: number; avgResonance: number };
  generatedAt: string;
}

export async function fetchLiveEvents(hours = 24, limit = 60): Promise<LiveEvent[]> {
  const { data } = await api.get<{ data: LiveEvent[] }>(`/admin/engine/events?hours=${hours}&limit=${limit}`);
  return data.data;
}

export async function fetchEventStats(hours = 24): Promise<EventStats> {
  const { data } = await api.get<{ data: EventStats }>(`/admin/engine/events/stats?hours=${hours}`);
  return data.data;
}

export async function fetchUserTimeline(userId: string): Promise<UserTimeline> {
  const { data } = await api.get<{ data: UserTimeline }>(`/admin/engine/users/${userId}/timeline`);
  return data.data;
}

export async function fetchDreamGraph(dreamId: string): Promise<DreamGraph> {
  const { data } = await api.get<{ data: DreamGraph }>(`/admin/engine/dreams/${dreamId}/graph`);
  return data.data;
}

export async function fetchUserInsights(userId: string): Promise<UserInsights> {
  const { data } = await api.get<{ data: UserInsights }>(`/admin/engine/users/${userId}/insights`);
  return data.data;
}

// ── Dream Operating System (Phase 4) ─────────────────────────────────────────

export type OsRuleType   = 'event' | 'threshold' | 'scheduled';
export type OsRuleStatus = 'active' | 'paused' | 'disabled';
export type OsJobStatus  = 'idle' | 'running' | 'failed' | 'completed';

export interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: OsRuleType;
  status: OsRuleStatus;
  trigger_event: string | null;
  trigger_threshold: number | null;
  trigger_metric: string | null;
  trigger_cron: string | null;
  action_type: string;
  action_config: Record<string, unknown>;
  last_fired_at: string | null;
  fire_count: number;
  created_at: string;
}

export interface CreateAutomationRulePayload {
  name: string;
  description?: string;
  rule_type: OsRuleType;
  trigger_event?: string;
  trigger_threshold?: number;
  trigger_metric?: string;
  trigger_cron?: string;
  action_type: string;
  action_config?: Record<string, unknown>;
}

export interface ScenarioCondition { field: string; operator: string; value: unknown }
export interface ScenarioAction    { type: string; config: Record<string, unknown> }

export interface ScenarioRule {
  id: string;
  name: string;
  description: string | null;
  status: OsRuleStatus;
  if_conditions: ScenarioCondition[];
  then_actions: ScenarioAction[];
  chain_next_id: string | null;
  chain_next_name: string | null;
  last_triggered_at: string | null;
  trigger_count: number;
  created_at: string;
}

export interface CreateScenarioPayload {
  name: string;
  description?: string;
  if_conditions: ScenarioCondition[];
  then_actions: ScenarioAction[];
  chain_next_id?: string;
}

export interface OsAlert {
  id: string;
  alert_level: 'CRITICAL' | 'WARNING' | 'INTELLIGENCE' | 'SYSTEM';
  category: string;
  message: string;
  detail: string | null;
  severity: string | null;
  occurred_at: string;
  read_at?: string | null;
}

export interface AlertCenterData {
  critical: OsAlert[];
  warnings: OsAlert[];
  intelligence: OsAlert[];
  system: OsAlert[];
  counts: { critical: number; warnings: number; intelligence: number; system: number; total: number };
  fetchedAt: string;
}

export interface MoodTrendPoint  { week: string; emotion: string; cnt: number }
export interface TrendSymbol     { manifestation: string; current_count: number; prior_count: number; growth: number }
export interface AnomalyDay      { day: string; cnt: number; deviation: number; anomaly_type: 'spike' | 'drop' | 'normal' }
export interface CollectiveChange{ emotion: string; current: number; prior: number; delta: number; pct_change: number | null }
export interface ResonanceTrendPoint { week: string; matches: number; avg_score: number; cosmic_count: number }

export interface AIObserverData {
  moodTrend:        MoodTrendPoint[];
  trendDetection:   TrendSymbol[];
  anomalies:        AnomalyDay[];
  collectiveChanges:CollectiveChange[];
  resonanceTrend:   ResonanceTrendPoint[];
  analyzedAt:       string;
}

export interface SchedulerJob {
  id: string;
  name: string;
  description: string | null;
  cron_expr: string;
  job_type: string;
  status: OsJobStatus;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  last_result: string | null;
  run_count: number;
  error_count: number;
  avg_duration_ms: number | null;
}

// Automation Rules API

export async function fetchAutomationRules(): Promise<AutomationRule[]> {
  const { data } = await api.get<{ data: AutomationRule[] }>('/admin/os/automation');
  return data.data;
}

export async function createAutomationRule(payload: CreateAutomationRulePayload): Promise<AutomationRule> {
  const { data } = await api.post<{ data: AutomationRule }>('/admin/os/automation', payload);
  return data.data;
}

export async function toggleAutomationRule(id: string): Promise<{ id: string; name: string; status: OsRuleStatus }> {
  const { data } = await api.patch<{ data: { id: string; name: string; status: OsRuleStatus } }>(`/admin/os/automation/${id}/toggle`);
  return data.data;
}

export async function deleteAutomationRule(id: string): Promise<{ deleted: boolean }> {
  const { data } = await api.delete<{ data: { deleted: boolean } }>(`/admin/os/automation/${id}`);
  return data.data;
}

// Scenario Engine API

export async function fetchScenarios(): Promise<ScenarioRule[]> {
  const { data } = await api.get<{ data: ScenarioRule[] }>('/admin/os/scenarios');
  return data.data;
}

export async function createScenario(payload: CreateScenarioPayload): Promise<ScenarioRule> {
  const { data } = await api.post<{ data: ScenarioRule }>('/admin/os/scenarios', payload);
  return data.data;
}

export async function toggleScenario(id: string): Promise<{ id: string; name: string; status: OsRuleStatus }> {
  const { data } = await api.patch<{ data: { id: string; name: string; status: OsRuleStatus } }>(`/admin/os/scenarios/${id}/toggle`);
  return data.data;
}

export async function deleteScenario(id: string): Promise<{ deleted: boolean }> {
  const { data } = await api.delete<{ data: { deleted: boolean } }>(`/admin/os/scenarios/${id}`);
  return data.data;
}

// Alert Center API

export async function fetchAlerts(hours = 48): Promise<AlertCenterData> {
  const { data } = await api.get<{ data: AlertCenterData }>(`/admin/os/alerts?hours=${hours}`);
  return data.data;
}

// AI Observer API

export async function fetchAIObserver(days = 30): Promise<AIObserverData> {
  const { data } = await api.get<{ data: AIObserverData }>(`/admin/os/observer?days=${days}`);
  return data.data;
}

// Scheduler API

export async function fetchSchedulerJobs(): Promise<SchedulerJob[]> {
  const { data } = await api.get<{ data: SchedulerJob[] }>('/admin/os/scheduler');
  return data.data;
}

export async function triggerSchedulerJob(name: string): Promise<{ ok: boolean; job: string; result?: string; durationMs?: number }> {
  const { data } = await api.post<{ data: { ok: boolean; job: string; result?: string; durationMs?: number } }>(`/admin/os/scheduler/${name}/trigger`);
  return data.data;
}

export async function toggleSchedulerJob(id: string): Promise<{ id: string; name: string; enabled: boolean }> {
  const { data } = await api.patch<{ data: { id: string; name: string; enabled: boolean } }>(`/admin/os/scheduler/${id}/toggle`);
  return data.data;
}

// ── World Model (Phase 5) ─────────────────────────────────────────────────────

export type ClimateState = 'TURBULENT' | 'TENSE' | 'RADIANT' | 'BALANCED' | 'NEUTRAL';

export interface EmotionClimate {
  emotion: string; count: number; pct: number; avg_intensity: number;
}
export interface EmotionalPressure {
  total_signals: number; negative_count: number; high_intensity_count: number;
  pressure_pct: number; positivity_pct: number;
}
export interface MoodForecastPoint { week: string; emotion: string; cnt: number }
export interface IntensityBand     { intensity: string; count: number; pct: number }

export interface WorldWeatherData {
  climate: EmotionClimate[];
  pressure: EmotionalPressure | null;
  pressureScore: number;
  positivityScore: number;
  climateState: ClimateState;
  forecast: MoodForecastPoint[];
  intensityDist: IntensityBand[];
  analyzedAt: string;
}

export interface SymbolTrend {
  manifestation: string; current_count: number; prior_count: number;
  delta: number; growth_pct: number; trend: 'rising' | 'falling';
}
export interface EmergingSymbol  { manifestation: string; count: number; avg_confidence: number }
export interface ConsistentSymbol{ manifestation: string; current_count: number; prior_count: number; abs_delta: number }
export interface SymbolTotals    { unique_symbols: number; total_appearances: number; avg_confidence: number }

export interface SymbolEconomyData {
  rising: SymbolTrend[];
  falling: SymbolTrend[];
  emerging: EmergingSymbol[];
  consistent: ConsistentSymbol[];
  totals: SymbolTotals | null;
  fetchedAt: string;
}

export interface DominantArchetype {
  archetype: string; activations: number; pct: number; avg_confidence: number; unique_dreamers: number;
}
export interface ArchetypeWeekPoint   { week: string; archetype: string; count: number }
export interface ArchetypeChange      { archetype: string; current_count: number; prior_count: number; delta: number; pct_change: number }
export interface ArchetypeEmotionPair { archetype: string; emotion: string; co_occurrences: number }

export interface ArchetypeDynamicsData {
  dominant: DominantArchetype[];
  weeklyTrend: ArchetypeWeekPoint[];
  activationChanges: ArchetypeChange[];
  archetypeEmotionMap: ArchetypeEmotionPair[];
  analyzedAt: string;
}

export type ConsciousnessState = 'AWAKENED' | 'RESONANT' | 'FORMING' | 'DORMANT';

export interface ConsciousnessIndexData {
  awarenessScore: number;
  coherenceScore: number;
  stabilityScore: number;
  overallIndex: number;
  indexState: ConsciousnessState;
  resonanceStats: Record<string, unknown> | null;
  emotionCoherence: Record<string, unknown> | null;
  stabilityMetrics: Record<string, unknown> | null;
  activityMetrics: Record<string, unknown> | null;
  platformStats: Record<string, unknown> | null;
  computedAt: string;
}

export interface MonthlyEra        { month: string; emotion: string; dominance_pct: number; total_signals: number }
export interface TransitionPhase   { week: string; from_emotion: string; to_emotion: string; is_transition: boolean }
export interface QuarterlyProfile  { quarter: string; season_emotion: string; season_archetype: string | null; emotion_count: number }
export interface CurrentSeasonItem { emotion: string; count: number; pct: number }

export interface DreamSeasonsData {
  monthlyEras: MonthlyEra[];
  transitions: TransitionPhase[];
  quarterlyProfile: QuarterlyProfile[];
  currentSeason: CurrentSeasonItem[];
  seasonName: string;
  computedAt: string;
}

export async function fetchWorldWeather(days = 7): Promise<WorldWeatherData> {
  const { data } = await api.get<{ data: WorldWeatherData }>(`/admin/world/weather?days=${days}`);
  return data.data;
}

export async function fetchSymbolEconomy(): Promise<SymbolEconomyData> {
  const { data } = await api.get<{ data: SymbolEconomyData }>('/admin/world/symbols');
  return data.data;
}

export async function fetchArchetypeDynamics(weeks = 8): Promise<ArchetypeDynamicsData> {
  const { data } = await api.get<{ data: ArchetypeDynamicsData }>(`/admin/world/archetypes?weeks=${weeks}`);
  return data.data;
}

export async function fetchConsciousnessIndex(): Promise<ConsciousnessIndexData> {
  const { data } = await api.get<{ data: ConsciousnessIndexData }>('/admin/world/consciousness');
  return data.data;
}

export async function fetchDreamSeasons(): Promise<DreamSeasonsData> {
  const { data } = await api.get<{ data: DreamSeasonsData }>('/admin/world/seasons');
  return data.data;
}

// ── Business — Revenue & Growth ───────────────────────────────────────────────

export interface RevenueUserStats {
  total_users: number; active_users: number;
  new_30d: number; new_7d: number; dau_7d: number; mau_30d: number;
}
export interface RevenueDreamStats {
  total_dreams: number; dreams_30d: number; dreamers_total: number; avg_per_user: number;
}
export interface RevenueEngagementStats {
  users_with_likes: number; total_interactions: number;
  avg_interactions_per_dream: number; viral_dreams: number;
}
export interface GrowthWeekPoint { week: string; dreams: number }
export interface TopEngager      { username: string; dream_count: number; likes_received: number }
export interface RevenuePlaceholder {
  mrr: null; arr: null; arpu: null;
  premiumUsers: number; premiumConversionPct: number;
  adRevenue: null; totalRevenue: null; paymentStatus: string;
}
export interface RevenueDashboardData {
  userStats:       RevenueUserStats | null;
  dreamStats:      RevenueDreamStats | null;
  engagementStats: RevenueEngagementStats | null;
  growthTrend:     GrowthWeekPoint[];
  topEngagers:     TopEngager[];
  revenue:         RevenuePlaceholder;
  computedAt:      string;
}

export interface BehaviorSegment {
  id: string; label: string; color: string; icon: string;
  count: number; pct: number; description: string; badge: string;
  avgDreams?: string | number;
}
export interface ArchetypeSegment {
  archetype: string; user_count: number; activation_count: number; avg_confidence: number;
}
export interface EmotionSegment { emotion: string; user_count: number }
export interface UserSegmentsData {
  totalUsers:       number;
  behaviorSegments: BehaviorSegment[];
  archetypeSegments: ArchetypeSegment[];
  emotionSegments:  EmotionSegment[];
  computedAt:       string;
}

export interface PlacementZone {
  id: string; label: string; status: string; reach: string;
}
export interface PlatformContext {
  addressable_audience: number; total_dreams_30d: number; emotion_variety: number;
}
export interface CampaignsData {
  campaigns:        unknown[];
  campaignStatus:   string;
  platformContext:  PlatformContext | null;
  placementZones:   PlacementZone[];
  computedAt:       string;
}

export interface AdPlacement {
  id: string; label: string; format: string; status: string;
  safeContent: boolean; estimatedCTR: null; description: string;
}
export interface AdSafetyCheck { label: string; status: string; detail: string }
export interface AudienceReach { total: number; monthly: number; weekly: number }
export interface AdvertisingData {
  adStatus:      string;
  safetyStatus:  string;
  audienceReach: AudienceReach;
  placements:    AdPlacement[];
  safetyChecks:  AdSafetyCheck[];
  metrics:       { impressions: null; clicks: null; ctr: null; revenue: null };
  computedAt:    string;
}

export async function fetchRevenueDashboard(): Promise<RevenueDashboardData> {
  const { data } = await api.get<{ data: RevenueDashboardData }>('/admin/business/revenue');
  return data.data;
}

export async function fetchUserSegments(): Promise<UserSegmentsData> {
  const { data } = await api.get<{ data: UserSegmentsData }>('/admin/business/segments');
  return data.data;
}

export async function fetchCampaigns(): Promise<CampaignsData> {
  const { data } = await api.get<{ data: CampaignsData }>('/admin/business/campaigns');
  return data.data;
}

export async function fetchAdvertising(): Promise<AdvertisingData> {
  const { data } = await api.get<{ data: AdvertisingData }>('/admin/business/ads');
  return data.data;
}
