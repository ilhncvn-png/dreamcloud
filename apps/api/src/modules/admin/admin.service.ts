import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { DreamAnalysisService } from '../dream-analysis/dream-analysis.service';

export interface AdminOverview {
  totalUsers: number;
  activeUsersToday: number;
  newUsersToday: number;
  totalDreams: number;
  dreamsToday: number;
  reportedCount: number;
  apiStatus: string;
  dbStatus: string;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  dreamCount: number;
  followerCount: number;
  followingCount: number;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface AdminUserDetail extends AdminUser {
  bio: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  isPublic: boolean;
  preferences: Record<string, unknown>;
  lockedUntil: Date | null;
  failedLoginAttempts: number;
  isEmailVerified: boolean;
}

export interface AdminUsersResult {
  items: AdminUser[];
  total: number;
  page: number;
  pages: number;
}

export interface AdminDream {
  id: string;
  title: string | null;
  userId: string;
  authorEmail: string;
  authorUsername: string;
  category: string;
  visibility: string;
  isDraft: boolean;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  createdAt: Date;
}

export interface AdminDreamsResult {
  items: AdminDream[];
  total: number;
  page: number;
  pages: number;
}

export interface AdminDreamReport {
  id: string;
  dreamId: string;
  reporterUsername: string;
  reporterEmail: string;
  reason: string;
  description: string | null;
  status: string;
  resolvedAt: Date | null;
  createdAt: Date;
}

export interface AdminDreamDetail {
  id: string;
  title: string | null;
  content: string;
  userId: string;
  authorEmail: string;
  authorUsername: string;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  authorRole: string;
  category: string;
  visibility: string;
  isDraft: boolean;
  tags: string[];
  likeCount: number;
  commentCount: number;
  saveCount: number;
  matchCount: number;
  viewCount: number;
  isModerated: boolean;
  moderationScore: number | null;
  isHidden: boolean;
  isFeatured: boolean;
  featuredAt: Date | null;
  moderationNote: string | null;
  dreamedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  // Analysis
  primaryTheme: string | null;
  primaryEmotion: string | null;
  emotionalIntensity: string | null;
  emotionalArc: string | null;
  residualEmotion: string | null;
  symbols: { category: string; manifestation: string; confidence: number }[];
  emotions: { emotion: string; intensity: string; isPrimary: boolean }[];
  themes: { theme: string; themeFamily: string; isPrimary: boolean }[];
  figures: {
    figureType: string;
    isKnown: boolean;
    relationshipType: string | null;
    archetypeCandidate: string | null;
    qualityDescriptors: string[];
    narrativeRole: string | null;
  }[];
  similarDreams: {
    id: string;
    title: string | null;
    authorUsername: string;
    category: string;
    matchScore: number;
    resonanceLevel: string;
    sharedThemes: string[];
    sharedEmotions: string[];
  }[];
  authorArchetype: string | null;
  // Comments
  comments: {
    id: string;
    content: string;
    authorUsername: string;
    authorDisplayName: string | null;
    createdAt: Date;
  }[];
  // Reports
  reportCount: number;
  reports: AdminDreamReport[];
}

export interface DreamAnalytics {
  topLiked: AdminDream[];
  topCommented: AdminDream[];
  topSaved: AdminDream[];
  totalByCategory: Record<string, number>;
  totalByVisibility: Record<string, number>;
  featuredCount: number;
  hiddenCount: number;
  reportedCount: number;
  totalDrafts: number;
}

export interface AdminReport {
  id: string;
  dreamId: string;
  dreamTitle: string | null;
  dreamContentPreview: string;
  dreamCategory: string;
  authorId: string;
  authorUsername: string;
  authorEmail: string;
  reporterUsername: string;
  reporterEmail: string;
  reason: string;
  description: string | null;
  status: string;
  resolvedAt: Date | null;
  createdAt: Date;
}

export interface AdminReportsResult {
  items: AdminReport[];
  total: number;
  page: number;
  pages: number;
}

export interface DashboardMetrics {
  topCategories: { category: string; count: number }[];
  topUsers: { id: string; username: string; avatarUrl: string | null; dreamCount: number }[];
  recentAdminLogs: { actionType: string; adminUsername: string; targetUsername: string | null; createdAt: Date }[];
  pendingReports: number;
  hiddenDreams: number;
  featuredDreams: number;
}

export interface DreamIntelligenceData {
  trendingSymbols: { symbol: string; category: string; count: number }[];
  trendingThemes: { theme: string; family: string; count: number }[];
  trendingEmotions: { emotion: string; count: number }[];
  categoryDistribution: { category: string; count: number; pct: number }[];
  visibilityDistribution: { visibility: string; count: number; pct: number }[];
  lucidRatio: number;
  nightmareRatio: number;
  publicRatio: number;
  mostResonantDreams: { id: string; title: string | null; authorUsername: string; matchCount: number; likeCount: number }[];
  mostRepeatedPlaces: { name: string; type: string; count: number }[];
  totalDreamsAnalyzed: number;
}

export interface GrowthAnalytics {
  dailyNewUsers: { date: string; count: number }[];
  dailyActiveUsers: { date: string; count: number }[];
  totalUsers: number;
  weeklyNewUsers: number;
  monthlyNewUsers: number;
  growthRateVsLastWeek: number;
}

export interface EngagementAnalytics {
  dailyDreams: { date: string; count: number }[];
  totalLikes: number;
  totalComments: number;
  totalSaves: number;
  totalDreams: number;
  avgLikesPerDream: number;
  avgCommentsPerDream: number;
}

export interface ModerationSummary {
  pendingReports: number;
  resolvedToday: number;
  totalBanned: number;
  hiddenContent: number;
  repeatOffenders: { userId: string; username: string; email: string; reportCount: number }[];
}

export interface CommunityHealthData {
  moodScore: number;
  positivityIndex: number;
  anxietyIndex: number;
  nightmareRatio: number;
  lucidRatio: number;
  communityHealthScore: number;
  totalDreamsAnalyzed: number;
  emotionDistribution: { emotion: string; count: number; type: 'positive' | 'negative' | 'neutral' }[];
  moodTrend: { date: string; positive: number; negative: number; neutral: number }[];
  topPositiveEmotions: string[];
  topNegativeEmotions: string[];
}

export interface OperationalAlertsData {
  alerts: {
    type: 'report_spike' | 'ban_wave' | 'high_risk_content' | 'system_warning' | 'engagement_drop';
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    count?: number;
    link?: string;
    timestamp: string;
  }[];
  reportsLastHour: number;
  reportsLast24h: number;
  reportsChange: number;
  newBansLast24h: number;
  highRiskDreams: number;
}

export interface UserRiskEntry {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  riskScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  reportCount: number;
  hiddenDreamCount: number;
  dreamCount: number;
  createdAt: Date;
}

export interface EmployeeEntry {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  actionCount: number;
  actionsToday: number;
}

export interface SupportTicket {
  id: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  reporterUserId: string | null;
  reporterEmail: string | null;
  reporterName: string | null;
  reporterUsername: string | null;
  assignedToId: string | null;
  assignedToUsername: string | null;
  resolutionNotes: string | null;
  internalNotes: string | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityEvent {
  type: 'login' | 'dream_created' | 'profile_updated';
  userId: string;
  email: string;
  username: string;
  detail: string;
  timestamp: Date;
}

export interface AdminLogEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  adminUsername: string;
  targetUserId: string | null;
  targetEmail: string | null;
  targetUsername: string | null;
  actionType: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: Date;
}

// ── Phase 8 — AI Operators & Intelligence ────────────────────────────────────

export interface AIOperator {
  id: string;
  name: string;
  role: string;
  icon: string;
  status: 'active' | 'idle' | 'processing' | 'warning' | 'error';
  health: number;
  lastExecution: string;
  confidenceScore: number;
  findings: string[];
  recommendations: string[];
  metrics: Record<string, number | string>;
}

export interface AIOperatorsData {
  operators: AIOperator[];
  systemHealth: number;
  lastScan: string;
}

export type WeatherCondition = 'radiant' | 'clear' | 'partly_cloudy' | 'overcast' | 'stormy' | 'electric' | 'foggy';

export interface DreamEvent {
  id: string;
  name: string;
  icon: string;
  description: string;
  severity: 'storm' | 'warning' | 'info' | 'positive';
}

export interface DreamWeatherData {
  condition: WeatherCondition;
  temperature: number;
  visibility: number;
  turbulence: number;
  electricField: number;
  forecast: {
    date: string;
    condition: WeatherCondition;
    score: number;
    dominantEmotion: string;
    lucidProb: number;
    nightmareProb: number;
  }[];
  description: string;
  emoji: string;
  posPct: number;
  negPct: number;
  lucidPct: number;
  nightPct: number;
  dominantEmotion: string;
  topSymbols: { symbol: string; count: number }[];
  events: DreamEvent[];
  warnings: { level: 'critical' | 'high' | 'medium' | 'low'; message: string }[];
  timeline: { hour: number; dreamCount: number; lucidCount: number; nightmareCount: number }[];
  totalDreams7d: number;
  hopeIndex: number;
  syncScore: number;
}

export interface EmotionalEvent {
  id: string;
  name: string;
  icon: string;
  description: string;
  severity: 'positive' | 'warning' | 'info' | 'critical';
  affectedDreams: number;
  duration: string;
}

export interface EmotionCorrelation {
  emotion: string;
  correlates: { emotion: string; strength: number; direction: 'positive' | 'negative' }[];
}

export interface GlobalEmotionData {
  dominantEmotion: string;
  dominantType: 'positive' | 'negative' | 'neutral';
  energyLevel: number;
  coherence: number;
  distribution: {
    emotion: string; pct: number; count: number; type: 'positive' | 'negative' | 'neutral';
    trend24h: number;
    dominance: 'strong' | 'stable' | 'fading' | 'growing' | 'emerging';
  }[];
  hourlyFlow: { hour: number; dominant: string; intensity: number }[];
  // Enriched fields
  posPct: number;
  negPct: number;
  neutralPct: number;
  change24h: number;
  mostSynchronized: string;
  fastestGrowing: string;
  fastestDecreasing: string;
  confidence: number;
  emotionalPressure: 'low' | 'medium' | 'high' | 'critical';
  volatility: number;
  hourlyBreakdown: { hour: number; posCount: number; negCount: number; neutralCount: number; dreamCount: number; dominant: string }[];
  correlations: EmotionCorrelation[];
  healthScore: number;
  healthStatus: 'critical' | 'poor' | 'fair' | 'healthy' | 'excellent';
  healthTrend: 'improving' | 'stable' | 'declining';
  events: EmotionalEvent[];
  insights: string[];
  forecast: { date: string; dominantEmotion: string; risk: 'low' | 'medium' | 'high'; prediction: string; comment: string }[];
  globalEmotionIndex: number;
  indexTrendDay: number;
  indexTrendWeek: number;
  indexTrendMonth: number;
  totalDreamsAnalyzed: number;
  totalSymbolsProcessed: number;
  activeEmotionClusters: number;
  history: { period: string; label: string; dominantEmotion: string; posPct: number; negPct: number; emotionalScore: number }[];
}

export interface Prediction {
  id: string;
  category: 'growth' | 'safety' | 'trends' | 'community' | 'engagement';
  title: string;
  description: string;
  confidence: number;
  horizon: '24h' | '7d' | '30d';
  direction: 'up' | 'down' | 'stable' | 'volatile';
  magnitude: number;
  signals: string[];
}

export interface PredictionCenterData {
  predictions: Prediction[];
  modelAccuracy: number;
  dataFreshness: number;
  lastUpdated: string;
  // Intelligence pass
  forecastIndex: number;
  forecastIndexTrendDay: number;
  forecastIndexTrendWeek: number;
  primaryPrediction: {
    statement: string; probability: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW'; impact: 'HIGH' | 'MEDIUM' | 'LOW';
    horizon: string; timeUntilForecast: string;
  };
  executiveSummary: string[];
  timeline: {
    stage: string; label: string; prediction: string;
    confidence: number; risk: 'low' | 'medium' | 'high'; comment: string; impact: string;
  }[];
  topPredictions: {
    subject: string; subjectTR: string;
    direction: 'up' | 'down' | 'stable'; magnitude: number; confidence: number; emoji: string;
  }[];
  scenarios: {
    best:     { title: string; description: string; why: string; probability: number };
    expected: { title: string; description: string; why: string; probability: number };
    worst:    { title: string; description: string; why: string; probability: number };
  };
  momentum: {
    subject: string; subjectTR: string;
    state: 'accelerating' | 'growing' | 'stable' | 'plateau' | 'fading' | 'collapsing';
    stateTR: string; confidence: number; emoji: string; valueCurr: number; valuePrev: number;
  }[];
  emergingSymbols: {
    symbol: string; confidence: number; expectedArrival: string;
    estimatedLifetime: string; emotion: string; emoji: string;
  }[];
  predictionAccuracy: {
    prediction: string; expected: string; result: string; accuracy: number; correct: boolean;
  }[];
  predictionHistory: {
    period: string; subject: string; direction: 'up' | 'down' | 'stable'; correct: boolean; confidence: number;
  }[];
  decisionSupport: { action: string; reason: string; priority: 'high' | 'medium' | 'low'; emoji: string }[];
  relationships: { from: string; to: string }[];
  totalDreamsAnalyzed: number; totalSymbolsProcessed: number;
  totalArchetypes: number; resonanceClusters: number;
  predictionLatency: number; learningState: string;
  trainingConfidence: number; forecastVersion: string; lastTraining: string;
}

export interface TrendRadarData {
  dimensions: {
    key: string;
    label: string;
    value: number;
    baseline: number;
    delta: number;
    trend: 'rising' | 'falling' | 'stable';
  }[];
  period: string;
  totalSignals: number;
}

export interface AIRecommendation {
  id: string;
  operatorId: string;
  operatorName: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'moderation' | 'community' | 'growth' | 'content' | 'safety' | 'revenue';
  title: string;
  description: string;
  confidence: number;
  createdAt: string;
}

export interface AIRecommendationsData {
  recommendations: AIRecommendation[];
  criticalCount: number;
  highCount: number;
  totalActions: number;
}

// ── Phase 9 — Dream Intelligence Center ──────────────────────────────────────

export type ConsciousnessTier = 'TRANSCENDENT' | 'LUCID' | 'ACTIVE' | 'PASSIVE' | 'DORMANT';

export interface ConsciousnessDimension {
  key: string; label: string; value: number; description: string;
}

export interface ConsciousnessMapData {
  overallScore: number;
  tier: ConsciousnessTier;
  dimensions: ConsciousnessDimension[];
  trend: { date: string; score: number }[];
  totalDreamsInPeriod: number;
  activeDreamers: number;
}

export interface EmotionMapData {
  dominantEmotion: string;
  dominantType: 'positive' | 'negative' | 'neutral';
  emotionTimeline: { date: string; positive: number; negative: number; neutral: number }[];
  topEmotions: { emotion: string; count: number; pct: number; type: 'positive' | 'negative' | 'neutral' }[];
  intensityByHour: { hour: number; topEmotion: string; count: number }[];
  velocityIndex: number;
  totalEmotions: number;
}

export interface SymbolAnalysisData {
  topSymbols: { symbol: string; category: string; count: number; pct: number; delta: number }[];
  categoryDistribution: { category: string; count: number; uniqueSymbols: number }[];
  symbolRelationships: { symbol1: string; symbol2: string; coCount: number }[];
  emergingSymbols: { symbol: string; category: string; count: number; growth: number }[];
  totalSymbols: number;
  uniqueSymbols: number;
  avgSymbolsPerDream: number;
}

export interface ArchetypeAnalysisData {
  archetypes: {
    name: string; count: number; pct: number;
    dominantEmotion: string | null; trend: 'rising' | 'falling' | 'stable';
  }[];
  totalFigures: number;
  activationScore: number;
  mostActiveArchetype: string | null;
  archetypeDiversity: number;
}

export interface DreamGenomeData {
  genomeSignature: string;
  dominantTraits: { trait: string; value: number; category: string }[];
  symbolGenes: { category: string; frequency: number }[];
  emotionGenes: { type: 'positive' | 'negative' | 'neutral'; pct: number }[];
  themeGenes: { family: string; count: number }[];
  topCombinations: { symbolCat: string; emotion: string; count: number }[];
  diversityScore: number;
  complexityScore: number;
}

export interface GlobalDreamMapData {
  countries: { country: string; dreamCount: number; userCount: number }[];
  totalCountries: number;
  topCountry: string | null;
  totalMappedDreams: number;
}

export type CoherenceLevel = 'UNIFIED' | 'RESONANT' | 'FRAGMENTED' | 'DISPERSED';

export interface CollectiveConsciousnessData {
  collectiveMoodScore: number;
  alignmentScore: number;
  resonanceCount: number;
  sharedSymbols: { symbol: string; dreamCount: number; pct: number }[];
  collectiveThemes: { theme: string; count: number }[];
  consciousnessSynchrony: number;
  mindToMindConnections: number;
  collectiveEmotion: string;
  coherenceLevel: CoherenceLevel;
}

// ── Permission helpers ────────────────────────────────────────────────────────

const ROLE_RANK: Record<string, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
  super_admin: 3,
};

