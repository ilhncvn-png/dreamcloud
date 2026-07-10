// ── Users ─────────────────────────────────────────────────────────────────────

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
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminUserDetail extends AdminUser {
  bio: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  isPublic: boolean;
  preferences: Record<string, unknown>;
  lockedUntil: string | null;
  failedLoginAttempts: number;
}

// ── Dreams ────────────────────────────────────────────────────────────────────

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
  isHidden: boolean;
  isFeatured: boolean;
  viewCount: number;
  reportCount?: number;
  createdAt: string;
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
  featuredAt: string | null;
  moderationNote: string | null;
  dreamedAt: string;
  createdAt: string;
  updatedAt: string;
  // Analysis
  primaryTheme: string | null;
  primaryEmotion: string | null;
  emotionalIntensity: string | null;
  emotionalArc: string | null;
  residualEmotion: string | null;
  symbols: Array<{ category: string; manifestation: string; confidence: number }>;
  emotions: Array<{ emotion: string; intensity: string; isPrimary: boolean }>;
  themes: Array<{ theme: string; themeFamily: string; isPrimary: boolean }>;
  figures: Array<{
    figureType: string;
    isKnown: boolean;
    relationshipType: string | null;
    archetypeCandidate: string | null;
    qualityDescriptors: string[];
    narrativeRole: string | null;
  }>;
  similarDreams: Array<{
    id: string;
    title: string | null;
    authorUsername: string;
    category: string;
    matchScore: number;
    resonanceLevel: string;
    sharedThemes: string[];
    sharedEmotions: string[];
  }>;
  authorArchetype: string | null;
  // Comments
  comments: Array<{
    id: string;
    content: string;
    authorUsername: string;
    authorDisplayName: string | null;
    createdAt: string;
  }>;
  // Reports
  reportCount: number;
  reports: AdminDreamReport[];
}

export interface AdminDreamReport {
  id: string;
  dreamId: string;
  reporterUsername: string;
  reporterEmail: string;
  reason: string;
  description: string | null;
  status: string;
  resolvedAt: string | null;
  createdAt: string;
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
  resolvedAt: string | null;
  createdAt: string;
}