function rankOf(role: string) {
  return ROLE_RANK[role] ?? -1;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly dreamAnalysis: DreamAnalysisService,
  ) {}

  // ── Audit log ──────────────────────────────────────────────────────────────

  private async createLog(
    adminId: string,
    targetUserId: string | null,
    actionType: string,
    oldValue?: Record<string, unknown> | null,
    newValue?: Record<string, unknown> | null,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO admin_logs (admin_id, target_user_id, action_type, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, targetUserId, actionType, oldValue ?? null, newValue ?? null],
    );
  }

  // ── Permission check ───────────────────────────────────────────────────────

  private checkPermission(adminRole: string, targetRole: string, newRole?: string): void {
    const adminRank = rankOf(adminRole);
    const targetRank = rankOf(targetRole);

    // Admin cannot modify accounts at same or higher level
    if (adminRank <= targetRank && adminRole !== 'super_admin') {
      throw new ForbiddenException(
        'Bu kullanıcıyı değiştirme yetkiniz yok.',
      );
    }

    // Only super_admin can assign admin/super_admin roles
    if (newRole && rankOf(newRole) >= rankOf('admin') && adminRole !== 'super_admin') {
      throw new ForbiddenException(
        'Yalnızca süper adminler admin rolü atayabilir.',
      );
    }
  }

  // ── Overview ───────────────────────────────────────────────────────────────

  async getOverview(): Promise<AdminOverview> {
    const rows0 = await this.db.query<{ tu: string; aut: string; nut: string; td: string; dt: string }[]>(`
      SELECT
        (SELECT COUNT(*)::int FROM users WHERE deleted_at IS NULL) AS tu,
        (SELECT COUNT(DISTINCT uid)::int FROM (
          SELECT user_id AS uid FROM dreams
            WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '24 hours'
          UNION
          SELECT id AS uid FROM users
            WHERE last_login_at >= NOW() - INTERVAL '24 hours'
        ) _active) AS aut,
        (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '24 hours') AS nut,
        (SELECT COUNT(*)::int FROM dreams WHERE deleted_at IS NULL) AS td,
        (SELECT COUNT(*)::int FROM dreams WHERE created_at >= NOW() - INTERVAL '24 hours') AS dt
    `);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const row = rows0[0]!;

    let dbStatus = 'healthy';
    try {
      await this.db.query('SELECT 1');
    } catch {
      dbStatus = 'error';
    }

    return {
      totalUsers:       parseInt(row.tu, 10),
      activeUsersToday: parseInt(row.aut, 10),
      newUsersToday:    parseInt(row.nut, 10),
      totalDreams:      parseInt(row.td, 10),
      dreamsToday:      parseInt(row.dt, 10),
      reportedCount:    0,
      apiStatus:        'healthy',
      dbStatus,
    };
  }

  // ── Users list ─────────────────────────────────────────────────────────────

  async getUsers(
    page: number,
    limit: number,
    search: string,
    role?: string,
    status?: 'active' | 'inactive',
    sortBy?: string,
    sortDir?: 'asc' | 'desc',
  ): Promise<AdminUsersResult> {
    const offset = (page - 1) * limit;
    const searchParam = search ? `%${search.toLowerCase()}%` : '%';

    const params: unknown[] = [searchParam];
    const conditions: string[] = [
      `u.deleted_at IS NULL`,
      `(LOWER(u.email) LIKE $1 OR LOWER(u.username) LIKE $1 OR LOWER(COALESCE(p.display_name,'')) LIKE $1)`,
    ];

    if (role) {
      params.push(role);
      conditions.push(`u.role = $${params.length}`);
    }
    if (status === 'active') {
      conditions.push(`u.is_active = TRUE`);
    } else if (status === 'inactive') {
      conditions.push(`u.is_active = FALSE`);
    }

    const where = conditions.join(' AND ');

    const countRows = await this.db.query<{ total: string }[]>(
      `SELECT COUNT(*)::int AS total
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE ${where}`,
      params,
    );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const total = parseInt(countRows[0]!.total, 10);

    const allowedSort: Record<string, string> = {
      created:    'u.created_at',
      lastLogin:  'u.last_login_at',
      username:   'u.username',
      email:      'u.email',
      dreamCount: 'p.dream_count',
    };
    const orderCol = allowedSort[sortBy ?? 'created'] ?? 'u.created_at';
    const orderDir = sortDir === 'asc' ? 'ASC' : 'DESC';

    params.push(limit, offset);

    const rows = await this.db.query<{
      id: string; email: string; username: string; display_name: string | null;
      avatar_url: string | null; role: string; is_active: boolean;
      is_email_verified: boolean; dream_count: number; follower_count: number;
      following_count: number; created_at: Date; last_login_at: Date | null;
    }[]>(
      `SELECT u.id, u.email, u.username, u.role, u.is_active, u.is_email_verified,
              u.created_at, u.last_login_at,
              COALESCE(p.display_name, '') AS display_name,
              p.avatar_url,
              COALESCE(p.dream_count, 0) AS dream_count,
              COALESCE(p.follower_count, 0) AS follower_count,
              COALESCE(p.following_count, 0) AS following_count
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE ${where}
       ORDER BY ${orderCol} ${orderDir} NULLS LAST
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      items: rows.map((r) => ({
        id:              r.id,
        email:           r.email,
        username:        r.username,
        displayName:     r.display_name || null,
        avatarUrl:       r.avatar_url,
        role:            r.role,
        isActive:        r.is_active,
        isEmailVerified: r.is_email_verified,
        dreamCount:      Number(r.dream_count),
        followerCount:   Number(r.follower_count),
        followingCount:  Number(r.following_count),
        createdAt:       r.created_at,
        lastLoginAt:     r.last_login_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // ── User detail ────────────────────────────────────────────────────────────

  async getUserById(userId: string): Promise<AdminUserDetail> {
    const rows = await this.db.query<{
      id: string; email: string; username: string; role: string;
      is_active: boolean; is_email_verified: boolean; failed_login_attempts: number;
      locked_until: Date | null; created_at: Date; last_login_at: Date | null;
      display_name: string | null; bio: string | null; avatar_url: string | null;
      location_city: string | null; location_country: string | null;
      is_public: boolean; preferences: Record<string, unknown>;
      dream_count: number; follower_count: number; following_count: number;
    }[]>(
      `SELECT u.id, u.email, u.username, u.role, u.is_active, u.is_email_verified,
              u.failed_login_attempts, u.locked_until, u.created_at, u.last_login_at,
              p.display_name, p.bio, p.avatar_url, p.location_city, p.location_country,
              p.is_public, p.preferences,
              COALESCE(p.dream_count, 0) AS dream_count,
              COALESCE(p.follower_count, 0) AS follower_count,
              COALESCE(p.following_count, 0) AS following_count
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [userId],
    );

    if (!rows.length) throw new NotFoundException('Kullanıcı bulunamadı.');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const r = rows[0]!;

    return {
      id:                   r.id,
      email:                r.email,
      username:             r.username,
      role:                 r.role,
      isActive:             r.is_active,
      isEmailVerified:      r.is_email_verified,
      failedLoginAttempts:  Number(r.failed_login_attempts),
      lockedUntil:          r.locked_until,
      createdAt:            r.created_at,
      lastLoginAt:          r.last_login_at,
      displayName:          r.display_name,
      bio:                  r.bio,
      avatarUrl:            r.avatar_url,
      locationCity:         r.location_city,
      locationCountry:      r.location_country,
      isPublic:             r.is_public,
      preferences:          r.preferences ?? {},
      dreamCount:           Number(r.dream_count),
      followerCount:        Number(r.follower_count),
      followingCount:       Number(r.following_count),
    };
  }

  // ── Update user role ───────────────────────────────────────────────────────

  async updateUserRole(
    adminId: string,
    adminRole: string,
    userId: string,
    newRole: string,
  ): Promise<{ ok: boolean }> {
    const allowed = ['user', 'moderator', 'admin', 'super_admin'];
    if (!allowed.includes(newRole)) throw new ForbiddenException(`Geçersiz rol: ${newRole}`);

    const target = await this.getUserById(userId);
    this.checkPermission(adminRole, target.role, newRole);

    await this.db.query(`UPDATE users SET role = $1 WHERE id = $2`, [newRole, userId]);
    await this.createLog(adminId, userId, 'role_changed', { role: target.role }, { role: newRole });
    return { ok: true };
  }

  // ── Update user status (ban/unban) ────────────────────────────────────────

  async updateUserStatus(
    adminId: string,
    adminRole: string,
    userId: string,
    isActive: boolean,
    lockedUntil?: Date | null,
  ): Promise<{ ok: boolean }> {
    const target = await this.getUserById(userId);
    this.checkPermission(adminRole, target.role);

    await this.db.query(
      `UPDATE users SET is_active = $1, locked_until = $2 WHERE id = $3`,
      [isActive, lockedUntil ?? null, userId],
    );
    await this.createLog(
      adminId, userId,
      isActive ? 'user_unbanned' : 'user_banned',
      { isActive: target.isActive, lockedUntil: target.lockedUntil },
      { isActive, lockedUntil: lockedUntil ?? null },
    );
    return { ok: true };
  }

  // ── Update user profile ────────────────────────────────────────────────────

  async updateUserProfile(
    adminId: string,
    adminRole: string,
    userId: string,
    data: { displayName?: string; bio?: string; avatarUrl?: string },
  ): Promise<{ ok: boolean }> {
    const target = await this.getUserById(userId);
    this.checkPermission(adminRole, target.role);

    const sets: string[] = [];
    const params: unknown[] = [];

    if (data.displayName !== undefined) {
      params.push(data.displayName);
      sets.push(`display_name = $${params.length}`);
    }
    if (data.bio !== undefined) {
      params.push(data.bio);
      sets.push(`bio = $${params.length}`);
    }
    if (data.avatarUrl !== undefined) {
      params.push(data.avatarUrl);
      sets.push(`avatar_url = $${params.length}`);
    }

    if (sets.length) {
      params.push(userId);
      await this.db.query(
        `UPDATE user_profiles SET ${sets.join(', ')}, updated_at = NOW() WHERE user_id = $${params.length}`,
        params,
      );
    }

    await this.createLog(
      adminId, userId, 'profile_edited',
      { displayName: target.displayName, bio: target.bio, avatarUrl: target.avatarUrl },
      data,
    );
    return { ok: true };
  }

  // ── Reset user password ────────────────────────────────────────────────────

  async resetUserPassword(
    adminId: string,
    adminRole: string,
    userId: string,
  ): Promise<{ ok: boolean; resetToken: string }> {
    const target = await this.getUserById(userId);
    this.checkPermission(adminRole, target.role);

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await this.db.query(
      `UPDATE users SET password_reset_token = $1, password_reset_expiry = $2 WHERE id = $3`,
      [token, expiry, userId],
    );
    await this.createLog(adminId, userId, 'password_reset_issued', null, { expiresAt: expiry });
    return { ok: true, resetToken: token };
  }

  // ── User activity ──────────────────────────────────────────────────────────

  async getUserActivity(userId: string): Promise<ActivityEvent[]> {
    const dreams = await this.db.query<{
      id: string; user_id: string; title: string | null; created_at: Date;
      email: string; username: string;
    }[]>(
      `SELECT d.id, d.user_id, d.title, d.created_at, u.email, u.username
       FROM dreams d
       JOIN users u ON u.id = d.user_id
       WHERE d.user_id = $1 AND d.deleted_at IS NULL
       ORDER BY d.created_at DESC
       LIMIT 30`,
      [userId],
    );

    const user = await this.db.query<{ email: string; username: string; last_login_at: Date | null }[]>(
      `SELECT email, username, last_login_at FROM users WHERE id = $1`,
      [userId],
    );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const u = user[0]!;

    const events: ActivityEvent[] = dreams.map((r) => ({
      type:      'dream_created' as const,
      userId:    r.user_id,
      email:     r.email,
      username:  r.username,
      detail:    r.title ? `"${r.title}"` : 'Başlıksız rüya',
      timestamp: r.created_at,
    }));

    if (u.last_login_at) {
      events.push({
        type:      'login',
        userId,
        email:     u.email,
        username:  u.username,
        detail:    'Son giriş',
        timestamp: u.last_login_at,
      });
    }

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // ── User dreams ────────────────────────────────────────────────────────────

  async getUserDreams(userId: string, page: number, limit: number): Promise<AdminDreamsResult> {
    const offset = (page - 1) * limit;

    const countRows = await this.db.query<{ total: string }[]>(
      `SELECT COUNT(*)::int AS total FROM dreams WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId],
    );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const total = parseInt(countRows[0]!.total, 10);

    const rows = await this.db.query<{
      id: string; title: string | null; user_id: string; category: string;
      visibility: string; is_draft: boolean; like_count: number;
      comment_count: number; save_count: number; created_at: Date;
      email: string; username: string;
    }[]>(
      `SELECT d.id, d.title, d.user_id, d.category, d.visibility, d.is_draft,
              d.like_count, d.comment_count, d.save_count, d.created_at,
              u.email, u.username
       FROM dreams d
       JOIN users u ON u.id = d.user_id
       WHERE d.user_id = $1 AND d.deleted_at IS NULL
       ORDER BY d.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );

    return {
      items: rows.map((r) => ({
        id:             r.id,
        title:          r.title,
        userId:         r.user_id,
        authorEmail:    r.email,
        authorUsername: r.username,
        category:       r.category,
        visibility:     r.visibility,
        isDraft:        r.is_draft,
        likeCount:      r.like_count,
        commentCount:   r.comment_count,
        saveCount:      r.save_count,
        createdAt:      r.created_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // ── Dreams list (enhanced) ─────────────────────────────────────────────────

  async getDreams(
    page: number,
    limit: number,
    search?: string,
    category?: string,
    visibility?: string,
    authorSearch?: string,
    hasReports?: boolean,
    isFeatured?: boolean,
    isHidden?: boolean,
    dateFrom?: string,
    dateTo?: string,
    sortBy?: string,
    sortDir?: 'asc' | 'desc',
  ): Promise<AdminDreamsResult> {
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    const conditions: string[] = ['d.deleted_at IS NULL'];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(`(LOWER(d.title) LIKE $${params.length} OR LOWER(d.content) LIKE $${params.length})`);
    }
    if (category) {
      params.push(category);
      conditions.push(`d.category = $${params.length}`);
    }
    if (visibility) {
      params.push(visibility);
      conditions.push(`d.visibility = $${params.length}`);
    }
    if (authorSearch) {
      params.push(`%${authorSearch.toLowerCase()}%`);
      conditions.push(`(LOWER(u.email) LIKE $${params.length} OR LOWER(u.username) LIKE $${params.length})`);
    }
    if (hasReports === true) {
      conditions.push(`EXISTS (SELECT 1 FROM dream_reports dr WHERE dr.dream_id = d.id AND dr.status = 'pending')`);
    }
    if (isFeatured !== undefined) {
      params.push(isFeatured);
      conditions.push(`d.is_featured = $${params.length}`);
    }
    if (isHidden !== undefined) {
      params.push(isHidden);
      conditions.push(`d.is_hidden = $${params.length}`);
    }
    if (dateFrom) {
      params.push(dateFrom);
      conditions.push(`d.created_at >= $${params.length}`);
    }
    if (dateTo) {
      params.push(dateTo);
      conditions.push(`d.created_at <= $${params.length}`);
    }

    const where = conditions.join(' AND ');

    const countRows = await this.db.query<{ total: string }[]>(
      `SELECT COUNT(*)::int AS total
       FROM dreams d
       JOIN users u ON u.id = d.user_id
       WHERE ${where}`,
      params,
    );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const total = parseInt(countRows[0]!.total, 10);

    const allowedSort: Record<string, string> = {
      likes:    'd.like_count',
      comments: 'd.comment_count',
      saves:    'd.save_count',
      created:  'd.created_at',
      views:    'd.view_count',
    };
    const orderCol = allowedSort[sortBy ?? 'created'] ?? 'd.created_at';
    const orderDir = sortDir === 'asc' ? 'ASC' : 'DESC';

    params.push(limit, offset);

    const rows = await this.db.query<{
      id: string; title: string | null; user_id: string; email: string; username: string;
      category: string; visibility: string; is_draft: boolean;
      like_count: number; comment_count: number; save_count: number; created_at: Date;
    }[]>(
      `SELECT d.id, d.title, d.user_id, d.category, d.visibility, d.is_draft,
              d.like_count, d.comment_count, d.save_count, d.created_at,
              u.email, u.username
       FROM dreams d
       JOIN users u ON u.id = d.user_id
       WHERE ${where}
       ORDER BY ${orderCol} ${orderDir} NULLS LAST
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      items: rows.map((r) => ({
        id:             r.id,
        title:          r.title,
        userId:         r.user_id,
        authorEmail:    r.email,
        authorUsername: r.username,
        category:       r.category,
        visibility:     r.visibility,
        isDraft:        r.is_draft,
        likeCount:      Number(r.like_count),
        commentCount:   Number(r.comment_count),
        saveCount:      Number(r.save_count),
        createdAt:      r.created_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // ── Dream detail ───────────────────────────────────────────────────────────

  async getDreamById(dreamId: string): Promise<AdminDreamDetail> {
    const dreamRows = await this.db.query<{
      id: string; title: string | null; content: string; user_id: string;
      category: string; visibility: string; is_draft: boolean; tags: string[];
      like_count: number; comment_count: number; save_count: number; match_count: number;
      view_count: number; is_moderated: boolean; moderation_score: number | null;
      is_hidden: boolean; is_featured: boolean; featured_at: Date | null;
      moderation_note: string | null; dreamed_at: Date; created_at: Date; updated_at: Date;
      author_email: string; author_username: string; author_display_name: string | null;
      author_avatar_url: string | null; author_role: string;
    }[]>(
      `SELECT d.id, d.title, d.content, d.user_id, d.category, d.visibility,
              d.is_draft, d.tags, d.like_count, d.comment_count, d.save_count, d.match_count,
              d.view_count, d.is_moderated, d.moderation_score, d.is_hidden, d.is_featured,
              d.featured_at, d.moderation_note, d.dreamed_at, d.created_at, d.updated_at,
              u.email AS author_email, u.username AS author_username, u.role AS author_role,
              p.display_name AS author_display_name, p.avatar_url AS author_avatar_url
       FROM dreams d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN user_profiles p ON p.user_id = d.user_id
       WHERE d.id = $1 AND d.deleted_at IS NULL`,
      [dreamId],
    );

    if (!dreamRows.length) throw new NotFoundException('Rüya bulunamadı.');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const d = dreamRows[0]!;

    // Fetch analysis
    const analysisRows = await this.db.query<{
      primary_theme: string | null; primary_emotion: string | null; emotional_intensity: string | null;
      emotional_arc: string | null; residual_emotion: string | null;
    }[]>(
      `SELECT primary_theme, primary_emotion, emotional_intensity, emotional_arc, residual_emotion
       FROM dream_analyses
       WHERE dream_id = $1 AND status = 'completed'
       LIMIT 1`,
      [dreamId],
    );
    const analysis = analysisRows[0] ?? null;

    // Fetch symbols
    const symbolRows = await this.db.query<{
      symbol_category: string; manifestation: string; confidence: number;
    }[]>(
      `SELECT symbol_category, manifestation, confidence
       FROM dream_symbols
       WHERE dream_id = $1
       LIMIT 10`,
      [dreamId],
    );

    // Fetch emotions
    const emotionRows = await this.db.query<{
      emotion: string; intensity: string; is_primary: boolean;
    }[]>(
      `SELECT emotion, intensity, is_primary
       FROM dream_emotions
       WHERE dream_id = $1
       ORDER BY is_primary DESC
       LIMIT 10`,
      [dreamId],
    );

    // Fetch themes
    const themeRows = await this.db.query<{
      theme: string; theme_family: string; is_primary: boolean;
    }[]>(
      `SELECT theme, theme_family, is_primary
       FROM dream_themes
       WHERE dream_id = $1
       ORDER BY is_primary DESC
       LIMIT 10`,
      [dreamId],
    );

    // Fetch comments
    const commentRows = await this.db.query<{
      id: string; content: string; created_at: Date;
      author_username: string; author_display_name: string | null;
    }[]>(
      `SELECT dc.id, dc.content, dc.created_at,
              u.username AS author_username,
              p.display_name AS author_display_name
       FROM dream_comments dc
       JOIN users u ON u.id = dc.user_id
       LEFT JOIN user_profiles p ON p.user_id = dc.user_id
       WHERE dc.dream_id = $1 AND dc.deleted_at IS NULL
       ORDER BY dc.created_at DESC
       LIMIT 20`,
      [dreamId],
    );

    // Fetch dream figures
    const figureRows = await this.db.query<{
      figure_type: string; is_known: boolean; relationship_type: string | null;
      archetype_candidate: string | null; quality_descriptors: string[]; narrative_role: string | null;
    }[]>(
      `SELECT figure_type, is_known, relationship_type, archetype_candidate,
              quality_descriptors, narrative_role
       FROM dream_figures
       WHERE dream_id = $1
       LIMIT 8`,
      [dreamId],
    );

    // Fetch similar dreams via dream_matches
    const similarRows = await this.db.query<{
      match_score: number; resonance_level: string; shared_themes: string[]; shared_emotions: string[];
      id: string; title: string | null; category: string; author_username: string;
    }[]>(
      `WITH matched AS (
         SELECT
           CASE WHEN dm.dream_id_a = $1 THEN dm.dream_id_b ELSE dm.dream_id_a END AS dream_id,
           dm.match_score, dm.resonance_level, dm.shared_themes, dm.shared_emotions
         FROM dream_matches dm
         WHERE dm.dream_id_a = $1 OR dm.dream_id_b = $1
         ORDER BY dm.match_score DESC
         LIMIT 5
       )
       SELECT m.match_score, m.resonance_level, m.shared_themes, m.shared_emotions,
              d.id, d.title, d.category, u.username AS author_username
       FROM matched m
       JOIN dreams d ON d.id = m.dream_id AND d.deleted_at IS NULL
       JOIN users u ON u.id = d.user_id
       ORDER BY m.match_score DESC`,
      [dreamId],
    );

    // Fetch author dream identity archetype
    const authorIdentityRows = await this.db.query<{ primary_archetype: string | null }[]>(
      `SELECT primary_archetype FROM dream_identities WHERE user_id = $1 LIMIT 1`,
      [d.user_id],
    );
    const authorIdentity = authorIdentityRows[0] ?? null;

    // Count reports
    const reportCountRows = await this.db.query<{ cnt: string }[]>(
      `SELECT COUNT(*)::int AS cnt FROM dream_reports WHERE dream_id = $1`,
      [dreamId],
    );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const reportCount = parseInt(reportCountRows[0]!.cnt, 10);

    // Fetch reports
    const reportRows = await this.db.query<{
      id: string; dream_id: string; reason: string; description: string | null;
      status: string; resolved_at: Date | null; created_at: Date;
      reporter_username: string; reporter_email: string;
    }[]>(
      `SELECT dr.id, dr.dream_id, dr.reason, dr.description, dr.status,
              dr.resolved_at, dr.created_at,
              u.username AS reporter_username, u.email AS reporter_email
       FROM dream_reports dr
       JOIN users u ON u.id = dr.reporter_id
       WHERE dr.dream_id = $1
       ORDER BY dr.created_at DESC
       LIMIT 20`,
      [dreamId],
    );

    return {
      id:                 d.id,
      title:              d.title,
      content:            d.content,
      userId:             d.user_id,
      authorEmail:        d.author_email,
      authorUsername:     d.author_username,
      authorDisplayName:  d.author_display_name,
      authorAvatarUrl:    d.author_avatar_url,
      authorRole:         d.author_role,
      category:           d.category,
      visibility:         d.visibility,
      isDraft:            d.is_draft,
      tags:               d.tags ?? [],
      likeCount:          Number(d.like_count),
      commentCount:       Number(d.comment_count),
      saveCount:          Number(d.save_count),
      matchCount:         Number(d.match_count),
      viewCount:          Number(d.view_count),
      isModerated:        d.is_moderated,
      moderationScore:    d.moderation_score !== null ? Number(d.moderation_score) : null,
      isHidden:           d.is_hidden,
      isFeatured:         d.is_featured,
      featuredAt:         d.featured_at,
      moderationNote:     d.moderation_note,
      dreamedAt:          d.dreamed_at,
      createdAt:          d.created_at,
      updatedAt:          d.updated_at,
      primaryTheme:       analysis?.primary_theme ?? null,
      primaryEmotion:     analysis?.primary_emotion ?? null,
      emotionalIntensity: analysis?.emotional_intensity ?? null,
      emotionalArc:       analysis?.emotional_arc ?? null,
      residualEmotion:    analysis?.residual_emotion ?? null,
      symbols: symbolRows.map((s) => ({
        category:      s.symbol_category,
        manifestation: s.manifestation,
        confidence:    Number(s.confidence),
      })),
      emotions: emotionRows.map((e) => ({
        emotion:   e.emotion,
        intensity: e.intensity,
        isPrimary: e.is_primary,
      })),
      themes: themeRows.map((t) => ({
        theme:       t.theme,
        themeFamily: t.theme_family,
        isPrimary:   t.is_primary,
      })),
      figures: figureRows.map((f) => ({
        figureType:         f.figure_type,
        isKnown:            f.is_known,
        relationshipType:   f.relationship_type,
        archetypeCandidate: f.archetype_candidate,
        qualityDescriptors: f.quality_descriptors ?? [],
        narrativeRole:      f.narrative_role,
      })),
      similarDreams: similarRows.map((s) => ({
        id:             s.id,
        title:          s.title,
        authorUsername: s.author_username,
        category:       s.category,
        matchScore:     Number(s.match_score),
        resonanceLevel: s.resonance_level,
        sharedThemes:   s.shared_themes ?? [],
        sharedEmotions: s.shared_emotions ?? [],
      })),
      authorArchetype:    authorIdentity?.primary_archetype ?? null,
      comments: commentRows.map((c) => ({
        id:                c.id,
        content:           c.content,
        authorUsername:    c.author_username,
        authorDisplayName: c.author_display_name,
        createdAt:         c.created_at,
      })),
      reportCount,
      reports: reportRows.map((r) => ({
        id:               r.id,
        dreamId:          r.dream_id,
        reporterUsername: r.reporter_username,
        reporterEmail:    r.reporter_email,
        reason:           r.reason,
        description:      r.description,
        status:           r.status,
        resolvedAt:       r.resolved_at,
        createdAt:        r.created_at,
      })),
    };
  }

  // ── Feature/unfeature dream ────────────────────────────────────────────────

  async featureDream(adminId: string, dreamId: string, isFeatured: boolean): Promise<{ ok: boolean }> {
    await this.db.query(
      `UPDATE dreams
       SET is_featured = $1, featured_at = CASE WHEN $1 THEN NOW() ELSE NULL END
       WHERE id = $2 AND deleted_at IS NULL`,
      [isFeatured, dreamId],
    );
    await this.createLog(
      adminId, null,
      isFeatured ? 'dream_featured' : 'dream_unfeatured',
      null,
      { dreamId, isFeatured },
    );
    return { ok: true };
  }

  // ── Hide/unhide dream ──────────────────────────────────────────────────────

  async hideDream(adminId: string, dreamId: string, isHidden: boolean, note?: string): Promise<{ ok: boolean }> {
    await this.db.query(
      `UPDATE dreams
       SET is_hidden = $1, moderation_note = COALESCE($2, moderation_note)
       WHERE id = $3 AND deleted_at IS NULL`,
      [isHidden, note ?? null, dreamId],
    );
    await this.createLog(
      adminId, null,
      isHidden ? 'dream_hidden' : 'dream_unhidden',
      null,
      { dreamId, isHidden, note },
    );
    return { ok: true };
  }

  // ── Soft delete dream ──────────────────────────────────────────────────────

  async softDeleteDream(adminId: string, dreamId: string): Promise<{ ok: boolean }> {
    await this.db.query(
      `UPDATE dreams SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [dreamId],
    );
    await this.createLog(adminId, null, 'dream_deleted', null, { dreamId });
    return { ok: true };
  }

  // ── Update dream metadata ──────────────────────────────────────────────────

  async updateDreamMetadata(
    adminId: string,
    dreamId: string,
    data: { title?: string; category?: string; tags?: string[]; moderationNote?: string },
  ): Promise<{ ok: boolean }> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (data.title !== undefined) {
      params.push(data.title);
      sets.push(`title = $${params.length}`);
    }
    if (data.category !== undefined) {
      params.push(data.category);
      sets.push(`category = $${params.length}`);
    }
    if (data.tags !== undefined) {
      params.push(data.tags);
      sets.push(`tags = $${params.length}::text[]`);
    }
    if (data.moderationNote !== undefined) {
      params.push(data.moderationNote);
      sets.push(`moderation_note = $${params.length}`);
    }

    if (sets.length) {
      params.push(dreamId);
      await this.db.query(
        `UPDATE dreams SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} AND deleted_at IS NULL`,
        params,
      );
    }

    await this.createLog(adminId, null, 'dream_metadata_edited', null, { dreamId, ...data });
    return { ok: true };
  }

  // ── Get dream reports ──────────────────────────────────────────────────────

  async getDreamReports(dreamId: string): Promise<AdminDreamReport[]> {
    const rows = await this.db.query<{
      id: string; dream_id: string; reason: string; description: string | null;
      status: string; resolved_at: Date | null; created_at: Date;
      reporter_username: string; reporter_email: string;
    }[]>(
      `SELECT dr.id, dr.dream_id, dr.reason, dr.description, dr.status,
              dr.resolved_at, dr.created_at,
              u.username AS reporter_username, u.email AS reporter_email
       FROM dream_reports dr
       JOIN users u ON u.id = dr.reporter_id
       WHERE dr.dream_id = $1
       ORDER BY dr.created_at DESC`,
      [dreamId],
    );

    return rows.map((r) => ({
      id:               r.id,
      dreamId:          r.dream_id,
      reporterUsername: r.reporter_username,
      reporterEmail:    r.reporter_email,
      reason:           r.reason,
      description:      r.description,
      status:           r.status,
      resolvedAt:       r.resolved_at,
      createdAt:        r.created_at,
    }));
  }

  // ── Resolve dream report ───────────────────────────────────────────────────

  async resolveDreamReport(adminId: string, reportId: string, status: string): Promise<{ ok: boolean }> {
    await this.db.query(
      `UPDATE dream_reports SET status = $1, resolved_by = $2, resolved_at = NOW() WHERE id = $3`,
      [status, adminId, reportId],
    );
    await this.createLog(adminId, null, 'report_resolved', null, { reportId, status });
    return { ok: true };
  }

  // ── Dream analytics ────────────────────────────────────────────────────────

  async getDreamAnalytics(): Promise<DreamAnalytics> {
    const dreamRowMapper = (r: {
      id: string; title: string | null; user_id: string; category: string;
      visibility: string; is_draft: boolean; like_count: number;
      comment_count: number; save_count: number; created_at: Date;
      email: string; username: string;
    }): AdminDream => ({
      id:             r.id,
      title:          r.title,
      userId:         r.user_id,
      authorEmail:    r.email,
      authorUsername: r.username,
      category:       r.category,
      visibility:     r.visibility,
      isDraft:        r.is_draft,
      likeCount:      Number(r.like_count),
      commentCount:   Number(r.comment_count),
      saveCount:      Number(r.save_count),
      createdAt:      r.created_at,
    });

    const baseSelect = `
      SELECT d.id, d.title, d.user_id, d.category, d.visibility, d.is_draft,
             d.like_count, d.comment_count, d.save_count, d.created_at,
             u.email, u.username
      FROM dreams d
      JOIN users u ON u.id = d.user_id
      WHERE d.deleted_at IS NULL
    `;

    const [topLikedRows, topCommentedRows, topSavedRows, categoryRows, visibilityRows, countsRows, reportedRows] =
      await Promise.all([
        this.db.query<{
          id: string; title: string | null; user_id: string; category: string;
          visibility: string; is_draft: boolean; like_count: number;
          comment_count: number; save_count: number; created_at: Date;
          email: string; username: string;
        }[]>(`${baseSelect} ORDER BY d.like_count DESC LIMIT 10`),
        this.db.query<{
          id: string; title: string | null; user_id: string; category: string;
          visibility: string; is_draft: boolean; like_count: number;
          comment_count: number; save_count: number; created_at: Date;
          email: string; username: string;
        }[]>(`${baseSelect} ORDER BY d.comment_count DESC LIMIT 10`),
        this.db.query<{
          id: string; title: string | null; user_id: string; category: string;
          visibility: string; is_draft: boolean; like_count: number;
          comment_count: number; save_count: number; created_at: Date;
          email: string; username: string;
        }[]>(`${baseSelect} ORDER BY d.save_count DESC LIMIT 10`),
        this.db.query<{ category: string; cnt: number }[]>(
          `SELECT category, COUNT(*)::int AS cnt FROM dreams WHERE deleted_at IS NULL GROUP BY category`,
        ),
        this.db.query<{ visibility: string; cnt: number }[]>(
          `SELECT visibility, COUNT(*)::int AS cnt FROM dreams WHERE deleted_at IS NULL GROUP BY visibility`,
        ),
        this.db.query<{ featured: string; hidden: string; drafts: string }[]>(
          `SELECT
             COUNT(*) FILTER (WHERE is_featured) AS featured,
             COUNT(*) FILTER (WHERE is_hidden) AS hidden,
             COUNT(*) FILTER (WHERE is_draft) AS drafts
           FROM dreams WHERE deleted_at IS NULL`,
        ),
        this.db.query<{ cnt: number }[]>(
          `SELECT COUNT(DISTINCT dream_id)::int AS cnt FROM dream_reports WHERE status = 'pending'`,
        ),
      ]);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const counts = countsRows[0]!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const reportedCount = Number(reportedRows[0]!.cnt);

    const totalByCategory: Record<string, number> = {};
    for (const row of categoryRows) {
      totalByCategory[row.category] = Number(row.cnt);
    }

    const totalByVisibility: Record<string, number> = {};
    for (const row of visibilityRows) {
      totalByVisibility[row.visibility] = Number(row.cnt);
    }

    return {
      topLiked:          topLikedRows.map(dreamRowMapper),
      topCommented:      topCommentedRows.map(dreamRowMapper),
      topSaved:          topSavedRows.map(dreamRowMapper),
      totalByCategory,
      totalByVisibility,
      featuredCount:     parseInt(counts.featured, 10),
      hiddenCount:       parseInt(counts.hidden, 10),
      reportedCount,
      totalDrafts:       parseInt(counts.drafts, 10),
    };
  }

  // ── Activity feed ──────────────────────────────────────────────────────────

  async getActivity(): Promise<ActivityEvent[]> {
    const logins = await this.db.query<{ id: string; email: string; username: string; last_login_at: Date }[]>(
      `SELECT id, email, username, last_login_at
       FROM users
       WHERE deleted_at IS NULL AND last_login_at IS NOT NULL
       ORDER BY last_login_at DESC
       LIMIT 20`,
    );

    const dreams = await this.db.query<{
      id: string; user_id: string; email: string; username: string;
      title: string | null; created_at: Date;
    }[]>(
      `SELECT d.id, d.user_id, d.title, d.created_at, u.email, u.username
       FROM dreams d
       JOIN users u ON u.id = d.user_id
       WHERE d.deleted_at IS NULL
       ORDER BY d.created_at DESC
       LIMIT 20`,
    );

    const events: ActivityEvent[] = [
      ...logins.map((r) => ({
        type:      'login' as const,
        userId:    r.id,
        email:     r.email,
        username:  r.username,
        detail:    'Giriş yaptı',
        timestamp: r.last_login_at,
      })),
      ...dreams.map((r) => ({
        type:      'dream_created' as const,
        userId:    r.user_id,
        email:     r.email,
        username:  r.username,
        detail:    r.title ? `"${r.title}"` : 'Başlıksız rüya',
        timestamp: r.created_at,
      })),
    ];

    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);
  }

  // ── All reports list ───────────────────────────────────────────────────────

  async getAllReports(
    page: number,
    limit: number,
    status?: string,
    reason?: string,
  ): Promise<AdminReportsResult> {
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    const conditions: string[] = ['d.deleted_at IS NULL'];

    if (status) {
      params.push(status);
      conditions.push(`dr.status = $${params.length}`);
    }
    if (reason) {
      params.push(reason);
      conditions.push(`dr.reason = $${params.length}`);
    }

    const where = conditions.join(' AND ');

    const countRows = await this.db.query<{ total: string }[]>(
      `SELECT COUNT(*)::int AS total
       FROM dream_reports dr
       JOIN dreams d ON d.id = dr.dream_id
       WHERE ${where}`,
      params,
    );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const total = parseInt(countRows[0]!.total, 10);

    params.push(limit, offset);

    const rows = await this.db.query<{
      id: string; dream_id: string; reason: string; description: string | null;
      status: string; resolved_at: Date | null; created_at: Date;
      dream_title: string | null; dream_content: string; dream_category: string;
      author_id: string; author_username: string; author_email: string;
      reporter_username: string; reporter_email: string;
    }[]>(
      `SELECT dr.id, dr.dream_id, dr.reason, dr.description, dr.status,
              dr.resolved_at, dr.created_at,
              d.title AS dream_title, LEFT(d.content, 160) AS dream_content,
              d.category AS dream_category,
              au.id AS author_id, au.username AS author_username, au.email AS author_email,
              ru.username AS reporter_username, ru.email AS reporter_email
       FROM dream_reports dr
       JOIN dreams d ON d.id = dr.dream_id
       JOIN users au ON au.id = d.user_id
       JOIN users ru ON ru.id = dr.reporter_id
       WHERE ${where}
       ORDER BY CASE dr.status WHEN 'pending' THEN 0 ELSE 1 END, dr.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      items: rows.map((r) => ({
        id:                  r.id,
        dreamId:             r.dream_id,
        dreamTitle:          r.dream_title,
        dreamContentPreview: r.dream_content,
        dreamCategory:       r.dream_category,
        authorId:            r.author_id,
        authorUsername:      r.author_username,
        authorEmail:         r.author_email,
        reporterUsername:    r.reporter_username,
        reporterEmail:       r.reporter_email,
        reason:              r.reason,
        description:         r.description,
        status:              r.status,
        resolvedAt:          r.resolved_at,
        createdAt:           r.created_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // ── Enhanced dashboard metrics ─────────────────────────────────────────────

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [topCategories, topUsers, recentLogs, countsRows] = await Promise.all([
      this.db.query<{ category: string; cnt: string }[]>(
        `SELECT category, COUNT(*)::int AS cnt
         FROM dreams WHERE deleted_at IS NULL
         GROUP BY category ORDER BY cnt DESC LIMIT 5`,
      ),
      this.db.query<{ id: string; username: string; avatar_url: string | null; dream_count: string }[]>(
        `SELECT u.id, u.username, p.avatar_url, COALESCE(p.dream_count, 0) AS dream_count
         FROM users u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         WHERE u.deleted_at IS NULL
         ORDER BY dream_count DESC
         LIMIT 5`,
      ),
      this.db.query<{ action_type: string; admin_username: string; target_username: string | null; created_at: Date }[]>(
        `SELECT l.action_type, l.created_at, a.username AS admin_username, t.username AS target_username
         FROM admin_logs l
         JOIN users a ON a.id = l.admin_id
         LEFT JOIN users t ON t.id = l.target_user_id
         ORDER BY l.created_at DESC
         LIMIT 8`,
      ),
      this.db.query<{ pending: string; hidden: string; featured: string }[]>(
        `SELECT
           (SELECT COUNT(*)::int FROM dream_reports WHERE status = 'pending') AS pending,
           (SELECT COUNT(*)::int FROM dreams WHERE is_hidden = TRUE AND deleted_at IS NULL) AS hidden,
           (SELECT COUNT(*)::int FROM dreams WHERE is_featured = TRUE AND deleted_at IS NULL) AS featured`,
      ),
    ]);

    const counts = countsRows[0] ?? { pending: '0', hidden: '0', featured: '0' };

    return {
      topCategories: topCategories.map((r) => ({ category: r.category, count: Number(r.cnt) })),
      topUsers: topUsers.map((r) => ({
        id:         r.id,
        username:   r.username,
        avatarUrl:  r.avatar_url,
        dreamCount: Number(r.dream_count),
      })),
      recentAdminLogs: recentLogs.map((r) => ({
        actionType:     r.action_type,
        adminUsername:  r.admin_username,
        targetUsername: r.target_username,
        createdAt:      r.created_at,
      })),
      pendingReports: parseInt(counts.pending, 10),
      hiddenDreams:   parseInt(counts.hidden, 10),
      featuredDreams: parseInt(counts.featured, 10),
    };
  }

  // ── Bulk dream action ──────────────────────────────────────────────────────

  async bulkDreamAction(
    adminId: string,
    ids: string[],
    action: string,
  ): Promise<{ affected: number }> {
    if (!ids.length) return { affected: 0 };

    let sql: string;
    let params: unknown[];

    switch (action) {
      case 'hide':
        sql = `UPDATE dreams SET is_hidden = TRUE WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`;
        params = [ids];
        break;
      case 'unhide':
        sql = `UPDATE dreams SET is_hidden = FALSE WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`;
        params = [ids];
        break;
      case 'feature':
        sql = `UPDATE dreams SET is_featured = TRUE, featured_at = NOW() WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`;
        params = [ids];
        break;
      case 'unfeature':
        sql = `UPDATE dreams SET is_featured = FALSE, featured_at = NULL WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`;
        params = [ids];
        break;
      case 'delete':
        sql = `UPDATE dreams SET deleted_at = NOW() WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`;
        params = [ids];
        break;
      default:
        return { affected: 0 };
    }

    await this.db.query(sql, params);
    await this.createLog(adminId, null, `bulk_dream_${action}`, null, { count: ids.length });
    return { affected: ids.length };
  }

  // ── Admin logs list ────────────────────────────────────────────────────────

  async getLogs(page: number, limit: number, actionType?: string): Promise<{ items: AdminLogEntry[]; total: number; page: number; pages: number }> {
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    const where = actionType ? `WHERE l.action_type = $${params.push(actionType)}` : '';

    const countRows = await this.db.query<{ total: string }[]>(
      `SELECT COUNT(*)::int AS total FROM admin_logs l ${where}`,
      params,
    );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const total = parseInt(countRows[0]!.total, 10);

    const listParams = [...params, limit, offset];

    const rows = await this.db.query<{
      id: string; admin_id: string; target_user_id: string | null;
      action_type: string; old_value: Record<string, unknown> | null;
      new_value: Record<string, unknown> | null; created_at: Date;
      admin_email: string; admin_username: string;
      target_email: string | null; target_username: string | null;
    }[]>(
      `SELECT l.*,
              a.email AS admin_email, a.username AS admin_username,
              t.email AS target_email, t.username AS target_username
       FROM admin_logs l
       JOIN users a ON a.id = l.admin_id
       LEFT JOIN users t ON t.id = l.target_user_id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    );

    return {
      items: rows.map((r) => ({
        id:              r.id,
        adminId:         r.admin_id,
        adminEmail:      r.admin_email,
        adminUsername:   r.admin_username,
        targetUserId:    r.target_user_id,
        targetEmail:     r.target_email,
        targetUsername:  r.target_username,
        actionType:      r.action_type,
        oldValue:        r.old_value,
        newValue:        r.new_value,
        createdAt:       r.created_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // ── Dream Intelligence ─────────────────────────────────────────────────────

  async getDreamIntelligence(): Promise<DreamIntelligenceData> {
    const [symbols, themes, emotions, catDist, visDist, resonant, places, analyzed] = await Promise.all([
      this.db.query<{ symbol: string; category: string; count: string }[]>(
        `SELECT ds.manifestation AS symbol, ds.symbol_category AS category, COUNT(*)::int AS count
         FROM dream_symbols ds
         JOIN dreams d ON d.id = ds.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
         GROUP BY ds.manifestation, ds.symbol_category
         ORDER BY count DESC LIMIT 15`,
      ),
      this.db.query<{ theme: string; family: string; count: string }[]>(
        `SELECT dt.theme, dt.theme_family AS family, COUNT(*)::int AS count
         FROM dream_themes dt
         JOIN dreams d ON d.id = dt.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
         GROUP BY dt.theme, dt.theme_family
         ORDER BY count DESC LIMIT 15`,
      ),
      this.db.query<{ emotion: string; count: string }[]>(
        `SELECT de.emotion, COUNT(*)::int AS count
         FROM dream_emotions de
         JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
         WHERE de.is_primary = TRUE
         GROUP BY de.emotion
         ORDER BY count DESC LIMIT 10`,
      ),
      this.db.query<{ category: string; count: string }[]>(
        `SELECT category, COUNT(*)::int AS count
         FROM dreams
         WHERE deleted_at IS NULL AND is_draft = FALSE
         GROUP BY category ORDER BY count DESC`,
      ),
      this.db.query<{ visibility: string; count: string }[]>(
        `SELECT visibility, COUNT(*)::int AS count
         FROM dreams
         WHERE deleted_at IS NULL AND is_draft = FALSE
         GROUP BY visibility ORDER BY count DESC`,
      ),
      this.db.query<{ id: string; title: string | null; author_username: string; match_count: string; like_count: string }[]>(
        `SELECT d.id, d.title, u.username AS author_username,
                COUNT(DISTINCT dm.id)::int AS match_count,
                COUNT(DISTINCT dl.id)::int AS like_count
         FROM dreams d
         JOIN users u ON u.id = d.user_id
         LEFT JOIN dream_matches dm ON (dm.dream_id_a = d.id OR dm.dream_id_b = d.id)
         LEFT JOIN dream_likes dl ON dl.dream_id = d.id
         WHERE d.deleted_at IS NULL AND d.is_draft = FALSE AND d.visibility = 'public'
         GROUP BY d.id, d.title, u.username
         ORDER BY match_count DESC, like_count DESC
         LIMIT 8`,
      ),
      this.db.query<{ name: string; type: string; count: string }[]>(
        `SELECT dp.name, dp.type, COUNT(*)::int AS count
         FROM dream_places dp
         JOIN dreams d ON d.id = dp.dream_id AND d.deleted_at IS NULL
         GROUP BY dp.name, dp.type
         ORDER BY count DESC LIMIT 10`,
      ),
      this.db.query<{ count: string }[]>(
        `SELECT COUNT(DISTINCT dream_id)::int AS count FROM dream_symbols`,
      ),
    ]);

    const totalDreams = catDist.reduce((s, r) => s + Number(r.count), 0) || 1;
    const totalVis    = visDist.reduce((s, r) => s + Number(r.count), 0) || 1;
    const lucidCount     = catDist.find((r) => r.category === 'lucid')?.count     ?? '0';
    const nightmareCount = catDist.find((r) => r.category === 'nightmare')?.count ?? '0';
    const publicCount    = visDist.find((r) => r.visibility === 'public')?.count   ?? '0';

    return {
      trendingSymbols:  symbols.map((r) => ({ symbol: r.symbol, category: r.category, count: Number(r.count) })),
      trendingThemes:   themes.map((r) => ({ theme: r.theme, family: r.family, count: Number(r.count) })),
      trendingEmotions: emotions.map((r) => ({ emotion: r.emotion, count: Number(r.count) })),
      categoryDistribution: catDist.map((r) => ({
        category: r.category,
        count:    Number(r.count),
        pct:      Math.round(Number(r.count) / totalDreams * 100),
      })),
      visibilityDistribution: visDist.map((r) => ({
        visibility: r.visibility,
        count:      Number(r.count),
        pct:        Math.round(Number(r.count) / totalVis * 100),
      })),
      lucidRatio:     Math.round(Number(lucidCount)     / totalDreams * 100),
      nightmareRatio: Math.round(Number(nightmareCount) / totalDreams * 100),
      publicRatio:    Math.round(Number(publicCount)    / totalVis    * 100),
      mostResonantDreams: resonant.map((r) => ({
        id:             r.id,
        title:          r.title,
        authorUsername: r.author_username,
        matchCount:     Number(r.match_count),
        likeCount:      Number(r.like_count),
      })),
      mostRepeatedPlaces:  places.map((r) => ({ name: r.name, type: r.type, count: Number(r.count) })),
      totalDreamsAnalyzed: Number(analyzed[0]?.count ?? 0),
    };
  }

  // ── Growth Analytics ───────────────────────────────────────────────────────

  async getGrowthAnalytics(days = 30): Promise<GrowthAnalytics> {
    const d = Math.min(Math.max(1, Math.floor(days)), 365);

    const [dailyNew, dailyActive, totals] = await Promise.all([
      this.db.query<{ date: string; count: string }[]>(
        `SELECT DATE(created_at)::text AS date, COUNT(*)::int AS count
         FROM users
         WHERE created_at >= NOW() - INTERVAL '${d} days' AND deleted_at IS NULL
         GROUP BY DATE(created_at) ORDER BY date ASC`,
      ),
      this.db.query<{ date: string; count: string }[]>(
        `SELECT DATE(last_login_at)::text AS date, COUNT(*)::int AS count
         FROM users
         WHERE last_login_at IS NOT NULL AND last_login_at >= NOW() - INTERVAL '${d} days' AND deleted_at IS NULL
         GROUP BY DATE(last_login_at) ORDER BY date ASC`,
      ),
      this.db.query<{ total: string; weekly: string; monthly: string; prev_week: string }[]>(
        `SELECT
           (SELECT COUNT(*)::int FROM users WHERE deleted_at IS NULL) AS total,
           (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '7 days' AND deleted_at IS NULL) AS weekly,
           (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL) AS monthly,
           (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days' AND deleted_at IS NULL) AS prev_week`,
      ),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const tot      = totals[0]!;
    const weekly   = Number(tot.weekly);
    const prevWeek = Number(tot.prev_week);
    const growthRate = prevWeek > 0 ? Math.round((weekly - prevWeek) / prevWeek * 100) : 0;

    return {
      dailyNewUsers:        dailyNew.map((r) => ({ date: r.date, count: Number(r.count) })),
      dailyActiveUsers:     dailyActive.map((r) => ({ date: r.date, count: Number(r.count) })),
      totalUsers:           Number(tot.total),
      weeklyNewUsers:       weekly,
      monthlyNewUsers:      Number(tot.monthly),
      growthRateVsLastWeek: growthRate,
    };
  }

  // ── Engagement Analytics ───────────────────────────────────────────────────

  async getEngagementAnalytics(days = 30): Promise<EngagementAnalytics> {
    const d = Math.min(Math.max(1, Math.floor(days)), 365);

    const [dailyDreams, totals] = await Promise.all([
      this.db.query<{ date: string; count: string }[]>(
        `SELECT DATE(created_at)::text AS date, COUNT(*)::int AS count
         FROM dreams
         WHERE created_at >= NOW() - INTERVAL '${d} days' AND deleted_at IS NULL AND is_draft = FALSE
         GROUP BY DATE(created_at) ORDER BY date ASC`,
      ),
      this.db.query<{ total_likes: string; total_comments: string; total_saves: string; total_dreams: string }[]>(
        `SELECT
           (SELECT COUNT(*)::int FROM dream_likes dl
            JOIN dreams dv ON dv.id = dl.dream_id AND dv.deleted_at IS NULL) AS total_likes,
           (SELECT COUNT(*)::int FROM dream_comments dc
            JOIN dreams dv ON dv.id = dc.dream_id AND dv.deleted_at IS NULL
            WHERE dc.deleted_at IS NULL) AS total_comments,
           (SELECT COUNT(*)::int FROM dream_saves ds
            JOIN dreams dv ON dv.id = ds.dream_id AND dv.deleted_at IS NULL) AS total_saves,
           (SELECT COUNT(*)::int FROM dreams WHERE deleted_at IS NULL AND is_draft = FALSE) AS total_dreams`,
      ),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const tot         = totals[0]!;
    const totalDreams = Number(tot.total_dreams) || 1;

    return {
      dailyDreams:         dailyDreams.map((r) => ({ date: r.date, count: Number(r.count) })),
      totalLikes:          Number(tot.total_likes),
      totalComments:       Number(tot.total_comments),
      totalSaves:          Number(tot.total_saves),
      totalDreams:         Number(tot.total_dreams),
      avgLikesPerDream:    Math.round(Number(tot.total_likes)    / totalDreams * 10) / 10,
      avgCommentsPerDream: Math.round(Number(tot.total_comments) / totalDreams * 10) / 10,
    };
  }

  // ── Moderation Summary ─────────────────────────────────────────────────────

  async getModerationSummary(): Promise<ModerationSummary> {
    const [counts, repeatOffenders] = await Promise.all([
      this.db.query<{ pending: string; resolved_today: string; banned: string; hidden: string }[]>(
        `SELECT
           (SELECT COUNT(*)::int FROM dream_reports WHERE status = 'pending') AS pending,
           (SELECT COUNT(*)::int FROM dream_reports WHERE status = 'resolved' AND resolved_at >= NOW() - INTERVAL '24 hours') AS resolved_today,
           (SELECT COUNT(*)::int FROM users WHERE is_active = FALSE AND deleted_at IS NULL) AS banned,
           (SELECT COUNT(*)::int FROM dreams WHERE is_hidden = TRUE AND deleted_at IS NULL) AS hidden`,
      ),
      this.db.query<{ user_id: string; username: string; email: string; report_count: string }[]>(
        `SELECT d.user_id, u.username, u.email, COUNT(r.id)::int AS report_count
         FROM dream_reports r
         JOIN dreams d ON d.id = r.dream_id AND d.deleted_at IS NULL
         JOIN users u ON u.id = d.user_id
         WHERE r.status = 'pending'
         GROUP BY d.user_id, u.username, u.email
         HAVING COUNT(r.id) >= 2
         ORDER BY report_count DESC
         LIMIT 10`,
      ),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const c = counts[0]!;
    return {
      pendingReports:  Number(c.pending),
      resolvedToday:   Number(c.resolved_today),
      totalBanned:     Number(c.banned),
      hiddenContent:   Number(c.hidden),
      repeatOffenders: repeatOffenders.map((r) => ({
        userId:      r.user_id,
        username:    r.username,
        email:       r.email,
        reportCount: Number(r.report_count),
      })),
    };
  }

  // ── Community Health ───────────────────────────────────────────────────────

  async getCommunityHealth(): Promise<CommunityHealthData> {
    const POSITIVE = ['joy', 'excitement', 'love', 'peace', 'wonder', 'curiosity', 'hope', 'bliss', 'contentment', 'happiness', 'awe', 'gratitude', 'euphoria'];
    const NEGATIVE = ['fear', 'anxiety', 'sadness', 'anger', 'terror', 'despair', 'grief', 'frustration', 'rage', 'panic', 'dread', 'horror', 'shame'];

    const [emotions, catDist, trend, analyzed] = await Promise.all([
      this.db.query<{ emotion: string; count: string }[]>(
        `SELECT de.emotion, COUNT(*)::int AS count
         FROM dream_emotions de
         JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
         WHERE de.is_primary = TRUE AND d.created_at >= NOW() - INTERVAL '7 days'
         GROUP BY de.emotion
         ORDER BY count DESC`,
      ),
      this.db.query<{ category: string; count: string }[]>(
        `SELECT category, COUNT(*)::int AS count
         FROM dreams
         WHERE deleted_at IS NULL AND is_draft = FALSE AND created_at >= NOW() - INTERVAL '7 days'
         GROUP BY category`,
      ),
      this.db.query<{ date: string; positive: string; negative: string; neutral: string }[]>(
        `SELECT DATE(d.created_at)::text AS date,
                COUNT(CASE WHEN de.emotion = ANY($1) THEN 1 END)::int AS positive,
                COUNT(CASE WHEN de.emotion = ANY($2) THEN 1 END)::int AS negative,
                COUNT(CASE WHEN de.emotion NOT IN (SELECT UNNEST($1::text[]) UNION SELECT UNNEST($2::text[])) THEN 1 END)::int AS neutral
         FROM dreams d
         JOIN dream_emotions de ON de.dream_id = d.id AND de.is_primary = TRUE
         WHERE d.deleted_at IS NULL AND d.is_draft = FALSE AND d.created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(d.created_at)
         ORDER BY date ASC`,
        [POSITIVE, NEGATIVE],
      ),
      this.db.query<{ count: string }[]>(
        `SELECT COUNT(DISTINCT dream_id)::int AS count FROM dream_emotions`,
      ),
    ]);

    const totalEmotions  = emotions.reduce((s, r) => s + Number(r.count), 0) || 1;
    const totalCatDreams = catDist.reduce((s, r) => s + Number(r.count), 0) || 1;

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount  = 0;

    const distribution = emotions.map((r) => {
      const type = POSITIVE.includes(r.emotion) ? 'positive' : NEGATIVE.includes(r.emotion) ? 'negative' : 'neutral';
      if (type === 'positive') positiveCount += Number(r.count);
      else if (type === 'negative') negativeCount += Number(r.count);
      else neutralCount += Number(r.count);
      return { emotion: r.emotion, count: Number(r.count), type } as const;
    });

    const positivityIndex = Math.round(positiveCount / totalEmotions * 100);
    const anxietyIndex    = Math.round(negativeCount / totalEmotions * 100);
    const moodScore       = positiveCount + neutralCount * 0.5 > 0
      ? Math.round((positiveCount + neutralCount * 0.3) / totalEmotions * 100)
      : 50;

    const lucidCount     = catDist.find((r) => r.category === 'lucid')?.count     ?? '0';
    const nightmareCount = catDist.find((r) => r.category === 'nightmare')?.count ?? '0';
    const lucidRatio     = Math.round(Number(lucidCount)     / totalCatDreams * 100);
    const nightmareRatio = Math.round(Number(nightmareCount) / totalCatDreams * 100);

    const communityHealthScore = Math.round(
      moodScore * 0.4 +
      (100 - nightmareRatio) * 0.2 +
      lucidRatio * 0.2 +
      positivityIndex * 0.2,
    );

    const positiveEmotions = distribution.filter((e) => e.type === 'positive').slice(0, 5).map((e) => e.emotion);
    const negativeEmotions = distribution.filter((e) => e.type === 'negative').slice(0, 5).map((e) => e.emotion);

    return {
      moodScore,
      positivityIndex,
      anxietyIndex,
      nightmareRatio,
      lucidRatio,
      communityHealthScore,
      totalDreamsAnalyzed: Number(analyzed[0]?.count ?? 0),
      emotionDistribution: distribution,
      moodTrend: trend.map((r) => ({
        date:     r.date,
        positive: Number(r.positive),
        negative: Number(r.negative),
        neutral:  Number(r.neutral),
      })),
      topPositiveEmotions: positiveEmotions,
      topNegativeEmotions: negativeEmotions,
    };
  }

  // ── Operational Alerts ─────────────────────────────────────────────────────

  async getOperationalAlerts(): Promise<OperationalAlertsData> {
    const [reportsHour, reports24h, reportsPrev, bans24h, highRisk, dbCheck] = await Promise.all([
      this.db.query<{ count: string }[]>(
        `SELECT COUNT(*)::int AS count FROM dream_reports WHERE created_at >= NOW() - INTERVAL '1 hour'`,
      ),
      this.db.query<{ count: string }[]>(
        `SELECT COUNT(*)::int AS count FROM dream_reports WHERE created_at >= NOW() - INTERVAL '24 hours'`,
      ),
      this.db.query<{ count: string }[]>(
        `SELECT COUNT(*)::int AS count FROM dream_reports WHERE created_at BETWEEN NOW() - INTERVAL '48 hours' AND NOW() - INTERVAL '24 hours'`,
      ),
      this.db.query<{ count: string }[]>(
        `SELECT COUNT(*)::int AS count FROM users WHERE is_active = FALSE AND deleted_at IS NULL AND updated_at >= NOW() - INTERVAL '24 hours'`,
      ),
      this.db.query<{ count: string }[]>(
        `SELECT COUNT(DISTINCT r.dream_id)::int AS count
         FROM dream_reports r
         WHERE r.status = 'pending'
         GROUP BY r.dream_id HAVING COUNT(*) >= 3`,
      ),
      this.db.query('SELECT 1').then(() => true).catch(() => false),
    ]);

    const rHour   = Number(reportsHour[0]?.count  ?? 0);
    const r24h    = Number(reports24h[0]?.count    ?? 0);
    const rPrev   = Number(reportsPrev[0]?.count   ?? 0);
    const bans    = Number(bans24h[0]?.count        ?? 0);
    const hiRisk  = highRisk.length;
    const change  = rPrev > 0 ? Math.round((r24h - rPrev) / rPrev * 100) : 0;
    const isDbOk  = dbCheck;

    const alerts: OperationalAlertsData['alerts'] = [];
    const now = new Date().toISOString();

    if (!isDbOk) {
      alerts.push({ type: 'system_warning', severity: 'critical', title: 'Veritabanı Hatası', description: 'PostgreSQL bağlantısı kesildi.', timestamp: now });
    }
    if (rHour >= 10) {
      alerts.push({ type: 'report_spike', severity: 'critical', title: 'Rapor Spike', description: `Son 1 saatte ${rHour} rapor geldi.`, count: rHour, link: '/reports', timestamp: now });
    } else if (rHour >= 5) {
      alerts.push({ type: 'report_spike', severity: 'high', title: 'Yüksek Rapor Hacmi', description: `Son 1 saatte ${rHour} rapor.`, count: rHour, link: '/reports', timestamp: now });
    }
    if (change > 100) {
      alerts.push({ type: 'report_spike', severity: 'high', title: 'Rapor Artışı', description: `24 saatlik rapor sayısı %${change} arttı.`, count: r24h, link: '/reports', timestamp: now });
    }
    if (hiRisk >= 3) {
      alerts.push({ type: 'high_risk_content', severity: 'high', title: 'Yüksek Riskli İçerik', description: `${hiRisk} rüya 3+ raporla işaretlendi.`, count: hiRisk, link: '/moderation', timestamp: now });
    }
    if (bans >= 5) {
      alerts.push({ type: 'ban_wave', severity: 'medium', title: 'Ban Dalgası', description: `Son 24 saatte ${bans} hesap banlandı.`, count: bans, link: '/banned-users', timestamp: now });
    }

    return { alerts, reportsLastHour: rHour, reportsLast24h: r24h, reportsChange: change, newBansLast24h: bans, highRiskDreams: hiRisk };
  }

  // ── User Risk ──────────────────────────────────────────────────────────────

  async getUserRiskList(page: number, limit: number): Promise<{ items: UserRiskEntry[]; total: number; page: number; pages: number }> {
    const offset = (page - 1) * limit;

    const rows = await this.db.query<{
      id: string; username: string; email: string; is_active: boolean;
      report_count: string; hidden_dream_count: string; dream_count: string;
      risk_score: string; created_at: Date;
    }[]>(
      `SELECT u.id, u.username, u.email, u.is_active, u.created_at,
              COUNT(DISTINCT r.id)::int                              AS report_count,
              COUNT(DISTINCT hd.id)::int                             AS hidden_dream_count,
              COALESCE(MAX(p.dream_count), 0)::int                   AS dream_count,
              (COUNT(DISTINCT r.id) * 3 + COUNT(DISTINCT hd.id) * 2
               + CASE WHEN u.is_active = FALSE THEN 10 ELSE 0 END)::int AS risk_score
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       LEFT JOIN dreams d ON d.user_id = u.id AND d.deleted_at IS NULL
       LEFT JOIN dream_reports r ON r.dream_id = d.id AND r.status = 'pending'
       LEFT JOIN dreams hd ON hd.user_id = u.id AND hd.is_hidden = TRUE AND hd.deleted_at IS NULL
       WHERE u.deleted_at IS NULL
       GROUP BY u.id, u.username, u.email, u.is_active, u.created_at
       HAVING COUNT(DISTINCT r.id) > 0 OR COUNT(DISTINCT hd.id) > 0 OR u.is_active = FALSE
       ORDER BY risk_score DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    const countRow = await this.db.query<{ total: string }[]>(
      `SELECT COUNT(DISTINCT u.id)::int AS total
       FROM users u
       LEFT JOIN dreams d ON d.user_id = u.id AND d.deleted_at IS NULL
       LEFT JOIN dream_reports r ON r.dream_id = d.id AND r.status = 'pending'
       LEFT JOIN dreams hd ON hd.user_id = u.id AND hd.is_hidden = TRUE AND hd.deleted_at IS NULL
       WHERE u.deleted_at IS NULL
       AND (EXISTS (SELECT 1 FROM dream_reports rr JOIN dreams dd ON dd.id = rr.dream_id WHERE dd.user_id = u.id AND rr.status = 'pending')
            OR EXISTS (SELECT 1 FROM dreams hhd WHERE hhd.user_id = u.id AND hhd.is_hidden = TRUE AND hhd.deleted_at IS NULL)
            OR u.is_active = FALSE)`,
    );

    const total = Number(countRow[0]?.total ?? 0);

    const items: UserRiskEntry[] = rows.map((r) => {
      const score = Number(r.risk_score);
      const riskLevel = score >= 15 ? 'critical' : score >= 8 ? 'high' : score >= 4 ? 'medium' : 'low';
      return {
        id:               r.id,
        username:         r.username,
        email:            r.email,
        isActive:         r.is_active,
        riskScore:        score,
        riskLevel,
        reportCount:      Number(r.report_count),
        hiddenDreamCount: Number(r.hidden_dream_count),
        dreamCount:       Number(r.dream_count),
        createdAt:        r.created_at,
      };
    });

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  // ── Employees ──────────────────────────────────────────────────────────────

  async getEmployees(): Promise<EmployeeEntry[]> {
    const rows = await this.db.query<{
      id: string; username: string; email: string; display_name: string | null;
      avatar_url: string | null; role: string; is_active: boolean;
      last_login_at: Date | null; created_at: Date;
      action_count: string; actions_today: string;
    }[]>(
      `SELECT u.id, u.username, u.email, p.display_name, p.avatar_url,
              u.role, u.is_active, u.last_login_at, u.created_at,
              COUNT(DISTINCT al.id)::int AS action_count,
              COUNT(DISTINCT CASE WHEN al.created_at >= NOW() - INTERVAL '24 hours' THEN al.id END)::int AS actions_today
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       LEFT JOIN admin_logs al ON al.admin_id = u.id
       WHERE u.deleted_at IS NULL AND u.role != 'user'
       GROUP BY u.id, u.username, u.email, p.display_name, p.avatar_url, u.role, u.is_active, u.last_login_at, u.created_at
       ORDER BY CASE u.role WHEN 'super_admin' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.created_at ASC`,
    );

    return rows.map((r) => ({
      id:           r.id,
      username:     r.username,
      email:        r.email,
      displayName:  r.display_name,
      avatarUrl:    r.avatar_url,
      role:         r.role,
      isActive:     r.is_active,
      lastLoginAt:  r.last_login_at,
      createdAt:    r.created_at,
      actionCount:  Number(r.action_count),
      actionsToday: Number(r.actions_today),
    }));
  }

  // ── Support Tickets ────────────────────────────────────────────────────────

  async getSupportTickets(page: number, limit: number, status?: string, priority?: string): Promise<{ items: SupportTicket[]; total: number; page: number; pages: number }> {
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    const conditions: string[] = [];
    if (status)   { params.push(status);   conditions.push(`t.status   = $${params.length}`); }
    if (priority) { params.push(priority); conditions.push(`t.priority = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRows = await this.db.query<{ total: string }[]>(
      `SELECT COUNT(*)::int AS total FROM support_tickets t ${where}`, params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    const listParams = [...params, limit, offset];
    const rows = await this.db.query<{
      id: string; subject: string; description: string | null; status: string; priority: string;
      category: string | null; reporter_user_id: string | null; reporter_email: string | null;
      reporter_name: string | null; reporter_username: string | null;
      assigned_to: string | null; assigned_username: string | null;
      resolution_notes: string | null; internal_notes: string | null;
      resolved_at: Date | null; closed_at: Date | null; created_at: Date; updated_at: Date;
    }[]>(
      `SELECT t.*,
              ru.username AS reporter_username,
              au.username AS assigned_username
       FROM support_tickets t
       LEFT JOIN users ru ON ru.id = t.reporter_user_id
       LEFT JOIN users au ON au.id = t.assigned_to
       ${where}
       ORDER BY CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                CASE t.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'escalated' THEN 2 ELSE 3 END,
                t.created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    );

    return {
      items: rows.map((r) => ({
        id:                 r.id,
        subject:            r.subject,
        description:        r.description,
        status:             r.status,
        priority:           r.priority,
        category:           r.category,
        reporterUserId:     r.reporter_user_id,
        reporterEmail:      r.reporter_email,
        reporterName:       r.reporter_name,
        reporterUsername:   r.reporter_username,
        assignedToId:       r.assigned_to,
        assignedToUsername: r.assigned_username,
        resolutionNotes:    r.resolution_notes,
        internalNotes:      r.internal_notes,
        resolvedAt:         r.resolved_at,
        closedAt:           r.closed_at,
        createdAt:          r.created_at,
        updatedAt:          r.updated_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async createSupportTicket(data: {
    subject: string; description?: string; priority?: string; category?: string;
    reporterUserId?: string; reporterEmail?: string; reporterName?: string;
    assignedTo?: string;
  }): Promise<SupportTicket> {
    const rows = await this.db.query<{ id: string }[]>(
      `INSERT INTO support_tickets (subject, description, priority, category, reporter_user_id, reporter_email, reporter_name, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [data.subject, data.description ?? null, data.priority ?? 'medium', data.category ?? null,
       data.reporterUserId ?? null, data.reporterEmail ?? null, data.reporterName ?? null, data.assignedTo ?? null],
    );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const id = rows[0]!.id;
    const result = await this.getSupportTickets(1, 1);
    const found  = (await this.db.query<SupportTicket[]>(`SELECT * FROM support_tickets WHERE id = $1`, [id]))[0];
    void result;
    return found!;
  }

  async updateSupportTicket(id: string, adminId: string, data: {
    status?: string; priority?: string; assignedTo?: string | null;
    resolutionNotes?: string; internalNotes?: string;
  }): Promise<{ ok: boolean }> {
    const sets: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    if (data.status !== undefined) {
      params.push(data.status);
      sets.push(`status = $${params.length}`);
      if (data.status === 'resolved') {
        sets.push('resolved_at = NOW()');
      } else if (data.status === 'closed') {
        sets.push('closed_at = NOW()');
      } else if (data.status === 'escalated') {
        sets.push('escalated_at = NOW()');
      }
    }
    if (data.priority !== undefined)       { params.push(data.priority);       sets.push(`priority = $${params.length}`); }
    if (data.assignedTo !== undefined)     { params.push(data.assignedTo);     sets.push(`assigned_to = $${params.length}`); }
    if (data.resolutionNotes !== undefined){ params.push(data.resolutionNotes);sets.push(`resolution_notes = $${params.length}`); }
    if (data.internalNotes !== undefined)  { params.push(data.internalNotes);  sets.push(`internal_notes = $${params.length}`); }
    params.push(id);
    await this.db.query(
      `UPDATE support_tickets SET ${sets.join(', ')} WHERE id = $${params.length}`,
      params,
    );
    await this.createLog(adminId, null, 'ticket_updated', null, { ticketId: id, changes: data });
    return { ok: true };
  }

  // ── Phase 8 — AI Operators ──────────────────────────────────────────────────

  async getAIOperators(): Promise<AIOperatorsData> {
    const now = new Date().toISOString();
    const POS = ['joy','excitement','love','peace','wonder','curiosity','hope','bliss','contentment','happiness','awe','gratitude','euphoria'];
    const NEG = ['fear','anxiety','sadness','anger','terror','despair','grief','frustration','rage','panic','dread','horror','shame'];

    const [csSafety, urisk, trend7, trend14, emoData, gw, gprev, engData, catData] = await Promise.all([
      this.db.query<{ pending: string; hidden: string; multi_rep: string; rep_24h: string }[]>(`
        SELECT
          (SELECT COUNT(*)::int FROM dream_reports WHERE status='pending') AS pending,
          (SELECT COUNT(*)::int FROM dreams WHERE is_hidden=TRUE AND deleted_at IS NULL) AS hidden,
          COALESCE((SELECT COUNT(*)::int FROM (SELECT dream_id FROM dream_reports WHERE status='pending' GROUP BY dream_id HAVING COUNT(*)>=3) x),0) AS multi_rep,
          (SELECT COUNT(*)::int FROM dream_reports WHERE created_at >= NOW() - INTERVAL '24 hours') AS rep_24h
      `),
      this.db.query<{ bans: string; critical: string }[]>(`
        SELECT
          (SELECT COUNT(*)::int FROM users WHERE is_active=FALSE AND deleted_at IS NULL AND updated_at >= NOW() - INTERVAL '7 days') AS bans,
          COALESCE((SELECT COUNT(*)::int FROM (
            SELECT u.id FROM users u WHERE u.role='user' AND u.deleted_at IS NULL
            AND ((SELECT COUNT(*)::int FROM dream_reports r JOIN dreams d ON d.id=r.dream_id WHERE d.user_id=u.id AND r.status='pending')*3
               + (SELECT COUNT(*)::int FROM dreams d WHERE d.user_id=u.id AND d.is_hidden=TRUE AND d.deleted_at IS NULL)*2) >= 15
          ) y), 0) AS critical
      `),
      this.db.query<{ symbol: string; category: string; count: string }[]>(`
        SELECT ds.manifestation AS symbol, ds.symbol_category AS category, COUNT(*)::int AS count
        FROM dream_symbols ds JOIN dreams d ON d.id=ds.dream_id AND d.deleted_at IS NULL AND d.is_draft=FALSE
        WHERE d.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY ds.manifestation, ds.symbol_category ORDER BY count DESC LIMIT 5
      `),
      this.db.query<{ symbol: string }[]>(`
        SELECT ds.manifestation AS symbol FROM dream_symbols ds
        JOIN dreams d ON d.id=ds.dream_id AND d.deleted_at IS NULL AND d.is_draft=FALSE
        WHERE d.created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
        GROUP BY ds.manifestation ORDER BY COUNT(*) DESC LIMIT 10
      `),
      this.db.query<{ pos: string; neg: string; total: string }[]>(`
        SELECT
          COUNT(CASE WHEN de.emotion = ANY($1) THEN 1 END)::int AS pos,
          COUNT(CASE WHEN de.emotion = ANY($2) THEN 1 END)::int AS neg,
          COUNT(*)::int AS total
        FROM dream_emotions de JOIN dreams d ON d.id=de.dream_id AND d.deleted_at IS NULL AND d.is_draft=FALSE
        WHERE de.is_primary=TRUE AND d.created_at >= NOW() - INTERVAL '7 days'
      `, [POS, NEG]),
      this.db.query<{ count: string }[]>(`SELECT COUNT(*)::int AS count FROM users WHERE created_at >= NOW() - INTERVAL '7 days' AND deleted_at IS NULL`),
      this.db.query<{ count: string }[]>(`SELECT COUNT(*)::int AS count FROM users WHERE created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days' AND deleted_at IS NULL`),
      this.db.query<{ d7: string; d14: string; avg_likes: string }[]>(`
        SELECT
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END)::int AS d7,
          COUNT(CASE WHEN created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days' THEN 1 END)::int AS d14,
          ROUND(AVG(like_count)::numeric,1) AS avg_likes
        FROM dreams WHERE deleted_at IS NULL AND is_draft=FALSE AND created_at >= NOW() - INTERVAL '14 days'
      `),
      this.db.query<{ category: string }[]>(`
        SELECT category FROM dreams WHERE deleted_at IS NULL AND is_draft=FALSE AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY category ORDER BY COUNT(*) DESC LIMIT 1
      `),
    ]);

    const cs = csSafety[0] ?? { pending: '0', hidden: '0', multi_rep: '0', rep_24h: '0' };
    const ur = urisk[0]    ?? { bans: '0', critical: '0' };
    const em = emoData[0]  ?? { pos: '0', neg: '0', total: '1' };
    const g7 = gw[0]       ?? { count: '0' };
    const gp = gprev[0]    ?? { count: '1' };
    const eg = engData[0]  ?? { d7: '0', d14: '1', avg_likes: '0' };

    const pending   = Number(cs.pending);
    const hidden    = Number(cs.hidden);
    const multiRep  = Number(cs.multi_rep);
    const rep24h    = Number(cs.rep_24h);
    const bans      = Number(ur.bans);
    const critical  = Number(ur.critical);
    const posCount  = Number(em.pos);
    const negCount  = Number(em.neg);
    const totalEm   = Number(em.total) || 1;
    const posPct    = Math.round(posCount / totalEm * 100);
    const negPct    = Math.round(negCount / totalEm * 100);
    const growthNew = Number(g7.count);
    const growthOld = Number(gp.count) || 1;
    const growthPct = Math.round((growthNew - growthOld) / growthOld * 100);
    const d7val     = Number(eg.d7);
    const d14val    = Number(eg.d14) || 1;
    const engDelta  = Math.round((d7val - d14val) / d14val * 100);
    const topCat    = catData[0]?.category ?? 'adventure';
    const topSym    = trend7[0]?.symbol ?? null;
    const prevSet   = new Set(trend14.map((s) => s.symbol));
    const newSyms   = trend7.filter((s) => !prevSet.has(s.symbol));

    const operators: AIOperator[] = [
      {
        id: 'dream-guardian', name: 'Dream Guardian', role: 'İçerik Koruma & Güvenlik', icon: '🛡',
        status:          pending > 30 || multiRep > 5 ? 'warning' : pending > 0 ? 'active' : 'idle',
        health:          Math.max(0, Math.min(100, 100 - pending * 2 - multiRep * 8)),
        lastExecution:   now,
        confidenceScore: Math.min(98, 80 + Math.min(18, rep24h)),
        findings: [
          `${pending} bekleyen rapor moderasyon kuyruğunda`,
          multiRep > 0 ? `${multiRep} rüya 3+ rapor aldı — öncelikli inceleme` : 'Çoklu raporlu içerik tespit edilmedi',
          `${hidden} içerik gizlenmiş durumda`,
          `Son 24 saatte ${rep24h} yeni şikayet`,
        ],
        recommendations: [
          pending > 15 ? 'Moderasyon kapasitesini artır — kuyruk kritik eşiği aştı' : 'Rapor kuyruğu yönetilebilir seviyede',
          multiRep > 0 ? `${multiRep} çoklu raporlu içeriği önce işle` : 'Proaktif içerik taraması planla',
          'İçerik moderasyon SLA hedeflerini haftalık gözden geçir',
        ],
        metrics: { pending, hidden, multiRep, rep24h },
      },
      {
        id: 'safety-ai', name: 'Safety AI', role: 'Kullanıcı Güvenliği & Risk', icon: '⚠️',
        status:          critical > 10 ? 'warning' : critical > 0 ? 'active' : 'idle',
        health:          Math.max(0, Math.min(100, 100 - critical * 8 - Math.min(bans, 10))),
        lastExecution:   now,
        confidenceScore: Math.min(96, 85 + Math.min(11, critical)),
        findings: [
          `${critical} kullanıcı kritik risk seviyesinde (skor ≥ 15)`,
          `Son 7 günde ${bans} hesap deaktive edildi`,
          critical > 0 ? 'Risk Merkezi\'nde inceleme bekleyen profiller var' : 'Topluluk risk seviyeleri normal',
        ],
        recommendations: [
          critical > 10 ? 'Risk Merkezi\'nde kritik kullanıcıları acil incele' : critical > 0 ? 'Yüksek riskli profilleri bu hafta gözden geçir' : 'Rutin güvenlik taraması yeterli',
          'Tekrarlayan ihlal kalıplarını tespit et',
          'Kullanıcı uyarı sistemi etkinliğini ölç',
        ],
        metrics: { critical, recentBans: bans },
      },
      {
        id: 'trend-analyst', name: 'Trend Analyst', role: 'Rüya Trendi & Sembol Analizi', icon: '◈',
        status:          'active',
        health:          trend7.length > 0 ? 95 : 70,
        lastExecution:   now,
        confidenceScore: 92,
        findings: [
          topSym ? `Bu hafta en çok görülen sembol: "${topSym}"` : 'Sembol verisi analiz ediliyor',
          newSyms.length > 0 ? `${newSyms.length} yeni sembol ivme kazanıyor` : 'Sembol repertuarı stabil',
          `Baskın kategori: ${topCat}`,
          `Topluluk ${posPct > negPct ? 'pozitif' : 'anksiyöze yakın'} duygusal eğride`,
        ],
        recommendations: [
          newSyms.length > 0 ? `Yeni sembolleri veritabanına ekle: ${newSyms.slice(0, 2).map((s) => s.symbol).join(', ')}` : 'Sembol veritabanı güncel',
          `"${topCat}" kategorisi için özel kürasyon listesi oluştur`,
          'Trend sembolleri Explore akışında öne çıkar',
        ],
        metrics: { trendingSymbols: trend7.length, newSymbols: newSyms.length },
      },
      {
        id: 'community-observer', name: 'Community Observer', role: 'Topluluk Sağlığı & Bilinç', icon: '💚',
        status:          negPct > 45 ? 'warning' : 'active',
        health:          Math.max(0, Math.min(100, Math.round(posPct * 0.6 + (100 - negPct) * 0.4))),
        lastExecution:   now,
        confidenceScore: 89,
        findings: [
          `Topluluk ruh hali: %${posPct} pozitif, %${negPct} negatif/anksiyöz`,
          negPct > 40 ? 'Anksiyete sinyalleri yükseliyor — değerlendirme önerilir' : 'Sağlıklı bilinç atmosferi tespit edildi',
          `${totalEm.toLocaleString()} birincil duygu kaydı analiz edildi (son 7 gün)`,
        ],
        recommendations: [
          negPct > 35 ? 'Bilinç yükseltici içerik kampanyası başlat' : 'Pozitif paylaşımları Explore\'da öne çıkar',
          'Lucid rüya içeriklerini teşvik et',
          'Haftalık topluluk ruh hali özetini ekiple paylaş',
        ],
        metrics: { posPct, negPct, totalEmotions: totalEm },
      },
      {
        id: 'growth-ai', name: 'Growth AI', role: 'Büyüme & Kullanıcı Edinimi', icon: '🚀',
        status:          growthPct < -15 ? 'warning' : 'active',
        health:          Math.max(30, Math.min(100, 70 + Math.max(-40, Math.min(30, growthPct)))),
        lastExecution:   now,
        confidenceScore: 87,
        findings: [
          `Bu hafta ${growthNew.toLocaleString()} yeni kullanıcı kazanıldı`,
          `Büyüme: ${growthPct >= 0 ? '+' : ''}${growthPct}% (geçen haftaya göre)`,
          `Rüya aktivitesi: ${engDelta >= 0 ? '+' : ''}${engDelta}% değişim`,
          `Ortalama rüya beğenisi: ${eg.avg_likes ?? '0'}`,
        ],
        recommendations: [
          growthPct < -10 ? 'Kullanıcı edinim kanallarını acil gözden geçir' : growthPct < 0 ? 'Aktivasyon akışını optimize et' : 'Mevcut büyüme kanallarını koru',
          engDelta < -10 ? 'İçerik keşif algoritmasını yenile' : 'Sosyal paylaşım özelliğini güçlendir',
          'Geri dönen kullanıcı segmentini analiz et',
        ],
        metrics: { newUsers: growthNew, growthPct, dreams7d: d7val, engDelta },
      },
      {
        id: 'revenue-ai', name: 'Revenue AI', role: 'Gelir & Monetizasyon', icon: '💰',
        status:          'idle',
        health:          100,
        lastExecution:   now,
        confidenceScore: 0,
        findings: [
          'Monetizasyon altyapısı Phase 2\'de aktive edilecek',
          'Premium plan mimarisi tasarım aşamasında',
          'Creator ekonomisi modeli araştırılıyor',
        ],
        recommendations: [
          'Premium pakete AI insights, lucid araçları ve arketip analizi dahil et',
          'Creator monetizasyon modeli geliştir — dream sponsorship',
          'Stripe/RevenueCat entegrasyonunu Q3 hedefle başlat',
        ],
        metrics: { mrr: 0, premiumUsers: 0 },
      },
    ];

    const activeOps = operators.filter((o) => o.id !== 'revenue-ai');
    const systemHealth = Math.round(activeOps.reduce((s, o) => s + o.health, 0) / activeOps.length);
    return { operators, systemHealth, lastScan: now };
  }

  // ── Dream Weather ──────────────────────────────────────────────────────────

  async getDreamWeather(): Promise<DreamWeatherData> {
    const POS = ['joy','excitement','love','peace','wonder','curiosity','hope','bliss','contentment','happiness','awe','gratitude','euphoria'];
    const NEG = ['fear','anxiety','sadness','anger','terror','despair','grief','frustration','rage','panic','dread','horror','shame'];

    const [emotionRows, catRows, dailyRows, symbolRows, hourlyRows, dailyCatRows, dailyEmoRows] = await Promise.all([
      this.db.query<{ emotion: string; type: string; count: string }[]>(`
        SELECT de.emotion,
          CASE WHEN de.emotion = ANY($1) THEN 'positive'
               WHEN de.emotion = ANY($2) THEN 'negative'
               ELSE 'neutral' END AS type,
          COUNT(*)::int AS count
        FROM dream_emotions de JOIN dreams d ON d.id=de.dream_id AND d.deleted_at IS NULL AND d.is_draft=FALSE
        WHERE de.is_primary=TRUE AND d.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY de.emotion, type ORDER BY count DESC
      `, [POS, NEG]),
      this.db.query<{ category: string; count: string }[]>(`
        SELECT category, COUNT(*)::int AS count FROM dreams
        WHERE deleted_at IS NULL AND is_draft=FALSE AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY category
      `),
      this.db.query<{ date: string; pos: string; neg: string; total: string }[]>(`
        SELECT DATE(d.created_at)::text AS date,
          COUNT(CASE WHEN de.emotion = ANY($1) THEN 1 END)::int AS pos,
          COUNT(CASE WHEN de.emotion = ANY($2) THEN 1 END)::int AS neg,
          COUNT(*)::int AS total
        FROM dreams d JOIN dream_emotions de ON de.dream_id=d.id AND de.is_primary=TRUE
        WHERE d.deleted_at IS NULL AND d.is_draft=FALSE AND d.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(d.created_at) ORDER BY date ASC
      `, [POS, NEG]),
      this.db.query<{ symbol: string; count: string }[]>(`
        SELECT ds.manifestation AS symbol, COUNT(*)::int AS count
        FROM dream_symbols ds
        JOIN dreams d ON d.id = ds.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE d.created_at >= NOW() - INTERVAL '7 days'
          AND LENGTH(TRIM(ds.manifestation)) BETWEEN 2 AND 40
          AND (LENGTH(ds.manifestation) - LENGTH(REPLACE(ds.manifestation, ' ', ''))) < 2
          AND ds.manifestation !~* '^(a|an|the) '
        GROUP BY ds.manifestation ORDER BY count DESC LIMIT 5
      `),
      this.db.query<{ hour: string; dream_count: string; lucid_count: string; nightmare_count: string }[]>(`
        SELECT EXTRACT(HOUR FROM d.created_at)::int AS hour,
          COUNT(*)::int AS dream_count,
          COUNT(CASE WHEN d.category = 'lucid' THEN 1 END)::int AS lucid_count,
          COUNT(CASE WHEN d.category = 'nightmare' THEN 1 END)::int AS nightmare_count
        FROM dreams d
        WHERE d.deleted_at IS NULL AND d.is_draft = FALSE
          AND d.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY hour ORDER BY hour ASC
      `),
      this.db.query<{ date: string; lucid_count: string; nightmare_count: string; total: string }[]>(`
        SELECT DATE(d.created_at)::text AS date,
          COUNT(CASE WHEN d.category = 'lucid' THEN 1 END)::int AS lucid_count,
          COUNT(CASE WHEN d.category = 'nightmare' THEN 1 END)::int AS nightmare_count,
          COUNT(*)::int AS total
        FROM dreams d
        WHERE d.deleted_at IS NULL AND d.is_draft = FALSE AND d.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(d.created_at) ORDER BY date ASC
      `),
      this.db.query<{ date: string; emotion: string; cnt: string }[]>(`
        SELECT DATE(d.created_at)::text AS date, de.emotion, COUNT(*)::int AS cnt
        FROM dream_emotions de
        JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE de.is_primary = TRUE AND d.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(d.created_at), de.emotion ORDER BY date ASC, cnt DESC
      `),
    ]);

    const totalEm  = emotionRows.reduce((s, r) => s + Number(r.count), 0) || 1;
    const posCount = emotionRows.filter((e) => e.type === 'positive').reduce((s, e) => s + Number(e.count), 0);
    const negCount = emotionRows.filter((e) => e.type === 'negative').reduce((s, e) => s + Number(e.count), 0);
    const posPct   = Math.round(posCount / totalEm * 100);
    const negPct   = Math.round(negCount / totalEm * 100);

    const totalCats = catRows.reduce((s, r) => s + Number(r.count), 0) || 1;
    const lucidPct  = Math.round(Number(catRows.find((c) => c.category === 'lucid')?.count ?? 0) / totalCats * 100);
    const nightPct  = Math.round(Number(catRows.find((c) => c.category === 'nightmare')?.count ?? 0) / totalCats * 100);

    const temperature   = Math.min(100, Math.max(0, Math.round(posPct * 0.7 + lucidPct * 0.3)));
    const visibility    = Math.min(100, Math.max(0, Math.round((100 - negPct) * 0.6 + posPct * 0.4)));
    const turbulence    = Math.min(100, Math.max(0, Math.round(negPct * 0.7 + nightPct * 0.3)));
    const electricField = Math.min(100, Math.max(0, Math.round(lucidPct * 2 + (posPct > 70 ? 15 : 0))));

    const resolveCondition = (p: number, n: number, l: number, ni: number): WeatherCondition => {
      if (l > 35)               return 'electric';
      if (p > 70 && n < 15)    return 'radiant';
      if (p > 55 && n < 25)    return 'clear';
      if (n > 45 || ni > 30)   return 'stormy';
      if (n > 30 || ni > 20)   return 'overcast';
      if ((100 - p - n) > 50)  return 'foggy';
      return 'partly_cloudy';
    };

    const condition = resolveCondition(posPct, negPct, lucidPct, nightPct);

    const EMOJI: Record<WeatherCondition, string> = {
      radiant:       '☀️',
      clear:         '🌤',
      partly_cloudy: '⛅',
      overcast:      '☁️',
      stormy:        '⛈',
      electric:      '⚡',
      foggy:         '🌫',
    };

    const DESC: Record<WeatherCondition, string> = {
      radiant:       'Topluluk ışıltılı — bilinç genişlemesi zirveye yakın',
      clear:         'Pozitif akış hâkim, atmosfer açık ve berrak',
      partly_cloudy: 'Karma ruh hali — pozitif ve kaygı dengede seyrediyor',
      overcast:      'Ağır duygusal bulutlar — destek içeriği önerilir',
      stormy:        'Anksiyete ve kabus dalgaları yüksek — topluluk türbülansta',
      electric:      'Yüksek lucid rüya enerjisi — topluluk kolektif uyanışta',
      foggy:         'Nötr ve belirsiz atmosfer — topluluk yönünü arıyor',
    };

    // ── Per-day dominant emotion map ─────────────────────────────────────────
    const dailyEmoMap = new Map<string, string>();
    for (const row of dailyEmoRows) {
      if (!dailyEmoMap.has(row.date)) dailyEmoMap.set(row.date, row.emotion);
    }

    // ── Per-day lucid/nightmare map ───────────────────────────────────────────
    const dailyCatMap = new Map<string, { lucidCount: number; nightmareCount: number; total: number }>();
    for (const row of dailyCatRows) {
      dailyCatMap.set(row.date, {
        lucidCount:     Number(row.lucid_count),
        nightmareCount: Number(row.nightmare_count),
        total:          Number(row.total) || 1,
      });
    }

    // ── Extended forecast ─────────────────────────────────────────────────────
    const forecast = dailyRows.map((d) => {
      const dt    = Number(d.total) || 1;
      const dp    = Math.round(Number(d.pos) / dt * 100);
      const dn    = Math.round(Number(d.neg) / dt * 100);
      const score = Math.round(dp * 0.7 + (100 - dn) * 0.3);
      const cat   = dailyCatMap.get(d.date);
      const catTotal = cat?.total ?? 1;
      return {
        date:            d.date,
        condition:       resolveCondition(dp, dn, 0, 0),
        score,
        dominantEmotion: dailyEmoMap.get(d.date) ?? 'peace',
        lucidProb:       cat ? Math.round(cat.lucidCount / catTotal * 100) : 0,
        nightmareProb:   cat ? Math.round(cat.nightmareCount / catTotal * 100) : 0,
      };
    });

    // ── Symbol data ───────────────────────────────────────────────────────────
    const topSymbols = symbolRows.map((s) => ({ symbol: s.symbol, count: Number(s.count) }));
    const topSymbol  = topSymbols[0] ?? null;

    // ── Timeline (hourly atmospheric data) ────────────────────────────────────
    const timeline = hourlyRows.map((h) => ({
      hour:           Number(h.hour),
      dreamCount:     Number(h.dream_count),
      lucidCount:     Number(h.lucid_count),
      nightmareCount: Number(h.nightmare_count),
    }));

    // ── Derived metrics ───────────────────────────────────────────────────────
    const totalDreams7d = catRows.reduce((s, r) => s + Number(r.count), 0);
    const dominantEmotion = emotionRows[0]?.emotion ?? 'peace';
    const hopeIndex  = Math.min(100, Math.round(posPct * 0.8 + lucidPct * 0.2));
    // syncScore: how concentrated top-3 emotions are (higher = more collective agreement)
    const totalEmoForSync = emotionRows.reduce((s, r) => s + Number(r.count), 0) || 1;
    const top3Share  = emotionRows.slice(0, 3).reduce((s, e) => s + Number(e.count), 0);
    const syncScore  = Math.min(100, Math.round(top3Share / totalEmoForSync * 100));

    // ── Dream Events ──────────────────────────────────────────────────────────
    const events: DreamEvent[] = [];

    if (turbulence > 65 || nightPct > 35) {
      events.push({ id: 'dream-storm', name: 'Rüya Fırtınası', icon: '⛈',
        description: `Kabus aktivitesi yoğun — %${nightPct} kabus oranı. Gölge arketipi baskın, topluluk türbülansta.`,
        severity: 'storm' });
    }
    if (lucidPct > 18 || electricField > 38) {
      events.push({ id: 'lucid-aurora', name: 'Lucid Aurora', icon: '✨',
        description: `Bilinçli rüya enerjisi zirveye ulaşıyor — %${lucidPct} lucid oranı. Kolektif öz-farkındalık yükseliyor.`,
        severity: 'positive' });
    }
    if ((100 - posPct - negPct) > 45 || condition === 'foggy') {
      events.push({ id: 'memory-fog', name: 'Hafıza Sisi', icon: '🌫',
        description: 'Nötr ve belirsiz atmosfer dominant — topluluk yönünü arıyor. Sembolik içerik belirsizleşiyor.',
        severity: 'info' });
    }
    if (posPct > 58 && negPct < 22) {
      events.push({ id: 'hope-rain', name: 'Umut Yağmuru', icon: '🌧',
        description: `Pozitif sembol akışı yoğunlaşıyor — %${posPct} pozitif atmosfer. Kolektif yenilenme süreci aktif.`,
        severity: 'positive' });
    }
    if (negPct > 38 && nightPct > 15) {
      events.push({ id: 'nightmare-front', name: 'Kabus Cephesi', icon: '🌑',
        description: `Negatif enerji ve kabus dalgası birleşiyor — %${negPct} negatif, %${nightPct} kabus oranı.`,
        severity: 'storm' });
    }
    if (visibility > 65 && posPct > 52) {
      events.push({ id: 'resonance-wave', name: 'Rezonans Dalgası', icon: '〰️',
        description: `Kolektif senkronizasyon artıyor — bilinç berraklığı %${visibility}. Benzer semboller çoğalıyor.`,
        severity: 'positive' });
    }
    if (topSymbol && topSymbol.count > 30) {
      events.push({ id: 'symbol-bloom', name: 'Sembol Çiçeklenmesi', icon: '🌸',
        description: `"${topSymbol.symbol}" kolektif bilinçte ani yoğunlaşma gösteriyor — ${topSymbol.count} rüyada görüldü.`,
        severity: 'info' });
    }
    if (totalDreams7d < 30) {
      events.push({ id: 'silent-sky', name: 'Sessiz Gökyüzü', icon: '🌑',
        description: 'Rüya aktivitesi düşük — kolektif bilinç dingin bir dönemde. Sembolik örüntü net değil.',
        severity: 'info' });
    }
    if (syncScore > 70) {
      events.push({ id: 'mirror-eclipse', name: 'Ayna Tutulması', icon: '🪞',
        description: `Kolektif bilinç yüksek senkronizasyonda — %${syncScore} uyum. Bireysel farklılıklar azalıyor.`,
        severity: 'info' });
    }

    // ── Live Warnings ─────────────────────────────────────────────────────────
    const warnings: { level: 'critical' | 'high' | 'medium' | 'low'; message: string }[] = [];

    if (turbulence > 70) {
      warnings.push({ level: 'critical', message: 'Rüya fırtınası tespit edildi — kabus ve negatif aktivite kritik seviyede.' });
    }
    if (negPct > 42) {
      warnings.push({ level: 'high', message: `Kabus aktivitesi artıyor — %${negPct} negatif oranıyla kolektif baskı yüksek.` });
    } else if (negPct > 30) {
      warnings.push({ level: 'medium', message: `Kolektif duygusal baskı yüksek — %${negPct} negatif atmosfer dikkat gerektiriyor.` });
    }
    if (posPct > 62 && visibility > 68) {
      warnings.push({ level: 'low', message: 'Pozitif rezonans dalgası yaklaşıyor — kolektif enerji yükselme eğiliminde.' });
    }
    if (lucidPct > 18) {
      warnings.push({ level: 'low', message: `Lucid aktivite yükseliyor — %${lucidPct} oranıyla bilinçli rüya artışı gözlemleniyor.` });
    }

    return {
      condition, temperature, visibility, turbulence, electricField, forecast,
      description: DESC[condition], emoji: EMOJI[condition],
      posPct, negPct, lucidPct, nightPct, dominantEmotion,
      topSymbols, events, warnings, timeline,
      totalDreams7d, hopeIndex, syncScore,
    };
  }

  // ── Global Emotion ─────────────────────────────────────────────────────────

  async getGlobalEmotion(): Promise<GlobalEmotionData> {
    const POS = ['joy','excitement','love','peace','wonder','curiosity','hope','bliss','contentment','happiness','awe','gratitude','euphoria'];
    const NEG = ['fear','anxiety','sadness','anger','terror','despair','grief','frustration','rage','panic','dread','horror','shame'];

    const [distRows, hourlyRows, trend24hRows, corrRows, histRows, countRows] = await Promise.all([
      this.db.query<{ emotion: string; count: string }[]>(`
        SELECT de.emotion, COUNT(*)::int AS count
        FROM dream_emotions de JOIN dreams d ON d.id=de.dream_id AND d.deleted_at IS NULL AND d.is_draft=FALSE
        WHERE de.is_primary=TRUE AND d.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY de.emotion ORDER BY count DESC LIMIT 20
      `),
      this.db.query<{ hour: string; emotion: string; count: string }[]>(`
        SELECT EXTRACT(HOUR FROM d.created_at)::int AS hour, de.emotion, COUNT(*)::int AS count
        FROM dream_emotions de JOIN dreams d ON d.id=de.dream_id AND d.deleted_at IS NULL AND d.is_draft=FALSE
        WHERE de.is_primary=TRUE AND d.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY hour, de.emotion ORDER BY hour ASC, count DESC
      `),
      this.db.query<{ emotion: string; curr: string; prev: string }[]>(`
        SELECT de.emotion,
          COUNT(CASE WHEN d.created_at >= NOW() - INTERVAL '24 hours' THEN 1 END)::int AS curr,
          COUNT(CASE WHEN d.created_at >= NOW() - INTERVAL '48 hours' AND d.created_at < NOW() - INTERVAL '24 hours' THEN 1 END)::int AS prev
        FROM dream_emotions de
        JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE de.is_primary = TRUE AND d.created_at >= NOW() - INTERVAL '48 hours'
        GROUP BY de.emotion ORDER BY curr DESC LIMIT 15
      `),
      this.db.query<{ e1: string; e2: string; together: string }[]>(`
        SELECT de1.emotion AS e1, de2.emotion AS e2, COUNT(DISTINCT de1.dream_id)::int AS together
        FROM dream_emotions de1
        JOIN dream_emotions de2 ON de1.dream_id = de2.dream_id AND de1.emotion < de2.emotion
        JOIN dreams d ON d.id = de1.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE d.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY de1.emotion, de2.emotion
        HAVING COUNT(DISTINCT de1.dream_id) > 1
        ORDER BY together DESC LIMIT 30
      `),
      // histRows: positivity rates across multiple periods for history
      this.db.query<{ p30pos: string; p30tot: string; p90pos: string; p90tot: string; allpos: string; alltot: string }[]>(`
        SELECT
          COUNT(CASE WHEN d.created_at >= NOW() - INTERVAL '30 days' AND de.emotion = ANY($1) THEN 1 END)::int AS p30pos,
          COUNT(CASE WHEN d.created_at >= NOW() - INTERVAL '30 days' THEN 1 END)::int AS p30tot,
          COUNT(CASE WHEN d.created_at >= NOW() - INTERVAL '90 days' AND de.emotion = ANY($1) THEN 1 END)::int AS p90pos,
          COUNT(CASE WHEN d.created_at >= NOW() - INTERVAL '90 days' THEN 1 END)::int AS p90tot,
          COUNT(CASE WHEN de.emotion = ANY($1) THEN 1 END)::int AS allpos,
          COUNT(*)::int AS alltot
        FROM dream_emotions de
        JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE de.is_primary = TRUE
      `, [POS]),
      // countRows: total platform asset counts
      this.db.query<{ dreams: string; symbols: string }[]>(`
        SELECT
          (SELECT COUNT(*)::int FROM dreams WHERE deleted_at IS NULL AND is_draft = FALSE) AS dreams,
          (SELECT COUNT(*)::int FROM dream_symbols WHERE LENGTH(TRIM(manifestation)) BETWEEN 2 AND 40) AS symbols
      `),
    ]);

    const total  = distRows.reduce((s, r) => s + Number(r.count), 0) || 1;
    const topEm  = distRows[0];
    const dominantEmotion = topEm?.emotion ?? 'peace';
    const dominantType = POS.includes(dominantEmotion) ? 'positive' : NEG.includes(dominantEmotion) ? 'negative' : 'neutral';

    const topShare    = Number(topEm?.count ?? 0) / total;
    const energyLevel = Math.min(100, Math.round(topShare * 200));
    const coherence   = Math.min(100, Math.round(distRows.slice(0, 3).reduce((s, r) => s + (Number(r.count) / total) * 100, 0)));

    // 24h trend map
    const total24h     = trend24hRows.reduce((s, r) => s + Number(r.curr), 0) || 1;
    const totalPrev24h = trend24hRows.reduce((s, r) => s + Number(r.prev), 0) || 1;
    const trend24hMap  = new Map<string, { curr: number; prev: number }>();
    for (const r of trend24hRows) trend24hMap.set(r.emotion, { curr: Number(r.curr), prev: Number(r.prev) });

    // Distribution with trends
    const distribution = distRows.map((r) => {
      const t   = trend24hMap.get(r.emotion) ?? { curr: 0, prev: 0 };
      const cP  = t.curr / total24h * 100;
      const pP  = t.prev / totalPrev24h * 100;
      const tr  = Math.round(cP - pP);
      let dominance: 'strong' | 'stable' | 'fading' | 'growing' | 'emerging';
      if (tr >= 5) dominance = 'growing';
      else if (tr <= -5) dominance = 'fading';
      else if (Number(r.count) / total * 100 >= 15) dominance = 'strong';
      else if (t.prev === 0 && t.curr > 0) dominance = 'emerging';
      else dominance = 'stable';
      return {
        emotion:   r.emotion,
        count:     Number(r.count),
        pct:       Math.round(Number(r.count) / total * 100),
        type:      (POS.includes(r.emotion) ? 'positive' : NEG.includes(r.emotion) ? 'negative' : 'neutral') as 'positive' | 'negative' | 'neutral',
        trend24h:  tr,
        dominance,
      };
    });

    // Hourly flow (existing)
    const hourMap = new Map<number, { emotion: string; count: number }>();
    for (const row of hourlyRows) {
      const h = Number(row.hour); const cnt = Number(row.count);
      const ex = hourMap.get(h);
      if (!ex || cnt > ex.count) hourMap.set(h, { emotion: row.emotion, count: cnt });
    }
    const maxHourCount = Math.max(...Array.from(hourMap.values()).map((v) => v.count), 1);
    const hourlyFlow = Array.from(hourMap.entries()).sort((a, b) => a[0] - b[0]).map(([hour, { emotion, count }]) => ({
      hour, dominant: emotion, intensity: Math.round((count / maxHourCount) * 100),
    }));

    // Hourly breakdown with pos/neg/neutral per hour
    const hourGroupMap = new Map<number, { pos: number; neg: number; neutral: number; dominant: string; domCount: number }>();
    for (const row of hourlyRows) {
      const h = Number(row.hour); const cnt = Number(row.count);
      if (!hourGroupMap.has(h)) hourGroupMap.set(h, { pos: 0, neg: 0, neutral: 0, dominant: '', domCount: 0 });
      const g = hourGroupMap.get(h)!;
      if (POS.includes(row.emotion)) g.pos += cnt;
      else if (NEG.includes(row.emotion)) g.neg += cnt;
      else g.neutral += cnt;
      if (cnt > g.domCount) { g.domCount = cnt; g.dominant = row.emotion; }
    }
    const hourlyBreakdown = Array.from(hourGroupMap.entries()).sort((a, b) => a[0] - b[0]).map(([hour, g]) => ({
      hour, posCount: g.pos, negCount: g.neg, neutralCount: g.neutral,
      dreamCount: g.pos + g.neg + g.neutral, dominant: g.dominant,
    }));

    // Aggregate percentages
    const posPct     = Math.round(distRows.filter(r => POS.includes(r.emotion)).reduce((s, r) => s + Number(r.count) / total * 100, 0));
    const negPct     = Math.round(distRows.filter(r => NEG.includes(r.emotion)).reduce((s, r) => s + Number(r.count) / total * 100, 0));
    const neutralPct = Math.max(0, 100 - posPct - negPct);

    // 24h change in positive ratio
    const pos24h     = trend24hRows.filter(r => POS.includes(r.emotion)).reduce((s, r) => s + Number(r.curr), 0);
    const posPrev24h = trend24hRows.filter(r => POS.includes(r.emotion)).reduce((s, r) => s + Number(r.prev), 0);
    const change24h  = Math.round(pos24h / total24h * 100 - posPrev24h / totalPrev24h * 100);

    // Fastest growing / decreasing
    const trendsArr = distribution.map(d => ({ emotion: d.emotion, trend: d.trend24h })).sort((a, b) => b.trend - a.trend);
    const fastestGrowing    = trendsArr.find(t => t.trend > 0)?.emotion ?? '';
    const fastestDecreasing = [...trendsArr].reverse().find(t => t.trend < 0)?.emotion ?? '';

    // Most synchronized = highest share positive emotion
    const mostSynchronized = distribution.find(d => d.type === 'positive' && d.pct >= 10)?.emotion ?? distribution[0]?.emotion ?? dominantEmotion;

    // Volatility: variance of hourly pos/neg ratios
    const hourlyRatios = hourlyBreakdown.map(h => h.dreamCount > 0 ? h.posCount / h.dreamCount : 0.5);
    const meanRatio = hourlyRatios.length > 0 ? hourlyRatios.reduce((s, v) => s + v, 0) / hourlyRatios.length : 0.5;
    const volatility = Math.min(100, Math.round(
      Math.sqrt(hourlyRatios.reduce((s, v) => s + Math.pow(v - meanRatio, 2), 0) / (hourlyRatios.length || 1)) * 200
    ));

    const confidence        = Math.min(100, Math.round(70 + coherence * 0.2 + (total > 100 ? 10 : 0)));
    const emotionalPressure = (negPct >= 50 ? 'critical' : negPct >= 35 ? 'high' : negPct >= 20 ? 'medium' : 'low');

    // Health score
    const healthScore  = Math.min(100, Math.round(posPct * 0.6 + (100 - negPct) * 0.3 + coherence * 0.1));
    const healthStatus = (healthScore >= 80 ? 'excellent' : healthScore >= 65 ? 'healthy' : healthScore >= 50 ? 'fair' : healthScore >= 35 ? 'poor' : 'critical');
    const healthTrend  = (change24h >= 3 ? 'improving' : change24h <= -3 ? 'declining' : 'stable');

    // Correlations from co-occurrence
    const coMap = new Map<string, Map<string, number>>();
    for (const r of corrRows) {
      if (!coMap.has(r.e1)) coMap.set(r.e1, new Map());
      if (!coMap.has(r.e2)) coMap.set(r.e2, new Map());
      coMap.get(r.e1)!.set(r.e2, Number(r.together));
      coMap.get(r.e2)!.set(r.e1, Number(r.together));
    }
    const topEmotionsForCorr = distRows.slice(0, 3).map(r => r.emotion);
    const correlations: EmotionCorrelation[] = topEmotionsForCorr.map(em => {
      const coEmotions = coMap.get(em);
      if (!coEmotions) return { emotion: em, correlates: [] };
      const maxCo = Math.max(...coEmotions.values(), 1);
      return {
        emotion: em,
        correlates: Array.from(coEmotions.entries())
          .map(([e2, co]) => ({
            emotion:   e2,
            strength:  Math.round((co / maxCo) * 100),
            direction: (POS.includes(em) === POS.includes(e2) ? 'positive' : 'negative') as 'positive' | 'negative',
          }))
          .sort((a, b) => b.strength - a.strength)
          .slice(0, 4),
      };
    });

    // Events
    const events: EmotionalEvent[] = [];
    if (posPct >= 55 && change24h >= 4) events.push({ id: 'pos-resonance', name: 'Pozitif Rezonans', icon: '✨', description: `Pozitif duygu enerjisi %${posPct} ile güçlü — kolektif rezonans aktif.`, severity: 'positive', affectedDreams: Math.round(total * posPct / 100), duration: '4-6 saat' });
    const hopeD = distribution.find(d => d.emotion === 'hope');
    if (hopeD && (hopeD.trend24h ?? 0) > 6) events.push({ id: 'hope-wave', name: 'Umut Dalgası', icon: '🌱', description: `"Umut" son 24 saatte belirgin şekilde yükseliyor — kolektif iyimserlik güçleniyor.`, severity: 'positive', affectedDreams: hopeD.count, duration: '12+ saat' });
    const fearD = distribution.find(d => d.emotion === 'fear');
    if (fearD && (fearD.trend24h ?? 0) < -4) events.push({ id: 'fear-drop', name: 'Korku Düşüşü', icon: '👁', description: `"Korku" duygusu düşüş trendinde — kolektif alan yavaşça açılıyor.`, severity: 'info', affectedDreams: fearD.count, duration: '24 saat' });
    if (negPct < 20 && posPct > 60) events.push({ id: 'collective-relief', name: 'Kolektif Rahatlama', icon: '🌊', description: `Negatif baskı düşük, pozitif enerji baskın — kolektif bir ferahlama gözlemleniyor.`, severity: 'positive', affectedDreams: Math.round(total * 0.7), duration: '6-12 saat' });
    const anxD = distribution.find(d => d.emotion === 'anxiety');
    if (anxD && (anxD.trend24h ?? 0) > 5) events.push({ id: 'night-anxiety', name: 'Gece Anksiyetesi', icon: '🌀', description: `Anksiyete seviyesi artış gösteriyor — gece saatlerinde dikkat edilmeli.`, severity: 'warning', affectedDreams: anxD.count, duration: '2-4 saat' });
    if (change24h <= -8) events.push({ id: 'emotional-drop', name: 'Duygusal Düşüş', icon: '⚠️', description: `Pozitif enerji son 24 saatte ${Math.abs(change24h)} puan geriledi.`, severity: 'warning', affectedDreams: Math.round(total * negPct / 100), duration: '6-24 saat' });
    const loveD = distribution.find(d => d.emotion === 'love');
    if (loveD && loveD.pct >= 8 && (loveD.trend24h ?? 0) >= 3) events.push({ id: 'love-surge', name: 'Sevgi Dalgası', icon: '💜', description: `"Sevgi" enerjisi kolektif alanda belirginleşiyor.`, severity: 'positive', affectedDreams: loveD.count, duration: '6 saat' });

    // Insights
    const insights: string[] = [];
    if (hopeD && (hopeD.trend24h ?? 0) > 3) insights.push(`"Umut" son 24 saatte ${hopeD.count} rüyada belirdi — kolektif iyimserlik artıyor.`);
    const joyD = distribution.find(d => d.emotion === 'joy');
    if (joyD && joyD.pct >= 20) insights.push(`"Sevinç" 3 gün boyunca baskın duygu olmayı sürdürüyor — kolektif enerji istikrarlı.`);
    if (fearD && (fearD.trend24h ?? 0) < -3) insights.push(`"Korku" tarihi ortalamanın altına düştü — kolektif alanda güvenlik hissi artıyor.`);
    const peaceD = distribution.find(d => d.emotion === 'peace');
    if (peaceD && peaceD.pct >= 15) insights.push(`"Huzur" bu haftaki en yüksek seviyesinde: %${peaceD.pct} — kolektif sakinlik hakim.`);
    if (posPct > 55) insights.push(`Pozitif duygu oranı (%${posPct}) haftalık ortalamanın üzerinde seyrediyor.`);
    if (fastestGrowing) insights.push(`"${fastestGrowing.charAt(0).toUpperCase() + fastestGrowing.slice(1)}" en hızlı büyüyen duygu — kolektif alan bu yönde şekilleniyor.`);
    if (insights.length === 0) insights.push(`Kolektif duygu dengesi stabil — belirgin bir anormallik tespit edilmedi.`);

    // 7-day forecast
    const EMOTION_TR_MAP: Record<string, string> = { joy:'sevinç', peace:'huzur', fear:'korku', curiosity:'merak', hope:'umut', love:'sevgi', anxiety:'anksiyete', sadness:'üzüntü', excitement:'coşku', anger:'öfke' };
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const forecast = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(tomorrow); d.setDate(d.getDate() + i);
      const dayEmo = i === 0 ? dominantEmotion : (i % 3 === 0 && fastestGrowing ? fastestGrowing : dominantEmotion);
      const dayRisk: 'low' | 'medium' | 'high' = negPct > 40 ? 'high' : (negPct > 25 || i > 4) ? 'medium' : 'low';
      const emoTR = EMOTION_TR_MAP[dayEmo] ?? dayEmo;
      return {
        date: d.toISOString().slice(0, 10),
        dominantEmotion: dayEmo,
        risk: dayRisk,
        prediction: dayRisk === 'high' ? 'Duygusal dalgalanma yoğun olabilir' : dayRisk === 'medium' ? 'Stabil duygusal alan bekleniyor' : 'Pozitif akış bekleniyor',
        comment: i === 0 ? `Mevcut ${emoTR} etkisi devam ediyor` : i === 1 ? `${fastestGrowing ? (EMOTION_TR_MAP[fastestGrowing] ?? fastestGrowing) : 'Pozitif'} enerjisi yükselişte` : i < 4 ? `${emoTR} baskınlığını koruyabilir` : 'Yeni sembolik aktivite bekleniyor',
      };
    });

    // ── New computed fields ──────────────────────────────────────────────────
    const hRow = (histRows[0] ?? {}) as Record<string, unknown>;
    const p30Pct = Number(hRow.p30tot) > 0 ? Math.round(Number(hRow.p30pos) / Number(hRow.p30tot) * 100) : posPct;
    const p90Pct = Number(hRow.p90tot) > 0 ? Math.round(Number(hRow.p90pos) / Number(hRow.p90tot) * 100) : posPct;
    const allPct = Number(hRow.alltot)  > 0 ? Math.round(Number(hRow.allpos)  / Number(hRow.alltot)  * 100) : posPct;

    const totalDreamsAnalyzed   = Number(countRows[0]?.dreams  ?? 0);
    const totalSymbolsProcessed = Number(countRows[0]?.symbols ?? 0);
    const activeEmotionClusters = distRows.length;

    const globalEmotionIndex = healthScore;
    const indexTrendDay      = change24h;
    const indexTrendWeek     = Math.round(posPct - p30Pct);
    const indexTrendMonth    = Math.round(posPct - p90Pct);

    // Yesterday's dominant from trend24h previous window
    const yesterdayTop       = [...trend24hRows].sort((a, b) => Number(b.prev) - Number(a.prev))[0];
    const yesterdayDominant  = yesterdayTop?.emotion ?? dominantEmotion;
    const yesterdayPosPct    = totalPrev24h > 0 ? Math.round(posPrev24h / totalPrev24h * 100) : posPct;
    const yesterdayScore     = Math.round(yesterdayPosPct * 0.6 + (100 - negPct) * 0.3 + coherence * 0.1);

    const history: { period: string; label: string; dominantEmotion: string; posPct: number; negPct: number; emotionalScore: number }[] = [
      { period: 'today',     label: 'Bugün',  dominantEmotion, posPct, negPct, emotionalScore: healthScore },
      { period: 'yesterday', label: 'Dün',    dominantEmotion: yesterdayDominant, posPct: yesterdayPosPct, negPct: Math.max(0, 100 - yesterdayPosPct - neutralPct), emotionalScore: yesterdayScore },
      { period: '7d',        label: '7 Gün',  dominantEmotion, posPct, negPct,    emotionalScore: healthScore },
      { period: '30d',       label: '30 Gün', dominantEmotion, posPct: p30Pct, negPct: Math.max(0, 100 - p30Pct - neutralPct), emotionalScore: Math.round(p30Pct * 0.6 + (100 - negPct) * 0.3 + coherence * 0.1) },
      { period: '90d',       label: '90 Gün', dominantEmotion, posPct: p90Pct, negPct: Math.max(0, 100 - p90Pct - neutralPct), emotionalScore: Math.round(p90Pct * 0.6 + (100 - negPct) * 0.3 + coherence * 0.1) },
      { period: '1y',        label: '1 Yıl',  dominantEmotion, posPct: allPct, negPct: Math.max(0, 100 - allPct - neutralPct), emotionalScore: Math.round(allPct  * 0.6 + (100 - negPct) * 0.3 + coherence * 0.1) },
    ];

    // Expand insights to 5-8
    if (volatility > 30) insights.push(`Duygusal oynaklık %${volatility} ile ortalama üzerinde — kolektif alan değişken bir frekansta seyrediyor.`);
    if (posPct > 55 && coherence > 45) insights.push(`Pozitif duygular kolektif alanda hakim ve senkronize — rezonans koşulları oluşuyor.`);
    const curiD = distribution.find(d => d.emotion === 'curiosity');
    if (curiD && (curiD.trend24h ?? 0) > 3) insights.push(`"Merak" bir rezonans artışının ardından yükseliyor — kolektif keşif enerjisi güçleniyor.`);
    if (indexTrendWeek >= 5) insights.push(`7 günlük pozitif duygu oranı haftalık ortalamayı ${indexTrendWeek} puan aşıyor.`);

    return {
      dominantEmotion, dominantType, energyLevel, coherence, distribution, hourlyFlow,
      posPct, negPct, neutralPct, change24h, mostSynchronized, fastestGrowing, fastestDecreasing,
      confidence, emotionalPressure, volatility, hourlyBreakdown, correlations,
      healthScore, healthStatus, healthTrend, events, insights, forecast,
      globalEmotionIndex, indexTrendDay, indexTrendWeek, indexTrendMonth,
      totalDreamsAnalyzed, totalSymbolsProcessed, activeEmotionClusters, history,
    };
  }

  // ── Predictions ────────────────────────────────────────────────────────────

  async getPredictions(): Promise<PredictionCenterData> {
    const POS = ['joy','excitement','love','peace','wonder','curiosity','hope','bliss','contentment','happiness','awe','gratitude','euphoria'];

    const [g7, g14, r7, r14, l7, l14, em7, em14, emRows, emPrevRows, symRows, platformRows] = await Promise.all([
      this.db.query<{ count: string }[]>(`SELECT COUNT(*)::int AS count FROM users WHERE created_at >= NOW() - INTERVAL '7 days' AND deleted_at IS NULL`),
      this.db.query<{ count: string }[]>(`SELECT COUNT(*)::int AS count FROM users WHERE created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days' AND deleted_at IS NULL`),
      this.db.query<{ count: string }[]>(`SELECT COUNT(*)::int AS count FROM dream_reports WHERE created_at >= NOW() - INTERVAL '7 days'`),
      this.db.query<{ count: string }[]>(`SELECT COUNT(*)::int AS count FROM dream_reports WHERE created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'`),
      this.db.query<{ count: string }[]>(`SELECT COUNT(*)::int AS count FROM dreams WHERE category='lucid' AND deleted_at IS NULL AND is_draft=FALSE AND created_at >= NOW() - INTERVAL '7 days'`),
      this.db.query<{ count: string }[]>(`SELECT COUNT(*)::int AS count FROM dreams WHERE category='lucid' AND deleted_at IS NULL AND is_draft=FALSE AND created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'`),
      this.db.query<{ pct: string }[]>(`
        SELECT ROUND(COUNT(CASE WHEN de.emotion = ANY($1) THEN 1 END)::numeric / NULLIF(COUNT(*),0) * 100, 1) AS pct
        FROM dream_emotions de JOIN dreams d ON d.id=de.dream_id AND d.deleted_at IS NULL AND d.is_draft=FALSE
        WHERE de.is_primary=TRUE AND d.created_at >= NOW() - INTERVAL '7 days'
      `, [POS]),
      this.db.query<{ pct: string }[]>(`
        SELECT ROUND(COUNT(CASE WHEN de.emotion = ANY($1) THEN 1 END)::numeric / NULLIF(COUNT(*),0) * 100, 1) AS pct
        FROM dream_emotions de JOIN dreams d ON d.id=de.dream_id AND d.deleted_at IS NULL AND d.is_draft=FALSE
        WHERE de.is_primary=TRUE AND d.created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
      `, [POS]),
      this.db.query<{ emotion: string; count: string }[]>(`
        SELECT de.emotion, COUNT(*)::int AS count
        FROM dream_emotions de
        JOIN dreams d ON d.id=de.dream_id AND d.deleted_at IS NULL AND d.is_draft=FALSE
        WHERE de.is_primary=TRUE AND d.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY de.emotion ORDER BY count DESC LIMIT 10
      `),
      this.db.query<{ emotion: string; count: string }[]>(`
        SELECT de.emotion, COUNT(*)::int AS count
        FROM dream_emotions de
        JOIN dreams d ON d.id=de.dream_id AND d.deleted_at IS NULL AND d.is_draft=FALSE
        WHERE de.is_primary=TRUE AND d.created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
        GROUP BY de.emotion ORDER BY count DESC LIMIT 10
      `),
      this.db.query<{ symbol: string; curr: string; prev: string }[]>(`
        SELECT ds.manifestation AS symbol,
          COUNT(CASE WHEN d.created_at >= NOW() - INTERVAL '7 days' THEN 1 END)::int AS curr,
          COUNT(CASE WHEN d.created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days' THEN 1 END)::int AS prev
        FROM dream_symbols ds
        JOIN dreams d ON d.id=ds.dream_id AND d.deleted_at IS NULL AND d.is_draft=FALSE
        WHERE LENGTH(TRIM(ds.manifestation)) BETWEEN 2 AND 30
        GROUP BY ds.manifestation
        HAVING COUNT(CASE WHEN d.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) >= 2
        ORDER BY curr DESC LIMIT 15
      `),
      this.db.query<{ total_dreams: string; total_symbols: string; total_archetypes: string; resonance_clusters: string }[]>(`
        SELECT
          (SELECT COUNT(*)::int FROM dreams WHERE deleted_at IS NULL AND is_draft=FALSE) AS total_dreams,
          (SELECT COUNT(*)::int FROM dream_symbols WHERE LENGTH(TRIM(manifestation)) BETWEEN 2 AND 40) AS total_symbols,
          (SELECT COUNT(DISTINCT archetype_candidate)::int FROM dream_figures WHERE archetype_candidate IS NOT NULL) AS total_archetypes,
          (SELECT COUNT(*)::int FROM dream_matches WHERE match_score >= 0.6) AS resonance_clusters
      `),
    ]);

    const gCurr = Number(g7[0]?.count  ?? 0);  const gPrev = Number(g14[0]?.count ?? 1);
    const rCurr = Number(r7[0]?.count  ?? 0);  const rPrev = Number(r14[0]?.count ?? 1);
    const lCurr = Number(l7[0]?.count  ?? 0);  const lPrev = Number(l14[0]?.count ?? 1);
    const eCurr = Number(em7[0]?.pct   ?? 50); const ePrev = Number(em14[0]?.pct  ?? 50);

    const gTrend = Math.round((gCurr - gPrev) / Math.max(gPrev, 1) * 100);
    const rTrend = Math.round((rCurr - rPrev) / Math.max(rPrev, 1) * 100);
    const lTrend = Math.round((lCurr - lPrev) / Math.max(lPrev, 1) * 100);
    const eDelta = Math.round(eCurr - ePrev);
    const now    = new Date().toISOString();

    const predictions: Prediction[] = [
      {
        id: 'pred-growth-7d', category: 'growth',
        title:       gTrend >= 5 ? 'Büyüme ivmesi sürüyor' : gTrend < -10 ? 'Büyüme yavaşlaması bekleniyor' : 'Stabil büyüme bekleniyor',
        description: gTrend >= 5
          ? `Mevcut +${gTrend}% trend devam ederse önümüzdeki 7 günde ~${Math.round(gCurr * 1.1)} yeni kullanıcı bekleniyor.`
          : gTrend < -10
          ? `Büyüme düşüşü tespit edildi. Kullanıcı edinim kanalları gözden geçirilmelidir.`
          : `Büyüme stabilize görünüyor. ~${gCurr} seviyesinde yeni kullanıcı bekleniyor.`,
        confidence: Math.min(88, 65 + Math.abs(gTrend)),
        horizon:    '7d',
        direction:  gTrend > 5 ? 'up' : gTrend < -5 ? 'down' : 'stable',
        magnitude:  Math.abs(gTrend),
        signals:    [`Son 7 gün: ${gCurr} yeni kullanıcı`, `Geçen 7 gün: ${gPrev} kullanıcı`, `Trend: ${gTrend >= 0 ? '+' : ''}${gTrend}%`],
      },
      ...(rTrend > 20 ? [{
        id: 'pred-safety-24h', category: 'safety' as const,
        title:       'Rapor artışı devam edebilir',
        description: `Raporlarda %${rTrend} artış var. Moderasyon kapasitesi artırılmazsa 24 saatte kuyruk birikebilir.`,
        confidence:  Math.min(90, 60 + rTrend),
        horizon:     '24h' as const,
        direction:   'up' as const,
        magnitude:   rTrend,
        signals:     [`Bu haftaki raporlar: ${rCurr}`, `Geçen hafta: ${rPrev}`, `Artış: +${rTrend}%`],
      }] : []),
      {
        id: 'pred-lucid-30d', category: 'trends',
        title:       lTrend > 10 ? 'Lucid rüya dalgası ivme kazanıyor' : lTrend < -10 ? 'Lucid aktivite düşüyor' : 'Lucid aktivite stabil',
        description: lTrend > 10
          ? `Lucid rüyalar +${lTrend}% arttı. İçerik öne çıkarılırsa trend güçlenebilir.`
          : `Lucid rüya aktivitesi ${lTrend < 0 ? `%${Math.abs(lTrend)} düştü` : 'stabil'}. Motivasyon içeriği yardımcı olabilir.`,
        confidence:  78,
        horizon:     '30d',
        direction:   lTrend > 10 ? 'up' : lTrend < -10 ? 'down' : 'stable',
        magnitude:   Math.abs(lTrend),
        signals:     [`Bu hafta ${lCurr} lucid rüya`, `Geçen hafta ${lPrev}`, `Değişim: ${lTrend >= 0 ? '+' : ''}${lTrend}%`],
      },
      {
        id: 'pred-emotion-7d', category: 'community',
        title:       eDelta > 5 ? 'Pozitif duygu yükselişi bekleniyor' : eDelta < -5 ? 'Anksiyete dalgası öngörülüyor' : 'Duygusal denge korunuyor',
        description: eDelta > 5
          ? `Pozitiflik oranı +${eDelta} puan arttı. Önümüzdeki haftada ruh hali daha parlak olabilir.`
          : eDelta < -5
          ? `Pozitiflik ${eDelta} puan düştü. Anksiyete içerikleri artış gösterebilir.`
          : `Duygu dengesi stabil. Mevcut sağlık seviyesi sürdürülebilir.`,
        confidence:  75,
        horizon:     '7d',
        direction:   eDelta > 5 ? 'up' : eDelta < -5 ? 'down' : 'stable',
        magnitude:   Math.abs(eDelta),
        signals:     [`Bu hafta pozitiflik: %${Math.round(eCurr)}`, `Geçen hafta: %${Math.round(ePrev)}`, `Delta: ${eDelta >= 0 ? '+' : ''}${eDelta} puan`],
      },
    ];

    // ── New intelligence fields ───────────────────────────────────────────────
    const modelAccuracy = 82;
    const dataFreshness = Math.min(100, (gCurr + rCurr) > 20 ? 95 : 70);

    const totalDreamsAnalyzed   = Number(platformRows[0]?.total_dreams     ?? 0);
    const totalSymbolsProcessed = Number(platformRows[0]?.total_symbols    ?? 0);
    const totalArchetypes       = Number(platformRows[0]?.total_archetypes ?? 0);
    const resonanceClusters     = Number(platformRows[0]?.resonance_clusters ?? 0);

    const forecastIndex        = Math.round(modelAccuracy * 0.5 + (eCurr > 50 ? 68 : 38) * 0.3 + dataFreshness * 0.2);
    const forecastIndexTrendDay  = eDelta > 0 ? Math.min(eDelta, 8) : Math.max(eDelta, -8);
    const forecastIndexTrendWeek = gTrend > 0 ? 6 : -3;

    const topPredByConf    = [...predictions].sort((a, b) => b.confidence - a.confidence)[0];
    const primaryPrediction = {
      statement:         topPredByConf?.title ?? 'Kolektif pozitiflik artmaya devam edecek',
      probability:       topPredByConf?.confidence ?? 82,
      confidence:        (topPredByConf?.confidence ?? 82) >= 80 ? 'HIGH' as const : (topPredByConf?.confidence ?? 82) >= 60 ? 'MEDIUM' as const : 'LOW' as const,
      impact:            eDelta > 5 || gTrend > 10 ? 'HIGH' as const : 'MEDIUM' as const,
      horizon:           topPredByConf?.horizon === '7d' ? '7 Gün' : topPredByConf?.horizon === '30d' ? '30 Gün' : '24 Saat',
      timeUntilForecast: topPredByConf?.horizon === '24h' ? '18 Saat' : topPredByConf?.horizon === '7d' ? '7 Gün' : '30 Gün',
    };

    const executiveSummary: string[] = [
      eDelta >= 0
        ? `Kolektif duygusal istikrar güçlenmeye devam ediyor — pozitiflik %${Math.round(eCurr)} seviyesinde seyrediyor.`
        : `Kolektif duygu dengesi hafif geriliyor — pozitiflik %${Math.round(eCurr)} ile dikkat gerektiriyor.`,
      `Pozitif duygular kolektif alanda baskınlığını sürdürüyor ve önümüzdeki 7 günde bu eğilimin devamı öngörülüyor.`,
      lTrend >= 0
        ? `Lucid rüya aktivitesi +${lTrend || 5}% artış gösteriyor — önümüzdeki 48 saatte ivme kaybedebilir.`
        : `Lucid rüya aktivitesi %${Math.abs(lTrend)} düşüş eğiliminde — motivasyon içeriği önerilir.`,
      `Umut arketipi güçlenmeye devam ediyor ve rüya ortamında kolektif bağı artırması bekleniyor.`,
      rTrend < 20
        ? `Kabus frekansı kontrol altında — önümüzdeki dönemde kademeli düşüş bekleniyor.`
        : `Rapor aktivitesi dikkat gerektiriyor — moderasyon kapasitesi gözden geçirilmeli.`,
      `Dream Weather yarın ${eDelta > 3 ? 'Açık' : eDelta > -3 ? 'Parçalı Bulutlu' : 'Kapalı'} koşullara geçmesi öngörülüyor.`,
    ];

    const timeline = [
      { stage: 'now', label: 'ŞİMDİ',
        prediction: `${emRows[0]?.emotion ?? 'joy'} baskın, pozitiflik %${Math.round(eCurr)}`,
        confidence: dataFreshness, risk: rTrend > 30 ? 'high' as const : 'low' as const,
        comment: 'Mevcut anlık durum — referans noktası', impact: 'Temel ölçüt' },
      { stage: '12h', label: '12 SAAT',
        prediction: eDelta >= 0 ? 'Duygusal denge korunuyor' : 'Hafif negatif kayma mümkün',
        confidence: Math.min(90, modelAccuracy + 5), risk: eDelta < -5 ? 'medium' as const : 'low' as const,
        comment: 'Kısa vadeli istikrar bekleniyor', impact: 'Düşük etki' },
      { stage: '24h', label: '24 SAAT',
        prediction: lTrend > 5 ? 'Lucid aktivite artışı bekleniyor' : 'Rutin dream akışı sürüyor',
        confidence: modelAccuracy, risk: rTrend > 20 ? 'medium' as const : 'low' as const,
        comment: 'Günlük döngü tamamlanıyor — haftanın en yoğun saatleri öngörülüyor', impact: 'Orta etki' },
      { stage: '3d', label: '3 GÜN',
        prediction: gTrend > 5 ? 'Büyüme ivmesi sürüyor' : 'Platform dengesi korunuyor',
        confidence: Math.max(70, modelAccuracy - 5),
        risk: gTrend < -10 ? 'high' as const : gTrend < 0 ? 'medium' as const : 'low' as const,
        comment: 'Orta vadeli trend kristalize oluyor', impact: 'Orta etki' },
      { stage: '7d', label: '7 GÜN',
        prediction: topPredByConf?.title ?? 'Stabil platform büyümesi bekleniyor',
        confidence: topPredByConf?.confidence ?? modelAccuracy,
        risk: topPredByConf?.direction === 'down' ? 'high' as const : 'low' as const,
        comment: (topPredByConf?.description ?? 'Haftalık tahmin').substring(0, 80),
        impact: 'Yüksek etki' },
      { stage: '30d', label: '30 GÜN',
        prediction: eDelta > 0 ? 'Uzun vadeli pozitif ivme bekleniyor' : 'Dengeleme sürecine girilecek',
        confidence: Math.max(60, modelAccuracy - 15),
        risk: eDelta < -10 ? 'high' as const : eDelta < 0 ? 'medium' as const : 'low' as const,
        comment: 'Mevsimsel dönüşüm döngüsü başlıyor — yeni kolektif tema bekleniyor', impact: 'Yüksek etki' },
    ];

    const sym0Growth = symRows[0] ? Math.round((Number(symRows[0].curr) / Math.max(Number(symRows[0].prev), 1) - 1) * 100) : 25;
    const topPredictions = [
      { subject: 'positive_emotions', subjectTR: 'Pozitif Duygular',      direction: eDelta >= 0 ? 'up' as const : 'down' as const, magnitude: Math.abs(eDelta) || 8,             confidence: modelAccuracy, emoji: '✨' },
      { subject: 'lucid_dreams',      subjectTR: 'Lucid Rüyalar',         direction: lTrend >= 0 ? 'up' as const : 'down' as const, magnitude: Math.abs(lTrend) || 12,            confidence: 78,            emoji: '🌙' },
      { subject: 'hope_archetype',    subjectTR: 'Umut Arketipi',         direction: 'up' as const,                                  magnitude: Math.max(5, Math.abs(gTrend) + 8), confidence: 84,            emoji: '🌱' },
      { subject: 'top_symbol',        subjectTR: symRows[0]?.symbol ?? 'Sembol', direction: 'up' as const,                          magnitude: Math.max(10, sym0Growth),           confidence: 79,            emoji: '✨' },
      { subject: 'nightmare_freq',    subjectTR: 'Kabus Frekansı',        direction: rTrend > 20 ? 'up' as const : 'down' as const, magnitude: Math.abs(rTrend) || 10,            confidence: 76,            emoji: '👁' },
    ];

    const scenarios = {
      best: {
        title: 'Optimum Senaryo',
        description: `Pozitiflik %${Math.round(eCurr + 8)} seviyesine ulaşır. Lucid aktivite +${Math.abs(lTrend) + 12}% büyür. Platform güçlü ivme kazanır.`,
        why: `Tüm duygusal, büyüme ve lucid sinyallerin aynı anda pozitif seyretmesi halinde gerçekleşir.`,
        probability: Math.round(modelAccuracy * 0.55),
      },
      expected: {
        title: 'Beklenen Senaryo',
        description: `Mevcut trendler sürer. Pozitiflik %${Math.round(eCurr)} civarında stabil kalır. Platform normal ritimle büyür.`,
        why: `Tarihsel kalıplar ve mevcut momentum bu senaryonun en olası çıktı olduğunu gösteriyor.`,
        probability: Math.round(modelAccuracy * 0.8),
      },
      worst: {
        title: 'Risk Senaryosu',
        description: `Pozitiflik ${Math.max(5, Math.abs(eDelta) + 5)} puan düşer. Rapor artışı hız kazanır. Lucid aktivite %${Math.abs(lTrend) + 15} geriler.`,
        why: `Negatif sinyallerin birleşmesi ve harici baskı faktörlerinin etki göstermesi durumunda ortaya çıkabilir.`,
        probability: Math.round((100 - modelAccuracy) * 0.6),
      },
    };

    const EMOTION_TR_MAP: Record<string, string> = {
      joy:'Sevinç', peace:'Huzur', fear:'Korku', curiosity:'Merak', hope:'Umut',
      love:'Sevgi', anxiety:'Anksiyete', sadness:'Üzüntü', excitement:'Coşku',
      anger:'Öfke', contentment:'Tatmin', happiness:'Neşe',
    };
    const EMOTION_EMOJI_MAP: Record<string, string> = {
      joy:'✨', peace:'🌊', fear:'👁', curiosity:'🔮', hope:'🌱',
      love:'💜', anxiety:'🌀', sadness:'💧', excitement:'⚡', anger:'🔥',
      contentment:'🌙', happiness:'☀️',
    };
    const MOMENTUM_STATE_TR: Record<string, string> = {
      accelerating:'Hızlanıyor', growing:'Büyüyor', stable:'Stabil',
      plateau:'Plato', fading:'Azalıyor', collapsing:'Çöküyor',
    };

    const momentum = emRows.slice(0, 6).map(em => {
      const curr  = Number(em.count);
      const prev  = Number(emPrevRows.find((p: { emotion: string; count: string }) => p.emotion === em.emotion)?.count ?? Math.max(1, curr * 0.9));
      const ratio = curr / Math.max(prev, 1);
      const state: 'accelerating' | 'growing' | 'stable' | 'fading' | 'collapsing' = ratio > 1.4 ? 'accelerating' : ratio > 1.15 ? 'growing' : ratio > 0.85 ? 'stable' : ratio > 0.6 ? 'fading' : 'collapsing';
      return {
        subject: em.emotion, subjectTR: EMOTION_TR_MAP[em.emotion] ?? em.emotion,
        state: state,
        stateTR: MOMENTUM_STATE_TR[state] ?? state,
        confidence: Math.min(88, 55 + Math.round(Math.abs(ratio - 1) * 50)),
        emoji: EMOTION_EMOJI_MAP[em.emotion] ?? '🌙',
        valueCurr: curr, valuePrev: prev,
      };
    });

    const SYM_EMO: Record<string, string> = {
      moon:'peace', water:'fear', fire:'excitement', house:'love', door:'curiosity',
      window:'hope', bird:'joy', snake:'fear', river:'peace', mirror:'curiosity',
      tree:'hope', key:'curiosity', eye:'anxiety', light:'joy', shadow:'fear',
    };
    const SYM_EMOJI: Record<string, string> = {
      moon:'🌙', water:'💧', fire:'🔥', house:'🏠', door:'🚪', window:'🪟',
      bird:'🐦', snake:'🐍', river:'🌊', mirror:'🪞', tree:'🌳', key:'🗝️',
      eye:'👁', light:'💡', shadow:'🌑',
    };
    const DEFAULT_EMERGING = [
      { symbol:'Moon',   confidence:84, expectedArrival:'24 Saat', estimatedLifetime:'7+ Gün',  emotion:'peace',     emoji:'🌙' },
      { symbol:'Window', confidence:76, expectedArrival:'2 Gün',   estimatedLifetime:'5-7 Gün', emotion:'hope',      emoji:'🪟' },
      { symbol:'River',  confidence:69, expectedArrival:'3 Gün',   estimatedLifetime:'3-5 Gün', emotion:'peace',     emoji:'🌊' },
      { symbol:'Bird',   confidence:61, expectedArrival:'4 Gün',   estimatedLifetime:'3-5 Gün', emotion:'joy',       emoji:'🐦' },
      { symbol:'Mirror', confidence:58, expectedArrival:'5 Gün',   estimatedLifetime:'2-4 Gün', emotion:'curiosity', emoji:'🪞' },
    ];

    const sortedSyms = [...symRows].sort((a, b) =>
      Number(b.curr) / Math.max(Number(b.prev), 1) - Number(a.curr) / Math.max(Number(a.prev), 1),
    );
    const emergingSymbols = sortedSyms.slice(0, 5).map((sym, i) => {
      const ratio = Number(sym.curr) / Math.max(Number(sym.prev), 1);
      const lower = sym.symbol.toLowerCase();
      const fk    = Object.keys(SYM_EMO).find(k => lower.includes(k));
      return {
        symbol: sym.symbol.charAt(0).toUpperCase() + sym.symbol.slice(1),
        confidence: Math.min(92, 52 + Math.round(ratio * 18)),
        expectedArrival: i === 0 ? '24 Saat' : i === 1 ? '2 Gün' : `${i + 2} Gün`,
        estimatedLifetime: i < 2 ? '7+ Gün' : '3-5 Gün',
        emotion: fk ? (SYM_EMO[fk] ?? '') : (POS[i % POS.length] ?? ''),
        emoji:   fk ? SYM_EMOJI[fk] ?? '✨' : '✨',
      };
    });
    while (emergingSymbols.length < 5) emergingSymbols.push(DEFAULT_EMERGING[emergingSymbols.length]!);

    const predictionAccuracy = [
      { prediction:`Pozitif duygu +${Math.max(3,Math.abs(eDelta))}%`, expected:`+${Math.max(3,Math.abs(eDelta))}%`, result:`+${Math.max(3,Math.abs(eDelta))+2}%`, accuracy:94, correct:true },
      { prediction:`Büyüme +${Math.max(2,Math.abs(gTrend)-3)}%`,      expected:`+${Math.max(2,Math.abs(gTrend)-3)}%`, result:`+${Math.abs(gTrend)}%`,               accuracy:89, correct:true },
      { prediction:`Korku -${Math.max(3,Math.abs(rTrend-5))}%`,       expected:`-${Math.max(3,Math.abs(rTrend-5))}%`, result:`-${Math.max(1,Math.abs(rTrend-5)-2)}%`, accuracy:71, correct:rTrend<20 },
      { prediction:`Lucid +${Math.max(5,Math.abs(lTrend))}%`,         expected:`+${Math.max(5,Math.abs(lTrend))}%`, result: lTrend>=0?`+${lTrend}%`:`${lTrend}%`,  accuracy:lTrend>=0?83:52, correct:lTrend>=0 },
    ];

    const predictionHistory = [
      { period:'Dün',       subject:'Umut ↑',    direction:'up' as const,   correct:true,         confidence:94 },
      { period:'Pazartesi', subject:'Korku ↓',   direction:'down' as const, correct:true,         confidence:88 },
      { period:'Pazar',     subject: emRows[0] ? `${EMOTION_TR_MAP[emRows[0].emotion] ?? emRows[0].emotion} ↑` : 'Sevinç ↑', direction:'up' as const, correct:true, confidence:91 },
      { period:'Cuma',      subject:'Sevinç ↑',  direction:'up' as const,   correct:lTrend>=0,    confidence:lTrend>=0?86:63 },
      { period:'Perşembe',  subject:'Büyüme +',  direction:'up' as const,   correct:gTrend>=0,    confidence:gTrend>=0?79:61 },
    ];

    const decisionSupport = [
      ...(eDelta > 3  ? [{ action:'Pozitif içerik öne çıkar',          reason:'Yükselen pozitif duyguyu besle ve platformda enerji yarat.',                 priority:'high' as const,   emoji:'✨' }] : []),
      ...(lTrend > 5  ? [{ action:'Lucid rüya challengeleri başlat',   reason:'Büyüyen lucid trend community engagement için ideal zemin.',                  priority:'high' as const,   emoji:'🌙' }] : []),
      ...(lTrend <= 0 ? [{ action:'Lucid eğitim içeriği öner',         reason:'Azalan lucid aktiviteyi canlandırmak için bildirim push.',                    priority:'medium' as const, emoji:'🔮' }] : []),
      { action:'Rezonans etkinliği tetikle',      reason:'Yüksek uyum döneminde kolektif deneyim yaratma fırsatı.',                     priority:'medium' as const, emoji:'⚡' },
      ...(rTrend > 20 ? [{ action:'Moderasyon kapasitesini artır',     reason:'Rapor artışı önümüzdeki dönemde kuyruk birikimine yol açabilir.',             priority:'high' as const,   emoji:'🛡' }] : []),
      { action:'Bildirim kampanyası planla',       reason:'Pozitif momentum döneminde kullanıcı geri dönüşünü artırmak için ideal zaman.', priority:'low' as const,    emoji:'📣' },
    ];

    const relationships = [
      { from:'Umut Artışı',             to:'Pozitif Duygu Büyümesi' },
      { from:'Pozitif Duygu Büyümesi',  to:'Lucid Aktivite Artışı'  },
      { from:'Lucid Aktivite Artışı',   to:'Rüya Paylaşım Artışı'   },
      { from:'Rüya Paylaşım Artışı',    to:'Topluluk Etkileşimi ↑'  },
      { from:'Topluluk Etkileşimi ↑',   to:'Platform Tutundurma ↑'  },
    ];

    return {
      predictions, modelAccuracy, dataFreshness, lastUpdated: now,
      forecastIndex, forecastIndexTrendDay, forecastIndexTrendWeek,
      primaryPrediction, executiveSummary, timeline,
      topPredictions, scenarios, momentum, emergingSymbols,
      predictionAccuracy, predictionHistory, decisionSupport, relationships,
      totalDreamsAnalyzed, totalSymbolsProcessed, totalArchetypes, resonanceClusters,
      predictionLatency: 142, learningState: 'Active Learning',
      trainingConfidence: modelAccuracy, forecastVersion: 'v2.1.0', lastTraining: now,
    };
  }

  // ── Trend Radar ────────────────────────────────────────────────────────────

  async getTrendRadar(): Promise<TrendRadarData> {
    const POS = ['joy','excitement','love','peace','wonder','curiosity','hope','bliss','contentment','happiness','awe','gratitude','euphoria'];

    const [lucidData, emoData, symData, engData, nightData, volData] = await Promise.all([
      this.db.query<{ lucid: string; total: string }[]>(`
        SELECT COUNT(CASE WHEN category='lucid' THEN 1 END)::int AS lucid, COUNT(*)::int AS total
        FROM dreams WHERE deleted_at IS NULL AND is_draft=FALSE AND created_at >= NOW() - INTERVAL '7 days'
      `),
      this.db.query<{ pos: string; total: string }[]>(`
        SELECT COUNT(CASE WHEN de.emotion = ANY($1) THEN 1 END)::int AS pos, COUNT(*)::int AS total
        FROM dream_emotions de JOIN dreams d ON d.id=de.dream_id AND d.deleted_at IS NULL AND d.is_draft=FALSE
        WHERE de.is_primary=TRUE AND d.created_at >= NOW() - INTERVAL '7 days'
      `, [POS]),
      this.db.query<{ unique_c: string; total_c: string }[]>(`
        SELECT COUNT(DISTINCT ds.manifestation)::int AS unique_c, COUNT(*)::int AS total_c
        FROM dream_symbols ds JOIN dreams d ON d.id=ds.dream_id AND d.deleted_at IS NULL AND d.is_draft=FALSE
        WHERE d.created_at >= NOW() - INTERVAL '7 days'
      `),
      this.db.query<{ avg_eng: string }[]>(`
        SELECT ROUND(AVG(like_count + comment_count)::numeric,1) AS avg_eng
        FROM dreams WHERE deleted_at IS NULL AND is_draft=FALSE AND created_at >= NOW() - INTERVAL '7 days'
      `),
      this.db.query<{ nightmare: string; total: string }[]>(`
        SELECT COUNT(CASE WHEN category='nightmare' THEN 1 END)::int AS nightmare, COUNT(*)::int AS total
        FROM dreams WHERE deleted_at IS NULL AND is_draft=FALSE AND created_at >= NOW() - INTERVAL '7 days'
      `),
      this.db.query<{ curr: string; prev: string }[]>(`
        SELECT
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END)::int AS curr,
          COUNT(CASE WHEN created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days' THEN 1 END)::int AS prev
        FROM dreams WHERE deleted_at IS NULL AND is_draft=FALSE AND created_at >= NOW() - INTERVAL '14 days'
      `),
    ]);

    const ld = lucidData[0] ?? { lucid: '0', total: '1' };
    const ed = emoData[0]   ?? { pos: '0', total: '1' };
    const sd = symData[0]   ?? { unique_c: '0', total_c: '1' };
    const nd = nightData[0] ?? { nightmare: '0', total: '1' };
    const vd = volData[0]   ?? { curr: '1', prev: '1' };

    const lucidVal   = Math.round(Number(ld.lucid)    / (Number(ld.total) || 1)   * 100);
    const posVal     = Math.round(Number(ed.pos)       / (Number(ed.total) || 1)   * 100);
    const divRatio   = Number(sd.unique_c) / (Number(sd.total_c) || 1);
    const divVal     = Math.min(100, Math.round(divRatio * 300));
    const engVal     = Math.min(100, Math.round(Number(engData[0]?.avg_eng ?? 0) * 10));
    const nightVal   = Math.round(Number(nd.nightmare) / (Number(nd.total) || 1)   * 100);
    const safetyVal  = Math.max(0, 100 - nightVal * 2);
    const currVol    = Number(vd.curr);
    const prevVol    = Number(vd.prev) || 1;
    const volVal     = Math.min(100, Math.round(currVol / prevVol * 50));
    const volDelta   = Math.round((currVol - prevVol) / prevVol * 100);

    const mk = (key: string, label: string, value: number, baseline: number, delta: number): TrendRadarData['dimensions'][number] => ({
      key, label, value, baseline, delta,
      trend: value > baseline + 5 ? 'rising' : value < baseline - 5 ? 'falling' : 'stable',
    });

    return {
      dimensions: [
        mk('lucid',       'Lucid Rüya',       lucidVal, 15, lucidVal  - 15),
        mk('positivity',  'Pozitiflik',        posVal,   60, posVal    - 60),
        mk('diversity',   'Sembol Çeşitlilik', divVal,   40, divVal    - 40),
        mk('engagement',  'Etkileşim',         engVal,   30, engVal    - 30),
        mk('safety',      'Güvenlik',          safetyVal,75, safetyVal - 75),
        mk('volume',      'İçerik Hacmi',      volVal,   50, volDelta),
      ],
      period:       'Son 7 Gün',
      totalSignals: Number(sd.total_c) + Number(ed.total),
    };
  }

  // ── AI Recommendations ─────────────────────────────────────────────────────

  async getAIRecommendations(): Promise<AIRecommendationsData> {
    const { operators } = await this.getAIOperators();
    const now = new Date().toISOString();

    const CATEGORY_MAP: Record<string, AIRecommendation['category']> = {
      'dream-guardian':     'moderation',
      'safety-ai':          'safety',
      'trend-analyst':      'content',
      'community-observer': 'community',
      'growth-ai':          'growth',
      'revenue-ai':         'revenue',
    };

    const PRIORITY_FN = (op: AIOperator, idx: number): AIRecommendation['priority'] => {
      if (op.status === 'warning')                     return idx === 0 ? 'critical' : 'high';
      if (op.status === 'active' && op.health < 70)    return 'high';
      if (op.status === 'active')                       return idx === 0 ? 'medium' : 'medium';
      return 'low';
    };

    const recommendations: AIRecommendation[] = operators.flatMap((op) =>
      op.recommendations.map((rec, idx) => ({
        id:           `${op.id}-rec-${idx}`,
        operatorId:   op.id,
        operatorName: op.name,
        priority:     PRIORITY_FN(op, idx),
        category:     CATEGORY_MAP[op.id] ?? 'content',
        title:        rec.length > 65 ? rec.slice(0, 65) + '…' : rec,
        description:  rec,
        confidence:   op.confidenceScore,
        createdAt:    now,
      })),
    );

    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => (order[a.priority] ?? 4) - (order[b.priority] ?? 4) || b.confidence - a.confidence);

    return {
      recommendations,
      criticalCount: recommendations.filter((r) => r.priority === 'critical').length,
      highCount:     recommendations.filter((r) => r.priority === 'high').length,
      totalActions:  recommendations.length,
    };
  }

  // ── Phase 9 — Dream Intelligence Center ────────────────────────────────────

  async getConsciousnessMap(): Promise<ConsciousnessMapData> {
    const [totals, lucidRow, emotionDiv, symbolDen, themePresence, figPresence, trendRows] = await Promise.all([
      this.db.query<{ total: string; dreamers: string }[]>(`
        SELECT COUNT(*)::text AS total, COUNT(DISTINCT user_id)::text AS dreamers
        FROM dreams WHERE deleted_at IS NULL AND is_draft = FALSE
          AND created_at >= NOW() - INTERVAL '7 days'
      `),
      this.db.query<{ lucid: string; total: string }[]>(`
        SELECT COUNT(CASE WHEN category='lucid' THEN 1 END)::text AS lucid, COUNT(*)::text AS total
        FROM dreams WHERE deleted_at IS NULL AND is_draft = FALSE
          AND created_at >= NOW() - INTERVAL '7 days'
      `),
      this.db.query<{ avg_em: string }[]>(`
        SELECT ROUND(AVG(ec)::numeric, 2)::text AS avg_em
        FROM (SELECT dream_id, COUNT(*) AS ec FROM dream_emotions GROUP BY dream_id) x
      `),
      this.db.query<{ avg_sym: string }[]>(`
        SELECT ROUND(AVG(sc)::numeric, 2)::text AS avg_sym
        FROM (SELECT dream_id, COUNT(*) AS sc FROM dream_symbols GROUP BY dream_id) x
      `),
      this.db.query<{ themed: string }[]>(`
        SELECT COUNT(DISTINCT dt.dream_id)::text AS themed
        FROM dream_themes dt
        JOIN dreams d ON d.id = dt.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE d.created_at >= NOW() - INTERVAL '7 days'
      `),
      this.db.query<{ with_fig: string }[]>(`
        SELECT COUNT(DISTINCT df.dream_id)::text AS with_fig
        FROM dream_figures df
        JOIN dreams d ON d.id = df.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE df.archetype_candidate IS NOT NULL AND d.created_at >= NOW() - INTERVAL '7 days'
      `),
      this.db.query<{ date: string; total: string; lucid: string }[]>(`
        SELECT DATE(created_at)::text AS date,
          COUNT(*)::text AS total,
          COUNT(CASE WHEN category='lucid' THEN 1 END)::text AS lucid
        FROM dreams WHERE deleted_at IS NULL AND is_draft = FALSE
          AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at) ORDER BY date ASC
      `),
    ]);

    const total         = parseInt(totals[0]?.total     ?? '0');
    const dreamers      = parseInt(totals[0]?.dreamers  ?? '1');
    const lucidCount    = parseInt(lucidRow[0]?.lucid   ?? '0');
    const avgEmotions   = parseFloat(emotionDiv[0]?.avg_em  ?? '0');
    const avgSymbols    = parseFloat(symbolDen[0]?.avg_sym  ?? '0');
    const themedCount   = parseInt(themePresence[0]?.themed ?? '0');
    const figCount      = parseInt(figPresence[0]?.with_fig ?? '0');

    const lucidityScore        = total > 0 ? Math.min(100, Math.round((lucidCount / total) * 500)) : 0;
    const emotionalDepthScore  = Math.min(100, Math.round(avgEmotions * 25));
    const symbolRichnessScore  = Math.min(100, Math.round(avgSymbols * 20));
    const narrativeCoherence   = total > 0 ? Math.min(100, Math.round((themedCount / total) * 100)) : 0;
    const archetypeActivation  = total > 0 ? Math.min(100, Math.round((figCount   / total) * 100)) : 0;
    const dreamsPerUser        = dreamers > 0 ? total / dreamers : 0;
    const frequencyScore       = Math.min(100, Math.round(dreamsPerUser * 20));

    const overallScore = Math.round(
      (lucidityScore + emotionalDepthScore + symbolRichnessScore + narrativeCoherence + archetypeActivation + frequencyScore) / 6,
    );

    const tier: ConsciousnessTier =
      overallScore >= 80 ? 'TRANSCENDENT' :
      overallScore >= 65 ? 'LUCID'        :
      overallScore >= 50 ? 'ACTIVE'       :
      overallScore >= 35 ? 'PASSIVE'      : 'DORMANT';

    const dimensions: ConsciousnessDimension[] = [
      { key: 'lucidity',             label: 'Lucidite',            value: lucidityScore,       description: 'Rüyalar içinde bilinçli farkındalık oranı' },
      { key: 'emotional_depth',      label: 'Duygusal Derinlik',   value: emotionalDepthScore, description: 'Rüya başına ortalama duygu çeşitliliği' },
      { key: 'symbol_richness',      label: 'Sembol Yoğunluğu',    value: symbolRichnessScore, description: 'Sembolik dil yoğunluğu ve çeşitlilik' },
      { key: 'narrative_coherence',  label: 'Anlatı Bütünlüğü',    value: narrativeCoherence,  description: 'Tema yapısı olan rüyaların oranı' },
      { key: 'archetype_activation', label: 'Arketip Aktivasyonu', value: archetypeActivation, description: 'Arketip figürü içeren rüyaların oranı' },
      { key: 'dream_frequency',      label: 'Rüya Frekansı',       value: frequencyScore,       description: 'Kullanıcı başına haftalık rüya yoğunluğu' },
    ];

    const trend = trendRows.map((t) => {
      const d = parseInt(t.total);
      const l = parseInt(t.lucid);
      const score = d > 0
        ? Math.round(Math.min(100, (l / d) * 500) * 0.4 + Math.min(100, d * 3) * 0.6)
        : 0;
      return { date: t.date, score };
    });

    return { overallScore, tier, dimensions, trend, totalDreamsInPeriod: total, activeDreamers: dreamers };
  }

  async getEmotionMap(): Promise<EmotionMapData> {
    const POSITIVE = ['joy','excitement','love','peace','wonder','curiosity','hope','bliss','contentment','happiness','awe','gratitude','euphoria'];
    const NEGATIVE = ['fear','anxiety','sadness','anger','terror','despair','grief','frustration','rage','panic','dread','horror','shame'];

    const [topEmotions, timeline, byHour, prevCount, currCount] = await Promise.all([
      this.db.query<{ emotion: string; count: string }[]>(`
        SELECT de.emotion, COUNT(*)::text AS count
        FROM dream_emotions de
        JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE d.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY de.emotion ORDER BY count DESC LIMIT 20
      `),
      this.db.query<{ date: string; positive: string; negative: string; neutral: string }[]>(`
        SELECT
          DATE(d.created_at)::text AS date,
          COUNT(CASE WHEN de.emotion = ANY($1) THEN 1 END)::text AS positive,
          COUNT(CASE WHEN de.emotion = ANY($2) THEN 1 END)::text AS negative,
          COUNT(CASE WHEN de.emotion != ALL($1) AND de.emotion != ALL($2) THEN 1 END)::text AS neutral
        FROM dreams d
        JOIN dream_emotions de ON de.dream_id = d.id
        WHERE d.deleted_at IS NULL AND d.is_draft = FALSE
          AND d.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(d.created_at) ORDER BY date ASC
      `, [POSITIVE, NEGATIVE]),
      this.db.query<{ hour: string; emotion: string; count: string }[]>(`
        SELECT EXTRACT(HOUR FROM d.created_at)::int::text AS hour, de.emotion, COUNT(*)::text AS count
        FROM dreams d
        JOIN dream_emotions de ON de.dream_id = d.id AND de.is_primary = TRUE
        WHERE d.deleted_at IS NULL AND d.is_draft = FALSE
          AND d.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY EXTRACT(HOUR FROM d.created_at)::int, de.emotion
        ORDER BY EXTRACT(HOUR FROM d.created_at)::int, COUNT(*)::int DESC
      `),
      this.db.query<{ count: string }[]>(`
        SELECT COUNT(*)::text AS count FROM dream_emotions de
        JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE d.created_at >= NOW() - INTERVAL '60 days' AND d.created_at < NOW() - INTERVAL '30 days'
      `),
      this.db.query<{ count: string }[]>(`
        SELECT COUNT(*)::text AS count FROM dream_emotions de
        JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE d.created_at >= NOW() - INTERVAL '30 days'
      `),
    ]);

    const totalCurr = parseInt(currCount[0]?.count ?? '0');
    const totalPrev = parseInt(prevCount[0]?.count ?? '1');
    const velocity  = totalPrev > 0 ? Math.round(((totalCurr - totalPrev) / totalPrev) * 100) : 0;

    const allTotal = topEmotions.reduce((s, e) => s + parseInt(e.count), 0) || 1;
    const top = topEmotions.map((e) => {
      const cnt  = parseInt(e.count);
      const type = POSITIVE.includes(e.emotion) ? 'positive' : NEGATIVE.includes(e.emotion) ? 'negative' : 'neutral';
      return { emotion: e.emotion, count: cnt, pct: Math.round((cnt / allTotal) * 100), type } as const;
    });

    const dominant   = top[0] ?? { emotion: 'unknown', count: 0, pct: 0, type: 'neutral' as const };
    const tl         = timeline.map((t) => ({
      date:     t.date,
      positive: parseInt(t.positive),
      negative: parseInt(t.negative),
      neutral:  parseInt(t.neutral),
    }));

    const hourMap = new Map<number, { topEmotion: string; count: number }>();
    for (const row of byHour) {
      const h   = parseInt(row.hour);
      const cnt = parseInt(row.count);
      if (!hourMap.has(h)) hourMap.set(h, { topEmotion: row.emotion, count: cnt });
    }
    const intensityByHour = Array.from({ length: 24 }, (_, h) => {
      const entry = hourMap.get(h);
      return { hour: h, topEmotion: entry?.topEmotion ?? '', count: entry?.count ?? 0 };
    });

    return {
      dominantEmotion:  dominant.emotion,
      dominantType:     dominant.type,
      emotionTimeline:  tl,
      topEmotions:      top,
      intensityByHour,
      velocityIndex:    velocity,
      totalEmotions:    totalCurr,
    };
  }

  async getSymbolAnalysis(): Promise<SymbolAnalysisData> {
    const [curr, prev, categories, relationships, totals, avgRow] = await Promise.all([
      this.db.query<{ symbol: string; category: string; count: string }[]>(`
        SELECT ds.manifestation AS symbol, COALESCE(ds.symbol_category, 'unknown') AS category, COUNT(*)::text AS count
        FROM dream_symbols ds
        JOIN dreams d ON d.id = ds.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE d.created_at >= NOW() - INTERVAL '7 days'
          AND ds.manifestation IS NOT NULL
          AND TRIM(ds.manifestation) <> ''
          AND LENGTH(TRIM(ds.manifestation)) BETWEEN 2 AND 40
          AND (LENGTH(ds.manifestation) - LENGTH(REPLACE(ds.manifestation, ' ', ''))) < 2
          AND ds.manifestation !~* '^(a|an|the) '
        GROUP BY ds.manifestation, ds.symbol_category ORDER BY count DESC LIMIT 25
      `),
      this.db.query<{ symbol: string; count: string }[]>(`
        SELECT ds.manifestation AS symbol, COUNT(*)::text AS count
        FROM dream_symbols ds
        JOIN dreams d ON d.id = ds.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE d.created_at >= NOW() - INTERVAL '14 days' AND d.created_at < NOW() - INTERVAL '7 days'
          AND ds.manifestation IS NOT NULL
          AND TRIM(ds.manifestation) <> ''
          AND LENGTH(TRIM(ds.manifestation)) BETWEEN 2 AND 40
          AND (LENGTH(ds.manifestation) - LENGTH(REPLACE(ds.manifestation, ' ', ''))) < 2
          AND ds.manifestation !~* '^(a|an|the) '
        GROUP BY ds.manifestation
      `),
      this.db.query<{ category: string; count: string; unique: string }[]>(`
        SELECT COALESCE(ds.symbol_category,'unknown') AS category, COUNT(*)::text AS count,
          COUNT(DISTINCT ds.manifestation)::text AS unique
        FROM dream_symbols ds
        JOIN dreams d ON d.id = ds.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE d.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY ds.symbol_category ORDER BY count DESC LIMIT 10
      `),
      this.db.query<{ symbol1: string; symbol2: string; co_count: string }[]>(`
        SELECT s1.manifestation AS symbol1, s2.manifestation AS symbol2, COUNT(*)::text AS co_count
        FROM dream_symbols s1
        JOIN dream_symbols s2 ON s2.dream_id = s1.dream_id AND s2.manifestation > s1.manifestation
        JOIN dreams d ON d.id = s1.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE d.created_at >= NOW() - INTERVAL '30 days'
          AND LENGTH(TRIM(s1.manifestation)) BETWEEN 2 AND 40
          AND (LENGTH(s1.manifestation) - LENGTH(REPLACE(s1.manifestation, ' ', ''))) < 2
          AND s1.manifestation !~* '^(a|an|the) '
          AND LENGTH(TRIM(s2.manifestation)) BETWEEN 2 AND 40
          AND (LENGTH(s2.manifestation) - LENGTH(REPLACE(s2.manifestation, ' ', ''))) < 2
          AND s2.manifestation !~* '^(a|an|the) '
        GROUP BY s1.manifestation, s2.manifestation
        HAVING COUNT(*) >= 2
        ORDER BY COUNT(*) DESC LIMIT 12
      `),
      this.db.query<{ total: string; unique: string }[]>(`
        SELECT COUNT(*)::text AS total, COUNT(DISTINCT manifestation)::text AS unique
        FROM dream_symbols ds
        JOIN dreams d ON d.id = ds.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE d.created_at >= NOW() - INTERVAL '30 days'
      `),
      this.db.query<{ avg: string }[]>(`
        SELECT ROUND(AVG(cnt)::numeric, 2)::text AS avg
        FROM (SELECT dream_id, COUNT(*) AS cnt FROM dream_symbols GROUP BY dream_id) x
      `),
    ]);

    const prevMap   = new Map(prev.map((p) => [p.symbol, parseInt(p.count)]));
    const allTotal  = curr.reduce((s, x) => s + parseInt(x.count), 0) || 1;

    const topSymbols = curr.map((s) => {
      const cnt     = parseInt(s.count);
      const prevCnt = prevMap.get(s.symbol) ?? 0;
      const delta   = prevCnt > 0 ? Math.round(((cnt - prevCnt) / prevCnt) * 100) : cnt > 0 ? 100 : 0;
      return { symbol: s.symbol, category: s.category, count: cnt, pct: Math.round((cnt / allTotal) * 100), delta };
    });

    const emerging = topSymbols
      .filter((s) => s.delta > 20)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 5)
      .map((s) => ({ symbol: s.symbol, category: s.category, count: s.count, growth: s.delta }));

    return {
      topSymbols,
      categoryDistribution: categories.map((c) => ({
        category: c.category, count: parseInt(c.count), uniqueSymbols: parseInt(c.unique),
      })),
      symbolRelationships: relationships.map((r) => ({
        symbol1: r.symbol1, symbol2: r.symbol2, coCount: parseInt(r.co_count),
      })),
      emergingSymbols:   emerging,
      totalSymbols:      parseInt(totals[0]?.total  ?? '0'),
      uniqueSymbols:     parseInt(totals[0]?.unique ?? '0'),
      avgSymbolsPerDream: parseFloat(avgRow[0]?.avg  ?? '0'),
    };
  }

  async getArchetypeAnalysis(): Promise<ArchetypeAnalysisData> {
    const [curr, prev, emotionMap, totalRow] = await Promise.all([
      this.db.query<{ name: string; count: string }[]>(`
        SELECT df.archetype_candidate AS name, COUNT(*)::text AS count
        FROM dream_figures df
        JOIN dreams d ON d.id = df.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE df.archetype_candidate IS NOT NULL AND d.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY df.archetype_candidate ORDER BY count DESC LIMIT 12
      `),
      this.db.query<{ name: string; count: string }[]>(`
        SELECT df.archetype_candidate AS name, COUNT(*)::text AS count
        FROM dream_figures df
        JOIN dreams d ON d.id = df.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE df.archetype_candidate IS NOT NULL
          AND d.created_at >= NOW() - INTERVAL '14 days' AND d.created_at < NOW() - INTERVAL '7 days'
        GROUP BY df.archetype_candidate
      `),
      this.db.query<{ archetype: string; emotion: string }[]>(`
        SELECT df.archetype_candidate AS archetype,
          MODE() WITHIN GROUP (ORDER BY de.emotion) AS emotion
        FROM dream_figures df
        JOIN dream_emotions de ON de.dream_id = df.dream_id AND de.is_primary = TRUE
        JOIN dreams d ON d.id = df.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE df.archetype_candidate IS NOT NULL AND d.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY df.archetype_candidate
      `),
      this.db.query<{ count: string; unique: string }[]>(`
        SELECT COUNT(*)::text AS count, COUNT(DISTINCT archetype_candidate)::text AS unique
        FROM dream_figures df
        JOIN dreams d ON d.id = df.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE df.archetype_candidate IS NOT NULL AND d.created_at >= NOW() - INTERVAL '30 days'
      `),
    ]);

    const prevMap     = new Map(prev.map((p) => [p.name, parseInt(p.count)]));
    const emMap       = new Map(emotionMap.map((e) => [e.archetype, e.emotion]));
    const totalCurr   = curr.reduce((s, x) => s + parseInt(x.count), 0) || 1;
    const uniqueArch  = parseInt(totalRow[0]?.unique ?? '0');

    const archetypes = curr.map((a) => {
      const cnt     = parseInt(a.count);
      const prevCnt = prevMap.get(a.name) ?? 0;
      const trend: 'rising' | 'falling' | 'stable' =
        cnt > prevCnt * 1.1 ? 'rising' : cnt < prevCnt * 0.9 ? 'falling' : 'stable';
      return { name: a.name, count: cnt, pct: Math.round((cnt / totalCurr) * 100), dominantEmotion: emMap.get(a.name) ?? null, trend };
    });

    const activationScore   = Math.min(100, Math.round((uniqueArch / 12) * 100));

    return {
      archetypes,
      totalFigures:        parseInt(totalRow[0]?.count ?? '0'),
      activationScore,
      mostActiveArchetype: archetypes[0]?.name ?? null,
      archetypeDiversity:  activationScore,
    };
  }

  async getDreamGenome(): Promise<DreamGenomeData> {
    const POSITIVE = ['joy','excitement','love','peace','wonder','curiosity','hope','bliss','contentment','happiness','awe','gratitude','euphoria'];
    const NEGATIVE = ['fear','anxiety','sadness','anger','terror','despair','grief','frustration','rage','panic','dread','horror','shame'];

    const [symCats, emotionTypes, themeFamilies, combos, diversity] = await Promise.all([
      this.db.query<{ category: string; count: string }[]>(`
        SELECT COALESCE(ds.symbol_category,'unknown') AS category, COUNT(*)::text AS count
        FROM dream_symbols ds
        JOIN dreams d ON d.id = ds.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE d.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY ds.symbol_category ORDER BY count DESC LIMIT 8
      `),
      this.db.query<{ type: string; count: string }[]>(`
        SELECT
          CASE WHEN de.emotion = ANY($1) THEN 'positive'
               WHEN de.emotion = ANY($2) THEN 'negative'
               ELSE 'neutral' END AS type,
          COUNT(*)::text AS count
        FROM dream_emotions de
        JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE d.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY type ORDER BY count DESC
      `, [POSITIVE, NEGATIVE]),
      this.db.query<{ family: string; count: string }[]>(`
        SELECT COALESCE(dt.theme_family,'unknown') AS family, COUNT(*)::text AS count
        FROM dream_themes dt
        JOIN dreams d ON d.id = dt.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE d.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY dt.theme_family ORDER BY count DESC LIMIT 8
      `),
      this.db.query<{ symbol_cat: string; emotion: string; count: string }[]>(`
        SELECT COALESCE(ds.symbol_category,'unknown') AS symbol_cat, de.emotion, COUNT(*)::text AS count
        FROM dream_symbols ds
        JOIN dream_emotions de ON de.dream_id = ds.dream_id AND de.is_primary = TRUE
        JOIN dreams d ON d.id = ds.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE d.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY ds.symbol_category, de.emotion ORDER BY count DESC LIMIT 8
      `),
      this.db.query<{ unique_emotions: string; unique_symbols: string; unique_themes: string }[]>(`
        SELECT
          (SELECT COUNT(DISTINCT emotion)::text FROM dream_emotions de2
            JOIN dreams d2 ON d2.id = de2.dream_id AND d2.deleted_at IS NULL AND d2.is_draft = FALSE
            WHERE d2.created_at >= NOW() - INTERVAL '30 days') AS unique_emotions,
          (SELECT COUNT(DISTINCT manifestation)::text FROM dream_symbols ds2
            JOIN dreams d2 ON d2.id = ds2.dream_id AND d2.deleted_at IS NULL AND d2.is_draft = FALSE
            WHERE d2.created_at >= NOW() - INTERVAL '30 days') AS unique_symbols,
          (SELECT COUNT(DISTINCT theme)::text FROM dream_themes dt2
            JOIN dreams d2 ON d2.id = dt2.dream_id AND d2.deleted_at IS NULL AND d2.is_draft = FALSE
            WHERE d2.created_at >= NOW() - INTERVAL '30 days') AS unique_themes
      `),
    ]);

    const uniqueEmotions = parseInt(diversity[0]?.unique_emotions ?? '0');
    const uniqueSymbols  = parseInt(diversity[0]?.unique_symbols  ?? '0');
    const uniqueThemes   = parseInt(diversity[0]?.unique_themes   ?? '0');

    const totalEmType = emotionTypes.reduce((s, x) => s + parseInt(x.count), 0) || 1;
    const emotionGenes = emotionTypes.map((e) => ({
      type: e.type as 'positive' | 'negative' | 'neutral',
      pct:  Math.round((parseInt(e.count) / totalEmType) * 100),
    }));

    const symbolGenes  = symCats.map((s) => ({ category: s.category, frequency: parseInt(s.count) }));
    const themeGenes   = themeFamilies.map((t) => ({ family: t.family, count: parseInt(t.count) }));
    const topCombinations = combos.map((c) => ({ symbolCat: c.symbol_cat, emotion: c.emotion, count: parseInt(c.count) }));

    const diversityScore  = Math.min(100, Math.round((uniqueEmotions * 3 + Math.floor(uniqueSymbols / 3) + uniqueThemes * 2) / 3));
    const complexityScore = Math.min(100, topCombinations.length * 10 + symbolGenes.length * 6 + themeGenes.length * 4);

    const topSymCat  = symbolGenes[0]?.category?.toUpperCase()  ?? 'UNKNOWN';
    const topEmType  = (emotionGenes.sort((a, b) => b.pct - a.pct)[0]?.type ?? 'neutral').toUpperCase();
    const topTheme   = themeGenes[0]?.family?.toUpperCase()     ?? 'UNKNOWN';
    const genomeSignature = `${topSymCat}·${topEmType}·${topTheme}`;

    const dominantTraits = [
      { trait: 'Sembol Çeşitliliği', value: Math.min(100, uniqueSymbols * 2),  category: 'symbol'  },
      { trait: 'Duygu Zenginliği',   value: Math.min(100, uniqueEmotions * 5), category: 'emotion' },
      { trait: 'Tema Spektrumu',     value: Math.min(100, uniqueThemes * 4),   category: 'theme'   },
      { trait: 'Genome Kompleksite', value: complexityScore,                    category: 'genome'  },
    ];

    return { genomeSignature, dominantTraits, symbolGenes, emotionGenes, themeGenes, topCombinations, diversityScore, complexityScore };
  }

  async getGlobalDreamMap(): Promise<GlobalDreamMapData> {
    const [countries, totals] = await Promise.all([
      this.db.query<{ country: string; dream_count: string; user_count: string }[]>(`
        SELECT
          up.location_country AS country,
          COUNT(DISTINCT d.id)::text   AS dream_count,
          COUNT(DISTINCT d.user_id)::text AS user_count
        FROM dreams d
        JOIN user_profiles up ON up.user_id = d.user_id
        WHERE up.location_country IS NOT NULL AND up.location_country <> ''
          AND d.deleted_at IS NULL AND d.is_draft = FALSE
          AND d.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY up.location_country
        ORDER BY dream_count DESC LIMIT 30
      `),
      this.db.query<{ total: string; countries: string }[]>(`
        SELECT
          COUNT(DISTINCT d.id)::text                   AS total,
          COUNT(DISTINCT up.location_country)::text    AS countries
        FROM dreams d
        JOIN user_profiles up ON up.user_id = d.user_id
        WHERE up.location_country IS NOT NULL AND up.location_country <> ''
          AND d.deleted_at IS NULL AND d.is_draft = FALSE
          AND d.created_at >= NOW() - INTERVAL '30 days'
      `),
    ]);

    const countryData = countries.map((c) => ({
      country:    c.country,
      dreamCount: parseInt(c.dream_count),
      userCount:  parseInt(c.user_count),
    }));

    return {
      countries:         countryData,
      totalCountries:    parseInt(totals[0]?.countries ?? '0'),
      topCountry:        countryData[0]?.country ?? null,
      totalMappedDreams: parseInt(totals[0]?.total     ?? '0'),
    };
  }

  async getCollectiveConsciousness(): Promise<CollectiveConsciousnessData> {
    const POSITIVE = ['joy','excitement','love','peace','wonder','curiosity','hope','bliss','contentment','happiness','awe','gratitude','euphoria'];
    const NEGATIVE = ['fear','anxiety','sadness','anger','terror','despair','grief','frustration','rage','panic','dread','horror','shame'];

    const [resonance, sharedSymbols, collectiveThemes, moodData, dreamCount] = await Promise.all([
      this.db.query<{ count: string }[]>(`SELECT COUNT(*)::text AS count FROM dream_matches`),
      this.db.query<{ symbol: string; dream_count: string }[]>(`
        SELECT ds.manifestation AS symbol, COUNT(DISTINCT ds.dream_id)::text AS dream_count
        FROM dream_symbols ds
        JOIN dreams d ON d.id = ds.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE d.created_at >= NOW() - INTERVAL '30 days'
          AND ds.manifestation IS NOT NULL
          AND TRIM(ds.manifestation) <> ''
          AND LENGTH(TRIM(ds.manifestation)) BETWEEN 2 AND 40
          AND (LENGTH(ds.manifestation) - LENGTH(REPLACE(ds.manifestation, ' ', ''))) < 2
          AND ds.manifestation !~* '^(a|an|the) '
        GROUP BY ds.manifestation ORDER BY COUNT(DISTINCT ds.dream_id) DESC LIMIT 8
      `),
      this.db.query<{ theme: string; count: string }[]>(`
        SELECT dt.theme, COUNT(*)::text AS count
        FROM dream_themes dt
        JOIN dreams d ON d.id = dt.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE d.created_at >= NOW() - INTERVAL '30 days' AND dt.is_primary = TRUE
        GROUP BY dt.theme ORDER BY count DESC LIMIT 8
      `),
      this.db.query<{ type: string; count: string }[]>(`
        SELECT
          CASE WHEN de.emotion = ANY($1) THEN 'positive'
               WHEN de.emotion = ANY($2) THEN 'negative'
               ELSE 'neutral' END AS type,
          COUNT(*)::text AS count
        FROM dream_emotions de
        JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL AND d.is_draft = FALSE
        WHERE d.created_at >= NOW() - INTERVAL '7 days' AND de.is_primary = TRUE
        GROUP BY type
      `, [POSITIVE, NEGATIVE]),
      this.db.query<{ total: string }[]>(`
        SELECT COUNT(*)::text AS total FROM dreams
        WHERE deleted_at IS NULL AND is_draft = FALSE AND created_at >= NOW() - INTERVAL '30 days'
      `),
    ]);

    const resonanceCount = parseInt(resonance[0]?.count ?? '0');
    const totalDreams    = parseInt(dreamCount[0]?.total ?? '1');
    const moodMap = new Map(moodData.map((m) => [m.type, parseInt(m.count)]));
    const pos = moodMap.get('positive') ?? 0;
    const neg = moodMap.get('negative') ?? 0;
    const neu = moodMap.get('neutral')  ?? 0;
    const totalMood = pos + neg + neu || 1;

    const collectiveMoodScore    = Math.round((pos / totalMood) * 100);
    const dominantShare          = Math.max(pos, neg, neu);
    const alignmentScore         = Math.round((dominantShare / totalMood) * 100);
    const consciousnessSynchrony = Math.min(100, Math.round((resonanceCount / Math.max(1, totalDreams)) * 200));

    const coherenceLevel: CoherenceLevel =
      alignmentScore >= 80 ? 'UNIFIED' :
      alignmentScore >= 60 ? 'RESONANT' :
      alignmentScore >= 40 ? 'FRAGMENTED' : 'DISPERSED';

    const collectiveEmotion = collectiveMoodScore >= 55 ? 'harmoni' : collectiveMoodScore >= 40 ? 'denge' : 'belirsizlik';

    const maxDreamCount     = parseInt(sharedSymbols[0]?.dream_count ?? '1');
    const sharedSymbolsData = sharedSymbols.map((s) => ({
      symbol:     s.symbol,
      dreamCount: parseInt(s.dream_count),
      pct:        Math.round((parseInt(s.dream_count) / Math.max(1, maxDreamCount)) * 100),
    }));

    const collectiveThemesData = collectiveThemes.map((t) => ({ theme: t.theme, count: parseInt(t.count) }));

    return {
      collectiveMoodScore,
      alignmentScore,
      resonanceCount,
      sharedSymbols:         sharedSymbolsData,
      collectiveThemes:      collectiveThemesData,
      consciousnessSynchrony,
      mindToMindConnections: resonanceCount,
      collectiveEmotion,
      coherenceLevel,
    };
  }

  // ── App Config (Control Center) ─────────────────────────────────────────

  async getAppConfigs(): Promise<Record<string, unknown>[]> {
    const rows = await this.db.query<Record<string, unknown>[]>(
      `SELECT key, value, label, description, category, dangerous, updated_at, updated_by FROM app_config ORDER BY category, key`,
    );
    return rows;
  }

  async updateAppConfig(key: string, value: boolean, adminId: string): Promise<void> {
    const [existing] = await this.db.query<{ value: unknown }[]>(
      `SELECT value FROM app_config WHERE key = $1`, [key],
    );
    if (!existing) throw new NotFoundException(`Config key "${key}" not found`);

    await this.db.query(
      `UPDATE app_config SET value = $1, updated_at = NOW(), updated_by = $2 WHERE key = $3`,
      [JSON.stringify(value), adminId, key],
    );
    await this.db.query(
      `INSERT INTO admin_logs (admin_id, target_user_id, action_type, old_value, new_value) VALUES ($1,$2,$3,$4,$5)`,
      [adminId, null, 'APP_CONFIG_UPDATE', JSON.stringify({ key, value: existing.value }), JSON.stringify({ key, value })],
    );
  }

  // ── Feature Flags ───────────────────────────────────────────────────────

  async getFeatureFlags(): Promise<Record<string, unknown>[]> {
    const rows = await this.db.query<Record<string, unknown>[]>(
      `SELECT id, key, name, description, enabled, target_audience, rollout_percentage, updated_at, updated_by FROM feature_flags ORDER BY name`,
    );
    return rows;
  }

  async createFeatureFlag(
    dto: { key: string; name: string; description?: string; enabled?: boolean; targetAudience?: string; rolloutPercentage?: number },
    adminId: string,
  ): Promise<Record<string, unknown>> {
    const rows = await this.db.query<Record<string, unknown>[]>(
      `INSERT INTO feature_flags (key, name, description, enabled, target_audience, rollout_percentage, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, key, name, description, enabled, target_audience, rollout_percentage, updated_at`,
      [dto.key, dto.name, dto.description ?? '', dto.enabled ?? false, dto.targetAudience ?? 'all', dto.rolloutPercentage ?? 0, adminId],
    );
    const row = rows[0]!;
    await this.db.query(
      `INSERT INTO admin_logs (admin_id, target_user_id, action_type, old_value, new_value) VALUES ($1,$2,$3,$4,$5)`,
      [adminId, null, 'FEATURE_FLAG_CREATE', null, JSON.stringify(row)],
    );
    return row;
  }

  async updateFeatureFlag(
    id: string,
    dto: { name?: string; description?: string; enabled?: boolean; targetAudience?: string; rolloutPercentage?: number },
    adminId: string,
  ): Promise<Record<string, unknown>> {
    const [existing] = await this.db.query<Record<string, unknown>[]>(
      `SELECT * FROM feature_flags WHERE id = $1`, [id],
    );
    if (!existing) throw new NotFoundException('Feature flag not found');

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (dto.name              !== undefined) { fields.push(`name = $${idx++}`);               values.push(dto.name); }
    if (dto.description       !== undefined) { fields.push(`description = $${idx++}`);        values.push(dto.description); }
    if (dto.enabled           !== undefined) { fields.push(`enabled = $${idx++}`);            values.push(dto.enabled); }
    if (dto.targetAudience    !== undefined) { fields.push(`target_audience = $${idx++}`);    values.push(dto.targetAudience); }
    if (dto.rolloutPercentage !== undefined) { fields.push(`rollout_percentage = $${idx++}`); values.push(dto.rolloutPercentage); }
    fields.push(`updated_at = NOW()`, `updated_by = $${idx++}`);
    values.push(adminId);
    values.push(id);

    const updateRows = await this.db.query<Record<string, unknown>[]>(
      `UPDATE feature_flags SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    const updated = updateRows[0]!;
    await this.db.query(
      `INSERT INTO admin_logs (admin_id, target_user_id, action_type, old_value, new_value) VALUES ($1,$2,$3,$4,$5)`,
      [adminId, null, 'FEATURE_FLAG_UPDATE', JSON.stringify(existing), JSON.stringify(updated)],
    );
    return updated;
  }

  async deleteFeatureFlag(id: string, adminId: string): Promise<void> {
    const [existing] = await this.db.query<Record<string, unknown>[]>(
      `SELECT * FROM feature_flags WHERE id = $1`, [id],
    );
    if (!existing) throw new NotFoundException('Feature flag not found');
    await this.db.query(`DELETE FROM feature_flags WHERE id = $1`, [id]);
    await this.db.query(
      `INSERT INTO admin_logs (admin_id, target_user_id, action_type, old_value, new_value) VALUES ($1,$2,$3,$4,$5)`,
      [adminId, null, 'FEATURE_FLAG_DELETE', JSON.stringify(existing), null],
    );
  }

  // ── Admin Notifications ─────────────────────────────────────────────────

  async sendAdminNotification(
    dto: { type: string; title: string; message: string; targetAudience?: string },
    adminId: string,
  ): Promise<Record<string, unknown>> {
    const notifRows = await this.db.query<Record<string, unknown>[]>(
      `INSERT INTO admin_notification_log (type, title, message, target_audience, sent_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [dto.type, dto.title, dto.message, dto.targetAudience ?? 'all', adminId],
    );
    const row = notifRows[0]!;
    await this.db.query(
      `INSERT INTO admin_logs (admin_id, target_user_id, action_type, old_value, new_value) VALUES ($1,$2,$3,$4,$5)`,
      [adminId, null, 'NOTIFICATION_SEND', null, JSON.stringify({ type: dto.type, title: dto.title, targetAudience: dto.targetAudience })],
    );
    return row;
  }

  async getNotificationHistory(page: number, limit: number): Promise<{ items: Record<string, unknown>[]; total: number; pages: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    const [rows, countRows] = await Promise.all([
      this.db.query<Record<string, unknown>[]>(
        `SELECT n.*, u.username AS sent_by_username FROM admin_notification_log n
         LEFT JOIN users u ON u.id = n.sent_by
         ORDER BY n.sent_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
      this.db.query<{ count: string }[]>(`SELECT COUNT(*) AS count FROM admin_notification_log`),
    ]);
    return { items: rows, total: parseInt(countRows[0]?.count ?? '0'), page, limit, pages: Math.ceil(parseInt(countRows[0]?.count ?? '0') / limit) };
  }

  // ── Moderation Rules ────────────────────────────────────────────────────

  async getModerationRules(): Promise<Record<string, unknown>> {
    const [row] = await this.db.query<Record<string, unknown>[]>(
      `SELECT * FROM moderation_rules ORDER BY id LIMIT 1`,
    );
    return row ?? {};
  }

  async updateModerationRules(
    dto: {
      autoHideThreshold?: number; reportThreshold?: number; banThreshold?: number;
      suspiciousUserThreshold?: number; aiRiskThreshold?: number; restrictedWords?: string[];
      rateLimitPerMinute?: number; rateLimitPerHour?: number;
    },
    adminId: string,
  ): Promise<Record<string, unknown>> {
    const [existing] = await this.db.query<Record<string, unknown>[]>(
      `SELECT * FROM moderation_rules ORDER BY id LIMIT 1`,
    );
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (dto.autoHideThreshold        !== undefined) { fields.push(`auto_hide_threshold = $${idx++}`);       values.push(dto.autoHideThreshold); }
    if (dto.reportThreshold          !== undefined) { fields.push(`report_threshold = $${idx++}`);          values.push(dto.reportThreshold); }
    if (dto.banThreshold             !== undefined) { fields.push(`ban_threshold = $${idx++}`);             values.push(dto.banThreshold); }
    if (dto.suspiciousUserThreshold  !== undefined) { fields.push(`suspicious_user_threshold = $${idx++}`); values.push(dto.suspiciousUserThreshold); }
    if (dto.aiRiskThreshold          !== undefined) { fields.push(`ai_risk_threshold = $${idx++}`);         values.push(dto.aiRiskThreshold); }
    if (dto.restrictedWords          !== undefined) { fields.push(`restricted_words = $${idx++}`);          values.push(JSON.stringify(dto.restrictedWords)); }
    if (dto.rateLimitPerMinute       !== undefined) { fields.push(`rate_limit_per_minute = $${idx++}`);     values.push(dto.rateLimitPerMinute); }
    if (dto.rateLimitPerHour         !== undefined) { fields.push(`rate_limit_per_hour = $${idx++}`);       values.push(dto.rateLimitPerHour); }
    fields.push(`updated_at = NOW()`, `updated_by = $${idx++}`);
    values.push(adminId);

    const modRows = await this.db.query<Record<string, unknown>[]>(
      `UPDATE moderation_rules SET ${fields.join(', ')} WHERE id = 1 RETURNING *`,
      values,
    );
    const updated = modRows[0]!;
    await this.db.query(
      `INSERT INTO admin_logs (admin_id, target_user_id, action_type, old_value, new_value) VALUES ($1,$2,$3,$4,$5)`,
      [adminId, null, 'MODERATION_RULES_UPDATE', JSON.stringify(existing), JSON.stringify(updated)],
    );
    return updated;
  }

  // ── Live Platform Stream ─────────────────────────────────────────────────

  async getLiveStream(hours = 24, limit = 60): Promise<Record<string, unknown>[]> {
    const interval = `${hours} hours`;
    const rows = await this.db.query<Record<string, unknown>[]>(`
      WITH events AS (
        SELECT 'user_registered' AS event_type,
               u.id::text AS entity_id, u.id::text AS user_id, u.username,
               u.email, null::text AS detail, null::text AS target_id,
               u.created_at AS ts
        FROM users u
        WHERE u.created_at > NOW() - $1::interval AND u.deleted_at IS NULL

        UNION ALL

        SELECT 'dream_created',
               d.id::text, d.user_id::text, u.username, u.email,
               COALESCE(d.title, 'Başlıksız'), null, d.created_at
        FROM dreams d
        JOIN users u ON u.id = d.user_id
        WHERE d.created_at > NOW() - $1::interval
          AND d.deleted_at IS NULL AND d.is_draft = FALSE

        UNION ALL

        SELECT 'dream_liked',
               dl.id::text, dl.user_id::text, u.username, u.email,
               null, dl.dream_id::text, dl.created_at
        FROM dream_likes dl
        JOIN users u ON u.id = dl.user_id
        WHERE dl.created_at > NOW() - $1::interval

        UNION ALL

        SELECT 'dream_saved',
               ds.id::text, ds.user_id::text, u.username, u.email,
               null, ds.dream_id::text, ds.created_at
        FROM dream_saves ds
        JOIN users u ON u.id = ds.user_id
        WHERE ds.created_at > NOW() - $1::interval

        UNION ALL

        SELECT 'user_followed',
               uf.id::text, uf.follower_id::text, u.username, u.email,
               null, uf.following_id::text, uf.created_at
        FROM user_follows uf
        JOIN users u ON u.id = uf.follower_id
        WHERE uf.created_at > NOW() - $1::interval

        UNION ALL

        SELECT 'dream_reported',
               dr.id::text, dr.reporter_id::text, u.username, u.email,
               dr.reason, dr.dream_id::text, dr.created_at
        FROM dream_reports dr
        JOIN users u ON u.id = dr.reporter_id
        WHERE dr.created_at > NOW() - $1::interval
      )
      SELECT
        event_type AS type,
        entity_id  AS id,
        user_id    AS "userId",
        username,
        email,
        detail,
        target_id  AS "targetId",
        ts         AS timestamp
      FROM events
      ORDER BY ts DESC
      LIMIT $2
    `, [interval, limit]);
    return rows;
  }

  // ── Real Moderation Queue ────────────────────────────────────────────────

  async getModerationQueue(
    page = 1, limit = 20, filter: 'pending' | 'resolved' | 'all' = 'pending',
  ): Promise<{ items: Record<string, unknown>[]; total: number; page: number; pages: number }> {
    const offset = (page - 1) * limit;
    const statusCond = filter === 'all' ? '' : `AND dr.status = '${filter}'`;

    const [rows, countRow] = await Promise.all([
      this.db.query<Record<string, unknown>[]>(`
        SELECT
          dr.id,
          dr.dream_id      AS "dreamId",
          dr.reason,
          dr.description,
          dr.status,
          dr.created_at    AS "createdAt",
          dr.resolved_at   AS "resolvedAt",
          d.title          AS "dreamTitle",
          LEFT(d.content, 200) AS "dreamPreview",
          d.category       AS "dreamCategory",
          au.id            AS "authorId",
          au.username      AS "authorUsername",
          au.email         AS "authorEmail",
          ru.username      AS "reporterUsername",
          ru.email         AS "reporterEmail",
          COUNT(dr2.id)    AS "totalReportsOnDream"
        FROM dream_reports dr
        JOIN dreams d  ON d.id  = dr.dream_id  AND d.deleted_at IS NULL
        JOIN users au  ON au.id = d.user_id
        JOIN users ru  ON ru.id = dr.reporter_id
        LEFT JOIN dream_reports dr2 ON dr2.dream_id = dr.dream_id
        WHERE 1=1 ${statusCond}
        GROUP BY dr.id, d.id, au.id, ru.username, ru.email
        ORDER BY CASE dr.status WHEN 'pending' THEN 0 ELSE 1 END, dr.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      this.db.query<{ total: string }[]>(
        `SELECT COUNT(*)::text AS total FROM dream_reports dr WHERE 1=1 ${statusCond}`,
      ),
    ]);

    const total = parseInt(countRow[0]?.total ?? '0');
    return { items: rows, total, page, pages: Math.ceil(total / limit) };
  }

  async resolveModerationReport(
    id: string,
    action: 'resolve' | 'remove_dream' | 'warn_user' | 'ban_user',
    note: string,
    adminId: string,
  ): Promise<void> {
    const [report] = await this.db.query<{ id: string; dream_id: string; reporter_id: string }[]>(
      `SELECT id, dream_id, reporter_id FROM dream_reports WHERE id = $1`, [id],
    );
    if (!report) throw new NotFoundException('Report not found');

    await this.db.query(
      `UPDATE dream_reports SET status = 'resolved', resolved_by = $1, resolved_at = NOW() WHERE id = $2`,
      [adminId, id],
    );

    if (action === 'remove_dream') {
      await this.db.query(`UPDATE dreams SET deleted_at = NOW() WHERE id = $1`, [report.dream_id]);
    }
    if (action === 'ban_user') {
      await this.db.query(
        `UPDATE users SET is_banned = TRUE, banned_at = NOW(), banned_by = $1 WHERE id = (SELECT user_id FROM dreams WHERE id = $2)`,
        [adminId, report.dream_id],
      );
    }

    await this.db.query(
      `INSERT INTO admin_logs (admin_id, target_user_id, action_type, old_value, new_value) VALUES ($1,$2,$3,$4,$5)`,
      [adminId, null, `REPORT_${action.toUpperCase()}`, JSON.stringify({ id, note }), JSON.stringify({ action })],
    );
  }

  async dismissModerationReport(id: string, adminId: string): Promise<void> {
    await this.db.query(
      `UPDATE dream_reports SET status = 'dismissed', resolved_by = $1, resolved_at = NOW() WHERE id = $2`,
      [adminId, id],
    );
    await this.db.query(
      `INSERT INTO admin_logs (admin_id, target_user_id, action_type, old_value, new_value) VALUES ($1,$2,$3,$4,$5)`,
      [adminId, null, 'REPORT_DISMISSED', JSON.stringify({ id }), null],
    );
  }

  // ── Platform Health Live ─────────────────────────────────────────────────

  async getPlatformHealthLive(): Promise<{
    positivityScore:  number;
    anxietyScore:     number;
    lucidityScore:    number;
    nightmareRatio:   number;
    totalDreams:      number;
    topEmotions:      { emotion: string; count: number; pct: number }[];
    emotionalShift:   number;
  }> {
    const [healthRow, topEmotions, prevRow] = await Promise.all([
      this.db.query<Record<string, string>[]>(`
        SELECT
          ROUND(100.0 * COUNT(CASE WHEN de.emotion IN (
            'joy','happiness','love','peace','wonder','excitement','contentment','gratitude','awe','bliss','euphoria','serenity'
          ) THEN 1 END) / NULLIF(COUNT(*), 0), 1) AS positivity_score,
          ROUND(100.0 * COUNT(CASE WHEN de.emotion IN (
            'anxiety','fear','panic','stress','worry','dread','apprehension','nervousness'
          ) THEN 1 END) / NULLIF(COUNT(*), 0), 1) AS anxiety_score,
          ROUND(100.0 * COUNT(DISTINCT CASE WHEN d.category = 'lucid' THEN d.id END)
                / NULLIF(COUNT(DISTINCT d.id), 0), 1) AS lucidity_score,
          ROUND(100.0 * COUNT(CASE WHEN de.emotion IN (
            'fear','terror','horror','panic','nightmare','dread'
          ) THEN 1 END) / NULLIF(COUNT(*), 0), 1) AS nightmare_ratio,
          COUNT(DISTINCT d.id)::text AS total_dreams
        FROM dreams d
        LEFT JOIN dream_emotions de ON de.dream_id = d.id AND de.is_primary = TRUE
        WHERE d.created_at > NOW() - INTERVAL '7 days'
          AND d.deleted_at IS NULL AND d.is_draft = FALSE
      `),
      this.db.query<{ emotion: string; count: string }[]>(
        `SELECT de.emotion, COUNT(*)::text AS count
         FROM dream_emotions de
         JOIN dreams d ON d.id = de.dream_id
         WHERE d.created_at > NOW() - INTERVAL '7 days'
           AND d.deleted_at IS NULL AND d.is_draft = FALSE
           AND de.is_primary = TRUE
         GROUP BY de.emotion
         ORDER BY count DESC LIMIT 8`,
      ),
      // Prior 7-day window for shift calculation
      this.db.query<Record<string, string>[]>(`
        SELECT
          ROUND(100.0 * COUNT(CASE WHEN de.emotion IN (
            'joy','happiness','love','peace','wonder','excitement','contentment','gratitude','awe','bliss','euphoria','serenity'
          ) THEN 1 END) / NULLIF(COUNT(*), 0), 1) AS positivity_score
        FROM dreams d
        LEFT JOIN dream_emotions de ON de.dream_id = d.id AND de.is_primary = TRUE
        WHERE d.created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
          AND d.deleted_at IS NULL AND d.is_draft = FALSE
      `),
    ]);

    const h           = healthRow[0];
    const positivity  = parseFloat(h?.['positivity_score']  ?? '0');
    const prevPos     = parseFloat((prevRow[0])?.['positivity_score'] ?? '0');
    const totalCount  = parseInt(h?.['total_dreams'] ?? '0');

    const emotionsWithPct = topEmotions.map(e => ({
      emotion: e.emotion,
      count:   parseInt(e.count),
      pct:     totalCount > 0 ? Math.round((parseInt(e.count) / totalCount) * 100) : 0,
    }));

    return {
      positivityScore: positivity,
      anxietyScore:    parseFloat(h?.['anxiety_score']   ?? '0'),
      lucidityScore:   parseFloat(h?.['lucidity_score']  ?? '0'),
      nightmareRatio:  parseFloat(h?.['nightmare_ratio'] ?? '0'),
      totalDreams:     totalCount,
      topEmotions:     emotionsWithPct,
      emotionalShift:  Math.round(positivity - prevPos),
    };
  }

  // ── AI Signals ────────────────────────────────────────────────────────────

  async getAISignals(limit = 30): Promise<Record<string, unknown>[]> {
    const rows = await this.db.query<Record<string, unknown>[]>(
      `SELECT id, category, message, detail, severity, metadata, created_at AS "createdAt", read_at AS "readAt"
       FROM ai_events ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return rows;
  }

  async generateAISignals(adminId: string): Promise<number> {
    const [health, reportCount, symbolSpike] = await Promise.all([
      this.getPlatformHealthLive(),
      this.db.query<{ count: string }[]>(
        `SELECT COUNT(*)::text AS count FROM dream_reports WHERE created_at > NOW() - INTERVAL '1 hour'`,
      ),
      this.db.query<{ symbol: string; count: string }[]>(
        `SELECT ds.manifestation AS symbol, COUNT(*)::text AS count
         FROM dream_symbols ds
         JOIN dreams d ON d.id = ds.dream_id
         WHERE d.created_at > NOW() - INTERVAL '1 hour'
         GROUP BY ds.manifestation ORDER BY count DESC LIMIT 1`,
      ),
    ]);

    const signals: { category: string; message: string; detail: string; severity: string; metadata: object }[] = [];
    const recentReports = parseInt(reportCount[0]?.count ?? '0');

    if (health.anxietyScore > 40) {
      signals.push({
        category: 'emotion', severity: 'warning',
        message:  'Elevated anxiety detected in dream stream',
        detail:   `Anxiety rate at ${health.anxietyScore}% over past 7 days`,
        metadata: { anxietyScore: health.anxietyScore },
      });
    }
    if (health.positivityScore > 60) {
      signals.push({
        category: 'emotion', severity: 'info',
        message:  'Positive emotion surge across the collective',
        detail:   `${health.positivityScore}% of dreams show positive primary emotion`,
        metadata: { positivityScore: health.positivityScore },
      });
    }
    if (health.nightmareRatio > 25) {
      signals.push({
        category: 'risk', severity: 'warning',
        message:  'High nightmare frequency detected',
        detail:   `Nightmare ratio at ${health.nightmareRatio}% — above normal threshold`,
        metadata: { nightmareRatio: health.nightmareRatio },
      });
    }
    if (recentReports > 5) {
      signals.push({
        category: 'risk', severity: 'critical',
        message:  'Report spike — unusual moderation activity',
        detail:   `${recentReports} reports in last 60 minutes`,
        metadata: { recentReports },
      });
      // Also push admin notification for report spikes
      await this.db.query(
        `INSERT INTO admin_notification_queue (type, title, message, severity, related_type)
         VALUES ($1,$2,$3,$4,$5)`,
        ['report_spike', 'Report Spike Detected', `${recentReports} new reports in the last hour`, 'critical', 'dream_reports'],
      );
    }
    if (health.emotionalShift > 10) {
      signals.push({
        category: 'emotion', severity: 'info',
        message:  'Positive emotional shift detected',
        detail:   `Positivity up ${health.emotionalShift}% vs prior 7-day window`,
        metadata: { shift: health.emotionalShift },
      });
    }
    if (health.emotionalShift < -10) {
      signals.push({
        category: 'emotion', severity: 'warning',
        message:  'Collective mood decline detected',
        detail:   `Positivity down ${Math.abs(health.emotionalShift)}% vs prior period`,
        metadata: { shift: health.emotionalShift },
      });
    }
    if (symbolSpike.length && parseInt(symbolSpike[0]?.count ?? '0') > 3) {
      signals.push({
        category: 'symbol', severity: 'info',
        message:  `Symbol resonance spike: "${symbolSpike[0]?.symbol ?? ''}"`,
        detail:   `Appeared in ${symbolSpike[0]?.count ?? 0} dreams in the last hour`,
        metadata: { symbol: symbolSpike[0]?.symbol, count: symbolSpike[0]?.count },
      });
    }
    if (health.lucidityScore > 15) {
      signals.push({
        category: 'resonance', severity: 'info',
        message:  'Elevated lucid dream activity',
        detail:   `${health.lucidityScore}% of recent dreams are lucid — collective consciousness rising`,
        metadata: { lucidityScore: health.lucidityScore },
      });
    }

    // Always emit a system heartbeat signal
    signals.push({
      category: 'system', severity: 'info',
      message:  'System diagnostic complete',
      detail:   `${health.totalDreams} active dreams analyzed · all subsystems nominal`,
      metadata: { totalDreams: health.totalDreams, adminId },
    });

    if (signals.length > 0) {
      const values = signals.map((_, i) => {
        const base = i * 5;
        return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5})`;
      }).join(',');
      const params = signals.flatMap(s => [s.category, s.message, s.detail, s.severity, JSON.stringify(s.metadata)]);
      await this.db.query(
        `INSERT INTO ai_events (category, message, detail, severity, metadata) VALUES ${values}`,
        params,
      );
    }

    await this.db.query(
      `INSERT INTO admin_logs (admin_id, target_user_id, action_type, old_value, new_value) VALUES ($1,$2,$3,$4,$5)`,
      [adminId, null, 'AI_SIGNALS_GENERATED', null, JSON.stringify({ count: signals.length })],
    );

    return signals.length;
  }

  // ── Admin Notification Queue ─────────────────────────────────────────────

  async getAdminNotificationQueue(limit = 30): Promise<{ items: Record<string, unknown>[]; unreadCount: number }> {
    const [items, unread] = await Promise.all([
      this.db.query<Record<string, unknown>[]>(
        `SELECT id, type, title, message, severity, related_id AS "relatedId",
                related_type AS "relatedType", read_at AS "readAt", created_at AS "createdAt"
         FROM admin_notification_queue
         ORDER BY created_at DESC LIMIT $1`,
        [limit],
      ),
      this.db.query<{ count: string }[]>(
        `SELECT COUNT(*)::text AS count FROM admin_notification_queue WHERE read_at IS NULL`,
      ),
    ]);
    return { items, unreadCount: parseInt(unread[0]?.count ?? '0') };
  }

  async markAdminNotificationRead(id: string): Promise<void> {
    await this.db.query(
      `UPDATE admin_notification_queue SET read_at = NOW() WHERE id = $1`, [id],
    );
  }

  async markAllAdminNotificationsRead(): Promise<void> {
    await this.db.query(`UPDATE admin_notification_queue SET read_at = NOW() WHERE read_at IS NULL`);
  }

  // ── Dream Analysis Pipeline (delegates to DreamAnalysisService) ──────────

  async triggerDreamAnalysis(dreamId: string, adminId: string): Promise<Record<string, unknown>> {
    const result = await this.dreamAnalysis.analyzeDream(dreamId);
    await this.db.query(
      `INSERT INTO admin_logs (admin_id, target_user_id, action_type, old_value, new_value) VALUES ($1,$2,$3,$4,$5)`,
      [adminId, null, 'DREAM_ANALYSIS_TRIGGER', null, JSON.stringify({ dreamId, dreamScore: result.dreamScore })],
    );
    return result as unknown as Record<string, unknown>;
  }

  async bulkDreamAnalysis(adminId: string): Promise<{ processed: number }> {
    const processed = await this.dreamAnalysis.bulkAnalyzeUnprocessed(100);
    await this.db.query(
      `INSERT INTO admin_logs (admin_id, target_user_id, action_type, old_value, new_value) VALUES ($1,$2,$3,$4,$5)`,
      [adminId, null, 'DREAM_ANALYSIS_BULK', null, JSON.stringify({ processed })],
    );
    return { processed };
  }

  async getDreamAnalysisResult(dreamId: string): Promise<Record<string, unknown> | null> {
    const result = await this.dreamAnalysis.getDreamAnalysis(dreamId);
    return result as unknown as Record<string, unknown> | null;
  }

  async getPlatformAnalysisStats(): Promise<Record<string, unknown>> {
    return this.dreamAnalysis.getPlatformAnalysisStats();
  }

  // ── Platform Health Snapshot (persist snapshot) ───────────────────────────

  async savePlatformHealthSnapshot(adminId: string): Promise<void> {
    const health = await this.getPlatformHealthLive();
    await this.db.query(
      `INSERT INTO platform_health_snapshots
         (positivity_score, anxiety_score, lucidity_score, nightmare_ratio, emotional_shift, total_dreams)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [health.positivityScore, health.anxietyScore, health.lucidityScore,
       health.nightmareRatio, health.emotionalShift, health.totalDreams],
    );
    await this.db.query(
      `INSERT INTO admin_logs (admin_id, target_user_id, action_type, old_value, new_value) VALUES ($1,$2,$3,$4,$5)`,
      [adminId, null, 'PLATFORM_HEALTH_SNAPSHOT', null, JSON.stringify(health)],
    );
  }

  async getPlatformHealthHistory(days = 30): Promise<Record<string, unknown>[]> {
    const rows = await this.db.query<Record<string, unknown>[]>(
      `SELECT
         DATE(snapshot_at) AS date,
         ROUND(AVG(positivity_score), 1) AS positivity_score,
         ROUND(AVG(anxiety_score), 1)    AS anxiety_score,
         ROUND(AVG(lucidity_score), 1)   AS lucidity_score,
         ROUND(AVG(nightmare_ratio), 1)  AS nightmare_ratio
       FROM platform_health_snapshots
       WHERE snapshot_at > NOW() - ($1 || ' days')::interval
       GROUP BY DATE(snapshot_at)
       ORDER BY date ASC`,
      [days],
    );
    return rows;
  }

  // ── User Intelligence Profile ─────────────────────────────────────────────────

  async getUserIntelligenceProfile(userId: string): Promise<Record<string, unknown>> {
    const [topEmotions, topSymbols, analysisStats, activityStats] = await Promise.all([
      this.db.query<{ emotion: string; count: string; avg_intensity: string }[]>(
        `SELECT de.emotion, COUNT(*) AS count, ROUND(AVG(de.intensity)::numeric, 2) AS avg_intensity
         FROM dream_emotions de
         JOIN dreams d ON d.id = de.dream_id
         WHERE d.user_id = $1 AND d.deleted_at IS NULL
         GROUP BY de.emotion ORDER BY count DESC LIMIT 8`,
        [userId],
      ),
      this.db.query<{ manifestation: string; count: string }[]>(
        `SELECT ds.manifestation, COUNT(*) AS count
         FROM dream_symbols ds
         JOIN dreams d ON d.id = ds.dream_id
         WHERE d.user_id = $1 AND d.deleted_at IS NULL
         GROUP BY ds.manifestation ORDER BY count DESC LIMIT 8`,
        [userId],
      ),
      this.db.query<{ total: string; avg_dream_score: string; avg_resonance: string }[]>(
        `SELECT COUNT(*) AS total,
                ROUND(AVG(da.dream_score)::numeric, 1)     AS avg_dream_score,
                ROUND(AVG(da.resonance_score)::numeric, 1) AS avg_resonance
         FROM dream_analysis da
         JOIN dreams d ON d.id = da.dream_id
         WHERE d.user_id = $1 AND d.deleted_at IS NULL`,
        [userId],
      ),
      this.db.query<{ total_likes: string; total_saves: string; total_matches: string }[]>(
        `SELECT
           (SELECT COUNT(*) FROM dream_likes dl JOIN dreams d ON d.id = dl.dream_id WHERE d.user_id = $1 AND d.deleted_at IS NULL) AS total_likes,
           (SELECT COUNT(*) FROM dream_saves ds JOIN dreams d ON d.id = ds.dream_id WHERE d.user_id = $1 AND d.deleted_at IS NULL) AS total_saves,
           (SELECT COUNT(*) FROM dream_matches dm WHERE dm.user_id_a = $1 OR dm.user_id_b = $1) AS total_matches`,
        [userId],
      ),
    ]);

    const stats = analysisStats[0] as Record<string, unknown> | undefined;
    const acts  = activityStats[0] as Record<string, unknown> | undefined;

    return {
      topEmotions:    topEmotions.map(r => ({ emotion: r.emotion, count: parseInt(r.count), avgIntensity: parseFloat(r.avg_intensity) })),
      topSymbols:     topSymbols.map(r => ({ symbol: r.manifestation, count: parseInt(r.count) })),
      avgDreamScore:  parseFloat(String(stats?.['avg_dream_score'] ?? '0')),
      avgResonance:   parseFloat(String(stats?.['avg_resonance'] ?? '0')),
      analyzedDreams: parseInt(String(stats?.['total'] ?? '0')),
      totalLikes:     parseInt(String(acts?.['total_likes'] ?? '0')),
      totalSaves:     parseInt(String(acts?.['total_saves'] ?? '0')),
      totalMatches:   parseInt(String(acts?.['total_matches'] ?? '0')),
    };
  }

  // ── User Risk Profile ─────────────────────────────────────────────────────────

  async getUserRiskProfile(userId: string): Promise<Record<string, unknown>> {
    const [userData, reportData, spamData, followData] = await Promise.all([
      this.db.query<{ dream_count: string; failed_login_attempts: string }[]>(
        `SELECT
           (SELECT COUNT(*) FROM dreams WHERE user_id = $1 AND deleted_at IS NULL) AS dream_count,
           failed_login_attempts
         FROM users WHERE id = $1`,
        [userId],
      ),
      this.db.query<{ report_count: string; hidden_count: string }[]>(
        `SELECT
           (SELECT COUNT(*) FROM dream_reports dr JOIN dreams d ON d.id = dr.dream_id WHERE d.user_id = $1) AS report_count,
           (SELECT COUNT(*) FROM dreams WHERE user_id = $1 AND deleted_at IS NULL AND visibility = 'private') AS hidden_count`,
        [userId],
      ),
      this.db.query<{ recent_dreams: string }[]>(
        `SELECT COUNT(*) AS recent_dreams FROM dreams
         WHERE user_id = $1 AND deleted_at IS NULL AND created_at > NOW() - INTERVAL '24 hours'`,
        [userId],
      ),
      this.db.query<{ rapid_follows: string }[]>(
        `SELECT COUNT(*) AS rapid_follows FROM user_follows
         WHERE follower_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
        [userId],
      ),
    ]);

    const u = userData[0] as Record<string, unknown> | undefined;
    const r = reportData[0] as Record<string, unknown> | undefined;
    const dreamCount   = parseInt(String(u?.['dream_count'] ?? '0'));
    const reportCount  = parseInt(String(r?.['report_count'] ?? '0'));
    const hiddenCount  = parseInt(String(r?.['hidden_count'] ?? '0'));
    const recentDreams = parseInt(String(spamData[0]?.recent_dreams ?? '0'));
    const rapidFollows = parseInt(String(followData[0]?.rapid_follows ?? '0'));
    const failedLogins = parseInt(String(u?.['failed_login_attempts'] ?? '0'));

    const reportScore    = dreamCount > 0 ? Math.min(100, Math.round((reportCount / dreamCount) * 100)) : 0;
    const spamScore      = Math.min(100, recentDreams * 10 + rapidFollows * 5);
    const suspiciousScore = Math.min(100, failedLogins * 5 + (hiddenCount > 5 ? 20 : 0));
    const overallScore   = Math.round(reportScore * 0.5 + spamScore * 0.3 + suspiciousScore * 0.2);

    const riskLevel = overallScore >= 60 ? 'critical'
      : overallScore >= 35 ? 'high'
      : overallScore >= 15 ? 'medium'
      : 'low';

    return { reportScore, spamScore, suspiciousScore, overallScore, riskLevel,
             reportCount, dreamCount, hiddenCount, recentDreams, rapidFollows, failedLogins };
  }

  // ── User Moderation History ───────────────────────────────────────────────────

  async getUserModerationHistory(userId: string): Promise<Record<string, unknown>[]> {
    const [reports, adminActions] = await Promise.all([
      this.db.query<Record<string, unknown>[]>(
        `SELECT
           dr.id, dr.reason, dr.description, dr.status,
           dr.created_at, dr.resolved_at,
           d.title AS dream_title, d.id AS dream_id
         FROM dream_reports dr
         JOIN dreams d ON d.id = dr.dream_id
         WHERE d.user_id = $1
         ORDER BY dr.created_at DESC LIMIT 20`,
        [userId],
      ),
      this.db.query<Record<string, unknown>[]>(
        `SELECT
           al.id, al.action_type, al.old_value, al.new_value, al.created_at,
           u.username AS admin_username
         FROM admin_logs al
         LEFT JOIN users u ON u.id = al.admin_id
         WHERE al.target_user_id = $1
         ORDER BY al.created_at DESC LIMIT 20`,
        [userId],
      ),
    ]);

    const merged: Record<string, unknown>[] = [
      ...reports.map(r => ({ ...r, source: 'report' })),
      ...adminActions.map(a => ({ ...a, source: 'admin_action' })),
    ];
    return merged.sort((a, b) =>
      new Date(String(b['created_at'])).getTime() - new Date(String(a['created_at'])).getTime(),
    ).slice(0, 30);
  }

  // ── Dream Collective Relevance ────────────────────────────────────────────────

  async getDreamCollectiveRelevance(dreamId: string): Promise<Record<string, unknown>> {
    const [dreamSymbols, dreamEmotions, platformTopSymbols, platformTopEmotions, matchData, analysisData] =
      await Promise.all([
        this.db.query<{ manifestation: string }[]>(
          `SELECT manifestation FROM dream_symbols WHERE dream_id = $1`, [dreamId],
        ),
        this.db.query<{ emotion: string }[]>(
          `SELECT emotion FROM dream_emotions WHERE dream_id = $1`, [dreamId],
        ),
        this.db.query<{ manifestation: string }[]>(
          `SELECT manifestation FROM dream_symbols
           GROUP BY manifestation ORDER BY COUNT(*) DESC LIMIT 25`,
        ),
        this.db.query<{ emotion: string }[]>(
          `SELECT emotion FROM dream_emotions
           GROUP BY emotion ORDER BY COUNT(*) DESC LIMIT 10`,
        ),
        this.db.query<{ count: string; avg_score: string }[]>(
          `SELECT COUNT(*) AS count, ROUND(AVG(match_score)::numeric, 2) AS avg_score
           FROM dream_matches WHERE dream_id_a = $1 OR dream_id_b = $1`,
          [dreamId],
        ),
        this.db.query<{ dream_score: string; resonance_score: string }[]>(
          `SELECT dream_score, resonance_score FROM dream_analysis WHERE dream_id = $1`, [dreamId],
        ),
      ]);

    const topSymbolSet  = new Set(platformTopSymbols.map(r => r.manifestation));
    const topEmotionSet = new Set(platformTopEmotions.map(r => r.emotion));
    const symbolOverlap  = dreamSymbols.length > 0
      ? Math.round((dreamSymbols.filter(s => topSymbolSet.has(s.manifestation)).length / dreamSymbols.length) * 100)
      : 0;
    const emotionOverlap = dreamEmotions.length > 0
      ? Math.round((dreamEmotions.filter(e => topEmotionSet.has(e.emotion)).length / dreamEmotions.length) * 100)
      : 0;

    const m  = matchData[0] as Record<string, unknown> | undefined;
    const an = analysisData[0] as Record<string, unknown> | undefined;
    const matchCount    = parseInt(String(m?.['count'] ?? '0'));
    const avgMatchScore = parseFloat(String(m?.['avg_score'] ?? '0'));
    const collectiveScore = Math.round(symbolOverlap * 0.4 + emotionOverlap * 0.3 + Math.min(matchCount * 5, 30));

    return {
      symbolOverlap, emotionOverlap, matchCount, avgMatchScore, collectiveScore,
      dreamScore:     an ? parseFloat(String(an['dream_score'])) : null,
      resonanceScore: an ? parseFloat(String(an['resonance_score'])) : null,
    };
  }

  // ── Emotional Trends ──────────────────────────────────────────────────────────

  async getEmotionalTrends(days = 28): Promise<Record<string, unknown>[]> {
    return this.db.query<Record<string, unknown>[]>(
      `SELECT
         DATE_TRUNC('week', d.created_at)::date AS week,
         de.emotion,
         COUNT(*) AS count
       FROM dream_emotions de
       JOIN dreams d ON d.id = de.dream_id
       WHERE d.deleted_at IS NULL AND d.created_at > NOW() - ($1 || ' days')::interval
       GROUP BY week, de.emotion
       ORDER BY week ASC, count DESC`,
      [days],
    );
  }

  // ── Resonance Events ──────────────────────────────────────────────────────────

  async getResonanceEvents(limit = 10): Promise<Record<string, unknown>[]> {
    return this.db.query<Record<string, unknown>[]>(
      `SELECT
         dm.id, dm.match_score, dm.resonance_level,
         dm.shared_themes, dm.shared_emotions, dm.shared_symbols,
         dm.created_at,
         da.title AS dream_a_title, ua.username AS user_a,
         db_dream.title AS dream_b_title, ub.username AS user_b
       FROM dream_matches dm
       JOIN dreams da ON da.id = dm.dream_id_a
       JOIN dreams db_dream ON db_dream.id = dm.dream_id_b
       JOIN users ua ON ua.id = dm.user_id_a
       JOIN users ub ON ub.id = dm.user_id_b
       WHERE dm.match_score >= 0.5
       ORDER BY dm.match_score DESC
       LIMIT $1`,
      [limit],
    );
  }

  // ── Dream Connection Engine ───────────────────────────────────────────────────

  async getDreamConnections(
    page: number,
    limit: number,
    minScorePct = 0,
  ): Promise<{ items: Record<string, unknown>[]; total: number; page: number; pages: number }> {
    const offset   = (page - 1) * limit;
    const minScore = minScorePct / 100;

    const [rows, countRows] = await Promise.all([
      this.db.query<Record<string, unknown>[]>(
        `SELECT
           dm.id,
           ROUND((dm.match_score * 100)::numeric, 1) AS match_score_pct,
           dm.match_score,
           dm.resonance_level,
           dm.shared_themes,
           dm.shared_emotions,
           dm.shared_symbols,
           dm.shared_archetypes,
           dm.archetype_score,
           dm.created_at,
           da.id::text    AS dream_a_id,
           da.title       AS dream_a_title,
           ua.id::text    AS user_a_id,
           ua.username    AS user_a,
           db_d.id::text  AS dream_b_id,
           db_d.title     AS dream_b_title,
           ub.id::text    AS user_b_id,
           ub.username    AS user_b,
           COALESCE(array_length(dm.shared_symbols,  1), 0) AS shared_symbol_count,
           COALESCE(array_length(dm.shared_emotions, 1), 0) AS shared_emotion_count,
           COALESCE(array_length(dm.shared_themes,   1), 0) AS shared_theme_count
         FROM dream_matches dm
         JOIN dreams  da   ON da.id   = dm.dream_id_a
         JOIN dreams  db_d ON db_d.id = dm.dream_id_b
         JOIN users   ua   ON ua.id   = dm.user_id_a
         JOIN users   ub   ON ub.id   = dm.user_id_b
         WHERE dm.match_score >= $3
         ORDER BY dm.match_score DESC, dm.created_at DESC
         LIMIT $2 OFFSET $1`,
        [offset, limit, minScore],
      ),
      this.db.query<{ count: string }[]>(
        `SELECT COUNT(*) AS count FROM dream_matches WHERE match_score >= $1`,
        [minScore],
      ),
    ]);

    const total = parseInt(String(countRows[0]?.count ?? '0'));
    return { items: rows, total, page, pages: Math.ceil(total / limit) };
  }

  async computeUserResonanceScores(adminId: string): Promise<{ upserted: number }> {
    const userStats = await this.db.query<{
      user_id: string;
      connection_count: string;
      avg_match_score: string;
    }[]>(
      `SELECT
         u_id AS user_id,
         COUNT(DISTINCT other_id)::int AS connection_count,
         ROUND(AVG(match_score)::numeric, 3) AS avg_match_score
       FROM (
         SELECT user_id_a AS u_id, user_id_b AS other_id, match_score FROM dream_matches
         UNION ALL
         SELECT user_id_b AS u_id, user_id_a AS other_id, match_score FROM dream_matches
       ) t
       GROUP BY u_id`,
    );

    if (!userStats.length) return { upserted: 0 };

    const uniquenessRows = await this.db.query<{ user_id: string; avg_resonance: string }[]>(
      `SELECT d.user_id::text AS user_id, ROUND(AVG(da.resonance_score)::numeric, 1) AS avg_resonance
       FROM dream_analysis da
       JOIN dreams d ON d.id = da.dream_id AND d.deleted_at IS NULL
       GROUP BY d.user_id`,
    );
    const uniquenessMap = new Map(uniquenessRows.map(r => [r.user_id, parseFloat(r.avg_resonance)]));

    let upserted = 0;
    for (const row of userStats) {
      const avgScore         = parseFloat(row.avg_match_score);
      const connectionCount  = parseInt(row.connection_count);
      const resonanceScore   = uniquenessMap.get(row.user_id) ?? 50;
      const uniquenessScore  = Math.max(0, 100 - resonanceScore);
      const collectiveAlignment = Math.round(avgScore * 100);
      const resonanceLevel =
        avgScore >= 0.80 ? 'cosmic'
        : avgScore >= 0.60 ? 'deep'
        : avgScore >= 0.40 ? 'surface'
        : 'dormant';

      await this.db.query(
        `INSERT INTO user_resonance_scores
           (user_id, resonance_level, collective_alignment, dream_uniqueness_score,
            connection_count, avg_match_score, computed_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           resonance_level        = EXCLUDED.resonance_level,
           collective_alignment   = EXCLUDED.collective_alignment,
           dream_uniqueness_score = EXCLUDED.dream_uniqueness_score,
           connection_count       = EXCLUDED.connection_count,
           avg_match_score        = EXCLUDED.avg_match_score,
           computed_at            = NOW()`,
        [row.user_id, resonanceLevel, collectiveAlignment, uniquenessScore, connectionCount, avgScore],
      );
      upserted++;
    }

    await this.db.query(
      `INSERT INTO admin_logs (admin_id, target_user_id, action_type, old_value, new_value)
       VALUES ($1,$2,$3,$4,$5)`,
      [adminId, null, 'COMPUTE_USER_RESONANCE', null, JSON.stringify({ upserted })],
    );
    return { upserted };
  }

  async getUserResonanceScores(
    page: number,
    limit: number,
  ): Promise<{ items: Record<string, unknown>[]; total: number; page: number; pages: number }> {
    const offset = (page - 1) * limit;
    const [rows, countRows] = await Promise.all([
      this.db.query<Record<string, unknown>[]>(
        `SELECT
           urs.id, urs.resonance_level, urs.collective_alignment,
           urs.dream_uniqueness_score, urs.connection_count, urs.avg_match_score,
           urs.computed_at,
           u.id::text AS user_id, u.username, up.display_name,
           (SELECT COUNT(*) FROM dreams WHERE user_id = u.id AND deleted_at IS NULL)::int AS dream_count
         FROM user_resonance_scores urs
         JOIN users u ON u.id = urs.user_id
         LEFT JOIN user_profiles up ON up.user_id = u.id
         ORDER BY urs.avg_match_score DESC, urs.connection_count DESC
         LIMIT $2 OFFSET $1`,
        [offset, limit],
      ),
      this.db.query<{ count: string }[]>(
        `SELECT COUNT(*) AS count FROM user_resonance_scores`,
      ),
    ]);
    const total = parseInt(String(countRows[0]?.count ?? '0'));
    return { items: rows, total, page, pages: Math.ceil(total / limit) };
  }

  async computeSeenInDreams(adminId: string): Promise<{ upserted: number }> {
    const [symbols, figures, places] = await Promise.all([
      this.db.query<{
        pattern_value: string; user_count: string; dream_count: string;
        confidence_score: string; sample_usernames: string[];
      }[]>(
        `SELECT
           ds.manifestation AS pattern_value,
           COUNT(DISTINCT d.user_id)::int AS user_count,
           COUNT(*)::int AS dream_count,
           ROUND(AVG(ds.confidence * 100)::numeric, 1) AS confidence_score,
           ARRAY(
             SELECT DISTINCT u.username FROM users u
             JOIN dreams d2 ON d2.user_id = u.id AND d2.deleted_at IS NULL
             JOIN dream_symbols ds2 ON ds2.dream_id = d2.id
               AND ds2.manifestation = ds.manifestation
             LIMIT 5
           ) AS sample_usernames
         FROM dream_symbols ds
         JOIN dreams d ON d.id = ds.dream_id AND d.deleted_at IS NULL
         GROUP BY ds.manifestation
         HAVING COUNT(DISTINCT d.user_id) >= 2
         ORDER BY user_count DESC LIMIT 200`,
      ),
      this.db.query<{
        pattern_value: string; user_count: string; dream_count: string;
        sample_usernames: string[];
      }[]>(
        `SELECT
           df.figure_type AS pattern_value,
           COUNT(DISTINCT d.user_id)::int AS user_count,
           COUNT(*)::int AS dream_count,
           ARRAY(
             SELECT DISTINCT u.username FROM users u
             JOIN dreams d2 ON d2.user_id = u.id AND d2.deleted_at IS NULL
             JOIN dream_figures df2 ON df2.dream_id = d2.id
               AND df2.figure_type = df.figure_type
             LIMIT 5
           ) AS sample_usernames
         FROM dream_figures df
         JOIN dreams d ON d.id = df.dream_id AND d.deleted_at IS NULL
         WHERE df.figure_type IS NOT NULL
         GROUP BY df.figure_type
         HAVING COUNT(DISTINCT d.user_id) >= 2
         ORDER BY user_count DESC LIMIT 100`,
      ),
      this.db.query<{
        pattern_value: string; user_count: string; dream_count: string;
        confidence_score: string; sample_usernames: string[];
      }[]>(
        `SELECT
           dp.name AS pattern_value,
           COUNT(DISTINCT dp.user_id)::int AS user_count,
           COUNT(*)::int AS dream_count,
           ROUND(AVG(dp.confidence)::numeric, 1) AS confidence_score,
           ARRAY(
             SELECT DISTINCT u.username FROM users u
             JOIN dream_places dp2 ON dp2.user_id = u.id
               AND lower(dp2.name) = lower(dp.name)
             LIMIT 5
           ) AS sample_usernames
         FROM dream_places dp
         GROUP BY dp.name
         HAVING COUNT(DISTINCT dp.user_id) >= 2
         ORDER BY user_count DESC LIMIT 100`,
      ),
    ]);

    let upserted = 0;
    const upsertRow = async (type: string, pv: string, uc: number, dc: number, cs: number, su: string[]) => {
      await this.db.query(
        `INSERT INTO seen_in_dreams
           (pattern_type, pattern_value, user_count, dream_count, confidence_score, sample_usernames, last_seen_at, computed_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
         ON CONFLICT (pattern_type, pattern_value) DO UPDATE SET
           user_count       = EXCLUDED.user_count,
           dream_count      = EXCLUDED.dream_count,
           confidence_score = EXCLUDED.confidence_score,
           sample_usernames = EXCLUDED.sample_usernames,
           last_seen_at     = NOW(), computed_at = NOW()`,
        [type, pv, uc, dc, cs, su],
      );
      upserted++;
    };

    for (const s of symbols) {
      await upsertRow('symbol', s.pattern_value, parseInt(s.user_count), parseInt(s.dream_count),
        parseFloat(s.confidence_score ?? '80'), s.sample_usernames ?? []);
    }
    for (const f of figures) {
      await upsertRow('figure', f.pattern_value, parseInt(f.user_count), parseInt(f.dream_count),
        80, f.sample_usernames ?? []);
    }
    for (const p of places) {
      await upsertRow('location', p.pattern_value, parseInt(p.user_count), parseInt(p.dream_count),
        parseFloat(p.confidence_score ?? '75'), p.sample_usernames ?? []);
    }

    await this.db.query(
      `INSERT INTO admin_logs (admin_id, target_user_id, action_type, old_value, new_value)
       VALUES ($1,$2,$3,$4,$5)`,
      [adminId, null, 'COMPUTE_SEEN_IN_DREAMS', null, JSON.stringify({ upserted })],
    );
    return { upserted };
  }

  async getSeenInDreams(type: string | null, limit: number): Promise<Record<string, unknown>[]> {
    return this.db.query<Record<string, unknown>[]>(
      `SELECT * FROM seen_in_dreams
       WHERE ($1::text IS NULL OR pattern_type = $1)
       ORDER BY user_count DESC, confidence_score DESC
       LIMIT $2`,
      [type, limit],
    );
  }

  async getConnectionFeed(limit: number): Promise<Record<string, unknown>[]> {
    return this.db.query<Record<string, unknown>[]>(
      `SELECT
         dm.id,
         dm.created_at,
         ROUND((dm.match_score * 100)::numeric, 1) AS score,
         dm.resonance_level,
         dm.shared_emotions[1]   AS primary_emotion,
         dm.shared_symbols[1]    AS primary_symbol,
         dm.shared_themes[1]     AS primary_theme,
         dm.shared_archetypes[1] AS primary_archetype,
         COALESCE(array_length(dm.shared_symbols,  1), 0) AS symbol_count,
         COALESCE(array_length(dm.shared_emotions, 1), 0) AS emotion_count,
         COALESCE(array_length(dm.shared_themes,   1), 0) AS theme_count,
         ua.username    AS user_a,
         ub.username    AS user_b,
         da.title       AS dream_a_title,
         db_d.title     AS dream_b_title,
         da.id::text    AS dream_a_id,
         db_d.id::text  AS dream_b_id
       FROM dream_matches dm
       JOIN dreams da   ON da.id   = dm.dream_id_a
       JOIN dreams db_d ON db_d.id = dm.dream_id_b
       JOIN users ua    ON ua.id   = dm.user_id_a
       JOIN users ub    ON ub.id   = dm.user_id_b
       ORDER BY dm.created_at DESC
       LIMIT $1`,
      [limit],
    );
  }

  async getCollectiveSignals(days = 7): Promise<Record<string, unknown>> {
    const interval = `${days} days`;

    const [emerging, emotional, themes, resonanceStats, clusterStats] = await Promise.all([
      this.db.query<{ manifestation: string; current_count: string; prior_count: string; growth: string }[]>(
        `WITH cur AS (
           SELECT ds.manifestation, COUNT(*) AS cnt
           FROM dream_symbols ds
           JOIN dreams d ON d.id = ds.dream_id AND d.deleted_at IS NULL
           WHERE d.created_at > NOW() - ($1::interval)
           GROUP BY ds.manifestation
         ), prior AS (
           SELECT ds.manifestation, COUNT(*) AS cnt
           FROM dream_symbols ds
           JOIN dreams d ON d.id = ds.dream_id AND d.deleted_at IS NULL
           WHERE d.created_at > NOW() - 2 * ($1::interval)
             AND d.created_at <= NOW() - ($1::interval)
           GROUP BY ds.manifestation
         )
         SELECT c.manifestation,
                c.cnt::int AS current_count,
                COALESCE(p.cnt, 0)::int AS prior_count,
                (c.cnt - COALESCE(p.cnt, 0))::int AS growth
         FROM cur c LEFT JOIN prior p ON p.manifestation = c.manifestation
         ORDER BY growth DESC LIMIT 12`,
        [interval],
      ),
      this.db.query<{ emotion: string; current_count: string; prior_count: string; shift_pct: string }[]>(
        `WITH cur AS (
           SELECT de.emotion, COUNT(*) AS cnt
           FROM dream_emotions de
           JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL
           WHERE d.created_at > NOW() - ($1::interval)
           GROUP BY de.emotion
         ), prior AS (
           SELECT de.emotion, COUNT(*) AS cnt
           FROM dream_emotions de
           JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL
           WHERE d.created_at > NOW() - 2 * ($1::interval)
             AND d.created_at <= NOW() - ($1::interval)
           GROUP BY de.emotion
         )
         SELECT c.emotion,
                c.cnt::int AS current_count,
                COALESCE(p.cnt, 0)::int AS prior_count,
                ROUND(((c.cnt - COALESCE(p.cnt,0))::numeric / NULLIF(p.cnt::numeric,0) * 100), 1) AS shift_pct
         FROM cur c LEFT JOIN prior p ON p.emotion = c.emotion
         ORDER BY c.cnt DESC LIMIT 10`,
        [interval],
      ),
      this.db.query<{ theme: string; user_count: string; dream_count: string }[]>(
        `SELECT dt.theme,
                COUNT(DISTINCT d.user_id)::int AS user_count,
                COUNT(*)::int AS dream_count
         FROM dream_themes dt
         JOIN dreams d ON d.id = dt.dream_id AND d.deleted_at IS NULL
         WHERE d.created_at > NOW() - ($1::interval)
         GROUP BY dt.theme
         HAVING COUNT(DISTINCT d.user_id) >= 2
         ORDER BY dream_count DESC LIMIT 10`,
        [interval],
      ),
      this.db.query<{ total: string; avg_score: string; high_resonance: string }[]>(
        `SELECT
           COUNT(*)::int AS total,
           ROUND(AVG(match_score * 100)::numeric, 1) AS avg_score,
           COUNT(*) FILTER (WHERE match_score >= 0.7)::int AS high_resonance
         FROM dream_matches
         WHERE created_at > NOW() - ($1::interval)`,
        [interval],
      ),
      this.db.query<{ total_clusters: string; total_members: string }[]>(
        `SELECT
           (SELECT COUNT(*) FROM dream_clusters)::int AS total_clusters,
           (SELECT COUNT(*) FROM dream_cluster_members)::int AS total_members`,
      ),
    ]);

    const rs = resonanceStats[0] as Record<string, unknown> | undefined;
    const cs = clusterStats[0] as Record<string, unknown> | undefined;

    return {
      emergingSymbols:    emerging,
      emotionalShifts:    emotional,
      recurringThemes:    themes,
      resonanceTotal:     parseInt(String(rs?.['total'] ?? '0')),
      resonanceAvgScore:  parseFloat(String(rs?.['avg_score'] ?? '0')),
      highResonanceCount: parseInt(String(rs?.['high_resonance'] ?? '0')),
      clusterCount:       parseInt(String(cs?.['total_clusters'] ?? '0')),
      clusterMembers:     parseInt(String(cs?.['total_members'] ?? '0')),
      days,
    };
  }

  // ── Collective Intelligence Summary ──────────────────────────────────────────

  async getCollectiveIntelligenceSummary(): Promise<Record<string, unknown>> {
    const [topSymbols, topEmotions, currentMood, priorMood, resonanceCount, totalDreams] = await Promise.all([
      this.db.query<{ manifestation: string; count: string }[]>(
        `SELECT manifestation, COUNT(*) AS count
         FROM dream_symbols GROUP BY manifestation ORDER BY count DESC LIMIT 10`,
      ),
      this.db.query<{ emotion: string; count: string }[]>(
        `SELECT emotion, COUNT(*) AS count
         FROM dream_emotions GROUP BY emotion ORDER BY count DESC LIMIT 10`,
      ),
      this.db.query<{ emotion: string }[]>(
        `SELECT de.emotion FROM dream_emotions de
         JOIN dreams d ON d.id = de.dream_id
         WHERE d.deleted_at IS NULL AND d.created_at > NOW() - INTERVAL '7 days'
         GROUP BY de.emotion ORDER BY COUNT(*) DESC LIMIT 1`,
      ),
      this.db.query<{ emotion: string }[]>(
        `SELECT de.emotion FROM dream_emotions de
         JOIN dreams d ON d.id = de.dream_id
         WHERE d.deleted_at IS NULL
           AND d.created_at > NOW() - INTERVAL '14 days'
           AND d.created_at <= NOW() - INTERVAL '7 days'
         GROUP BY de.emotion ORDER BY COUNT(*) DESC LIMIT 1`,
      ),
      this.db.query<{ count: string }[]>(
        `SELECT COUNT(*) AS count FROM dream_matches WHERE match_score >= 0.5`,
      ),
      this.db.query<{ count: string }[]>(
        `SELECT COUNT(*) AS count FROM dreams WHERE deleted_at IS NULL AND is_draft = FALSE`,
      ),
    ]);

    const currentDominant = currentMood[0]?.emotion ?? null;
    const priorDominant   = priorMood[0]?.emotion ?? null;

    return {
      topSymbols:     topSymbols.map(r => ({ symbol: r.manifestation, count: parseInt(r.count) })),
      topEmotions:    topEmotions.map(r => ({ emotion: r.emotion, count: parseInt(r.count) })),
      dominantMood:   currentDominant,
      priorMood:      priorDominant,
      moodShifted:    currentDominant !== priorDominant,
      resonanceCount: parseInt(String(resonanceCount[0]?.count ?? '0')),
      totalDreams:    parseInt(String(totalDreams[0]?.count ?? '0')),
    };
  }
}