export interface DashboardMetrics {
  topCategories: Array<{ category: string; count: number }>;
  topUsers: Array<{ id: string; username: string; avatarUrl: string | null; dreamCount: number }>;
  recentAdminLogs: Array<{ actionType: string; adminUsername: string; targetUsername: string | null; createdAt: string }>;
  pendingReports: number;
  hiddenDreams: number;
  featuredDreams: number;
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

export interface DreamIntelligenceData {
  trendingSymbols: Array<{ symbol: string; category: string; count: number }>;
  trendingThemes: Array<{ theme: string; family: string; count: number }>;
  trendingEmotions: Array<{ emotion: string; count: number }>;
  categoryDistribution: Array<{ category: string; count: number; pct: number }>;
  visibilityDistribution: Array<{ visibility: string; count: number; pct: number }>;
  lucidRatio: number;
  nightmareRatio: number;
  publicRatio: number;
  mostResonantDreams: Array<{ id: string; title: string | null; authorUsername: string; matchCount: number; likeCount: number }>;
  mostRepeatedPlaces: Array<{ name: string; type: string; count: number }>;
  totalDreamsAnalyzed: number;
}

export interface GrowthAnalytics {
  dailyNewUsers: Array<{ date: string; count: number }>;
  dailyActiveUsers: Array<{ date: string; count: number }>;
  totalUsers: number;
  weeklyNewUsers: number;
  monthlyNewUsers: number;
  growthRateVsLastWeek: number;
}

export interface EngagementAnalytics {
  dailyDreams: Array<{ date: string; count: number }>;
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
  repeatOffenders: Array<{ userId: string; username: string; email: string; reportCount: number }>;
}

export interface CommunityHealthData {
  moodScore: number;
  positivityIndex: number;
  anxietyIndex: number;
  nightmareRatio: number;
  lucidRatio: number;
  communityHealthScore: number;
  totalDreamsAnalyzed: number;
  emotionDistribution: Array<{ emotion: string; count: number; type: 'positive' | 'negative' | 'neutral' }>;
  moodTrend: Array<{ date: string; positive: number; negative: number; neutral: number }>;
  topPositiveEmotions: string[];
  topNegativeEmotions: string[];
}

export interface OperationalAlertsData {
  alerts: Array<{
    type: 'report_spike' | 'ban_wave' | 'high_risk_content' | 'system_warning' | 'engagement_drop';
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    count?: number;
    link?: string;
    timestamp: string;
  }>;
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
  createdAt: string;
}

export interface EmployeeEntry {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
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
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  forecast: Array<{
    date: string;
    condition: WeatherCondition;
    score: number;
    dominantEmotion: string;
    lucidProb: number;
    nightmareProb: number;
  }>;
  description: string;
  emoji: string;
  // Enriched atmospheric fields
  posPct: number;
  negPct: number;
  lucidPct: number;
  nightPct: number;
  dominantEmotion: string;
  topSymbols: Array<{ symbol: string; count: number }>;
  events: DreamEvent[];
  warnings: Array<{ level: 'critical' | 'high' | 'medium' | 'low'; message: string }>;
  timeline: Array<{ hour: number; dreamCount: number; lucidCount: number; nightmareCount: number }>;
  totalDreams7d: number;
  hopeIndex: number;
  syncScore: number;
  // Future-ready global climate structure
  regionalClimates?: Array<{ region: string; country?: string; city?: string; condition: WeatherCondition; score: number }>;
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
  correlates: Array<{ emotion: string; strength: number; direction: 'positive' | 'negative' }>;
}

export interface GlobalEmotionData {
  dominantEmotion: string;
  dominantType: 'positive' | 'negative' | 'neutral';
  energyLevel: number;
  coherence: number;
  distribution: Array<{
    emotion: string; pct: number; count: number; type: 'positive' | 'negative' | 'neutral';
    trend24h: number;
    dominance: 'strong' | 'stable' | 'fading' | 'growing' | 'emerging';
  }>;
  hourlyFlow: Array<{ hour: number; dominant: string; intensity: number }>;
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
  hourlyBreakdown: Array<{ hour: number; posCount: number; negCount: number; neutralCount: number; dreamCount: number; dominant: string }>;
  correlations: EmotionCorrelation[];
  healthScore: number;
  healthStatus: 'critical' | 'poor' | 'fair' | 'healthy' | 'excellent';
  healthTrend: 'improving' | 'stable' | 'declining';
  events: EmotionalEvent[];
  insights: string[];
  forecast: Array<{ date: string; dominantEmotion: string; risk: 'low' | 'medium' | 'high'; prediction: string; comment: string }>;
  // Final intelligence pass
  globalEmotionIndex: number;
  indexTrendDay: number;
  indexTrendWeek: number;
  indexTrendMonth: number;
  totalDreamsAnalyzed: number;
  totalSymbolsProcessed: number;
  activeEmotionClusters: number;
  history: Array<{ period: string; label: string; dominantEmotion: string; posPct: number; negPct: number; emotionalScore: number }>;
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
  forecastIndex?: number;
  forecastIndexTrendDay?: number;
  forecastIndexTrendWeek?: number;
  primaryPrediction?: {
    statement: string; probability: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW'; impact: 'HIGH' | 'MEDIUM' | 'LOW';
    horizon: string; timeUntilForecast: string;
  };
  executiveSummary?: string[];
  timeline?: Array<{
    stage: string; label: string; prediction: string;
    confidence: number; risk: 'low' | 'medium' | 'high'; comment: string; impact: string;
  }>;
  topPredictions?: Array<{
    subject: string; subjectTR: string;
    direction: 'up' | 'down' | 'stable'; magnitude: number; confidence: number; emoji: string;
  }>;
  scenarios?: {
    best:     { title: string; description: string; why: string; probability: number };
    expected: { title: string; description: string; why: string; probability: number };
    worst:    { title: string; description: string; why: string; probability: number };
  };
  momentum?: Array<{
    subject: string; subjectTR: string;
    state: 'accelerating' | 'growing' | 'stable' | 'plateau' | 'fading' | 'collapsing';
    stateTR: string; confidence: number; emoji: string; valueCurr: number; valuePrev: number;
  }>;
  emergingSymbols?: Array<{
    symbol: string; confidence: number; expectedArrival: string;
    estimatedLifetime: string; emotion: string; emoji: string;
  }>;
  predictionAccuracy?: Array<{
    prediction: string; expected: string; result: string; accuracy: number; correct: boolean;
  }>;
  predictionHistory?: Array<{
    period: string; subject: string; direction: 'up' | 'down' | 'stable'; correct: boolean; confidence: number;
  }>;
  decisionSupport?: Array<{ action: string; reason: string; priority: 'high' | 'medium' | 'low'; emoji: string }>;
  relationships?: Array<{ from: string; to: string }>;
  totalDreamsAnalyzed?: number;
  totalSymbolsProcessed?: number;
  totalArchetypes?: number;
  resonanceClusters?: number;
  predictionLatency?: number;
  learningState?: string;
  trainingConfidence?: number;
  forecastVersion?: string;
  lastTraining?: string;
}

export interface TrendRadarData {
  dimensions: Array<{
    key: string;
    label: string;
    value: number;
    baseline: number;
    delta: number;
    trend: 'rising' | 'falling' | 'stable';
  }>;
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
  trend: Array<{ date: string; score: number }>;
  totalDreamsInPeriod: number;
  activeDreamers: number;
}

export interface EmotionMapData {
  dominantEmotion: string;
  dominantType: 'positive' | 'negative' | 'neutral';
  emotionTimeline: Array<{ date: string; positive: number; negative: number; neutral: number }>;
  topEmotions: Array<{ emotion: string; count: number; pct: number; type: 'positive' | 'negative' | 'neutral' }>;
  intensityByHour: Array<{ hour: number; topEmotion: string; count: number }>;
  velocityIndex: number;
  totalEmotions: number;
}

export interface SymbolAnalysisData {
  topSymbols: Array<{ symbol: string; category: string; count: number; pct: number; delta: number }>;
  categoryDistribution: Array<{ category: string; count: number; uniqueSymbols: number }>;
  symbolRelationships: Array<{ symbol1: string; symbol2: string; coCount: number }>;
  emergingSymbols: Array<{ symbol: string; category: string; count: number; growth: number }>;
  totalSymbols: number;
  uniqueSymbols: number;
  avgSymbolsPerDream: number;
}

export interface ArchetypeAnalysisData {
  archetypes: Array<{
    name: string; count: number; pct: number;
    dominantEmotion: string | null; trend: 'rising' | 'falling' | 'stable';
  }>;
  totalFigures: number;
  activationScore: number;
  mostActiveArchetype: string | null;
  archetypeDiversity: number;
}

export interface DreamGenomeData {
  genomeSignature: string;
  dominantTraits: Array<{ trait: string; value: number; category: string }>;
  symbolGenes: Array<{ category: string; frequency: number }>;
  emotionGenes: Array<{ type: 'positive' | 'negative' | 'neutral'; pct: number }>;
  themeGenes: Array<{ family: string; count: number }>;
  topCombinations: Array<{ symbolCat: string; emotion: string; count: number }>;
  diversityScore: number;
  complexityScore: number;
}

export interface GlobalDreamMapData {
  countries: Array<{ country: string; dreamCount: number; userCount: number }>;
  totalCountries: number;
  topCountry: string | null;
  totalMappedDreams: number;
}

export type CoherenceLevel = 'UNIFIED' | 'RESONANT' | 'FRAGMENTED' | 'DISPERSED';

export interface CollectiveConsciousnessData {
  collectiveMoodScore: number;
  alignmentScore: number;
  resonanceCount: number;
  sharedSymbols: Array<{ symbol: string; dreamCount: number; pct: number }>;
  collectiveThemes: Array<{ theme: string; count: number }>;
  consciousnessSynchrony: number;
  mindToMindConnections: number;
  collectiveEmotion: string;
  coherenceLevel: CoherenceLevel;
}

// ── Shared ────────────────────────────────────────────────────────────────────

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

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface ActivityEvent {
  type: 'login' | 'dream_created' | 'profile_updated';
  userId: string;
  email: string;
  username: string;
  detail: string;
  timestamp: string;
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
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface StoredAdmin {
  id: string;
  email: string;
  username: string;
  role: string;
  accessToken: string;
  refreshToken: string;
}

// ── Control Layer ──────────────────────────────────────────────────────────────

export interface AppConfigEntry {
  key:         string;
  value:       boolean;
  label:       string;
  description: string;
  category:    'core' | 'features' | 'emergency' | string;
  dangerous:   boolean;
  updatedAt:   string;
  updatedBy:   string | null;
}

export interface FeatureFlag {
  id:                 string;
  key:                string;
  name:               string;
  description:        string;
  enabled:            boolean;
  targetAudience:     string;
  rolloutPercentage:  number;
  updatedAt:          string;
  updatedBy:          string | null;
}

export interface AdminNotificationEntry {
  id:             string;
  type:           string;
  title:          string;
  message:        string;
  targetAudience: string;
  sentAt:         string;
  sentBy:         string;
  sentByUsername: string | null;
}

export interface ModerationRules {
  id:                       number;
  autoHideThreshold:        number;
  reportThreshold:          number;
  banThreshold:             number;
  suspiciousUserThreshold:  number;
  aiRiskThreshold:          number;
  restrictedWords:          string[];
  rateLimitPerMinute:       number;
  rateLimitPerHour:         number;
  updatedAt:                string;
  updatedBy:                string | null;
}

// ── Live Platform Control ──────────────────────────────────────────────────────

export interface LiveStreamEvent {
  id:         string;
  type:       'user_registered' | 'dream_created' | 'dream_liked' | 'dream_saved' | 'user_followed' | 'dream_reported' | string;
  userId:     string;
  username:   string;
  email:      string;
  detail:     string | null;
  targetId:   string | null;
  timestamp:  string;
}

export interface ModerationQueueItem {
  id:                  string;
  dreamId:             string;
  reason:              string;
  description:         string | null;
  status:              'pending' | 'resolved' | 'dismissed' | string;
  createdAt:           string;
  resolvedAt:          string | null;
  dreamTitle:          string | null;
  dreamPreview:        string;
  dreamCategory:       string;
  authorId:            string;
  authorUsername:      string;
  authorEmail:         string;
  reporterUsername:    string;
  reporterEmail:       string;
  totalReportsOnDream: number;
}

export interface PlatformHealthLive {
  positivityScore: number;
  anxietyScore:    number;
  lucidityScore:   number;
  nightmareRatio:  number;
  totalDreams:     number;
  emotionalShift:  number;
  topEmotions:     Array<{ emotion: string; count: number; pct: number }>;
}

export interface AISignal {
  id:         string;
  category:   string;
  message:    string;
  detail:     string | null;
  severity:   'info' | 'warning' | 'critical' | string;
  metadata:   Record<string, unknown>;
  createdAt:  string;
  readAt:     string | null;
}

export interface AdminNotificationItem {
  id:          string;
  type:        string;
  title:       string;
  message:     string;
  severity:    'info' | 'warning' | 'critical' | string;
  relatedId:   string | null;
  relatedType: string | null;
  readAt:      string | null;
  createdAt:   string;
}

export interface DreamAnalysisResult {
  dreamId:          string;
  symbolCount:      number;
  emotionCount:     number;
  figureCount:      number;
  themeCount:       number;
  primaryEmotion:   string | null;
  primarySymbol:    string | null;
  primaryArchetype: string | null;
  dreamScore:       number;
  resonanceScore:   number;
  processedAt:      string;
}

export interface PlatformAnalysisStats {
  totalAnalyzed:      number;
  avgDreamScore:      number;
  avgResonanceScore:  number;
  topPrimaryEmotions: Array<{ emotion: string; count: number }>;
  topPrimarySymbols:  Array<{ symbol: string; count: number }>;
  topArchetypes:      Array<{ archetype: string; count: number }>;
}

// ── User Intelligence System ──────────────────────────────────────────────────

export interface UserIntelligenceProfile {
  topEmotions:    Array<{ emotion: string; count: number; avgIntensity: number }>;
  topSymbols:     Array<{ symbol: string; count: number }>;
  avgDreamScore:  number;
  avgResonance:   number;
  analyzedDreams: number;
  totalLikes:     number;
  totalSaves:     number;
  totalMatches:   number;
}

export interface UserRiskProfile {
  reportScore:      number;
  spamScore:        number;
  suspiciousScore:  number;
  overallScore:     number;
  riskLevel:        'low' | 'medium' | 'high' | 'critical';
  reportCount:      number;
  dreamCount:       number;
  hiddenCount:      number;
  recentDreams:     number;
  rapidFollows:     number;
  failedLogins:     number;
}

export interface ModerationHistoryItem {
  id:              string;
  source:          'report' | 'admin_action';
  reason?:         string;
  description?:    string;
  status?:         string;
  action_type?:    string;
  old_value?:      string | null;
  new_value?:      string | null;
  dream_title?:    string | null;
  dream_id?:       string | null;
  admin_username?: string | null;
  created_at:      string;
  resolved_at?:    string | null;
}

export interface DreamCollectiveRelevance {
  symbolOverlap:   number;
  emotionOverlap:  number;
  matchCount:      number;
  avgMatchScore:   number;
  collectiveScore: number;
  dreamScore:      number | null;
  resonanceScore:  number | null;
}

export interface EmotionalTrend {
  week:    string;
  emotion: string;
  count:   string;
}

export interface ResonanceEvent {
  id:              string;
  match_score:     number;
  resonance_level: string;
  shared_themes:   string[];
  shared_emotions: string[];
  shared_symbols:  string[];
  created_at:      string;
  dream_a_title:   string;
  user_a:          string;
  dream_b_title:   string;
  user_b:          string;
}

export interface CollectiveIntelligenceSummary {
  topSymbols:     Array<{ symbol: string; count: number }>;
  topEmotions:    Array<{ emotion: string; count: number }>;
  dominantMood:   string | null;
  priorMood:      string | null;
  moodShifted:    boolean;
  resonanceCount: number;
  totalDreams:    number;
}

// ── Dream Connection Engine ───────────────────────────────────────────────────

export interface DreamConnection {
  id:                  string;
  match_score_pct:     number;
  match_score:         number;
  resonance_level:     string;
  shared_themes:       string[];
  shared_emotions:     string[];
  shared_symbols:      string[];
  shared_archetypes:   string[];
  archetype_score:     number;
  created_at:          string;
  dream_a_id:          string;
  dream_a_title:       string | null;
  user_a_id:           string;
  user_a:              string;
  dream_b_id:          string;
  dream_b_title:       string | null;
  user_b_id:           string;
  user_b:              string;
  shared_symbol_count:  number;
  shared_emotion_count: number;
  shared_theme_count:   number;
}

export interface UserResonanceScore {
  id:                    string;
  user_id:               string;
  username:              string;
  display_name:          string | null;
  dream_count:           number;
  resonance_level:       'cosmic' | 'deep' | 'surface' | 'dormant';
  collective_alignment:  number;
  dream_uniqueness_score: number;
  connection_count:      number;
  avg_match_score:       number;
  computed_at:           string;
}

export interface SeenInDream {
  id:               string;
  pattern_type:     'symbol' | 'figure' | 'location';
  pattern_value:    string;
  user_count:       number;
  dream_count:      number;
  confidence_score: number;
  sample_usernames: string[];
  last_seen_at:     string;
  computed_at:      string;
}

export interface ConnectionFeedEvent {
  id:               string;
  created_at:       string;
  score:            number;
  resonance_level:  string;
  primary_emotion:  string | null;
  primary_symbol:   string | null;
  primary_theme:    string | null;
  primary_archetype: string | null;
  symbol_count:     number;
  emotion_count:    number;
  theme_count:      number;
  user_a:           string;
  user_b:           string;
  dream_a_title:    string | null;
  dream_b_title:    string | null;
  dream_a_id:       string;
  dream_b_id:       string;
}

export interface CollectiveSignals {
  emergingSymbols: Array<{
    manifestation:  string;
    current_count:  number;
    prior_count:    number;
    growth:         number;
  }>;
  emotionalShifts: Array<{
    emotion:        string;
    current_count:  number;
    prior_count:    number;
    shift_pct:      number | null;
  }>;
  recurringThemes: Array<{
    theme:       string;
    user_count:  number;
    dream_count: number;
  }>;
  resonanceTotal:     number;
  resonanceAvgScore:  number;
  highResonanceCount: number;
  clusterCount:       number;
  clusterMembers:     number;
  days:               number;
}
