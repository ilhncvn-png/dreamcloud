export type ResonanceLevelIntel = 'cosmic' | 'deep' | 'surface' | 'dormant';
export type PlatformMood = 'UNIFIED' | 'RESONANT' | 'FRAGMENTED' | 'DISPERSED';

export interface DreamIntelligenceAnalysis {
  dreamId: string;
  dreamScore: number | null;
  resonanceScore: number | null;
  primaryEmotion: string | null;
  primarySymbol: string | null;
  primaryArchetype: string | null;
  analyzedAt: string | null;
  emotions: Array<{ emotion: string; intensity: string; isPrimary: boolean }>;
  symbols: Array<{ manifestation: string; category: string; confidence: number }>;
  archetypes: string[];
  themes: Array<{ theme: string; family: string | null; isPrimary: boolean }>;
}

export interface SimilarDream {
  id: string;
  match_pct: number;
  resonance_level: string;
  shared_emotions: string[] | null;
  shared_symbols: string[] | null;
  shared_themes: string[] | null;
  matched_dream_id: string;
  matched_dream_title: string | null;
  matched_user_id: string;
  matched_username: string;
  shared_symbol_count: number;
  shared_emotion_count: number;
  shared_theme_count: number;
}

export interface UserResonanceData {
  resonanceLevel: ResonanceLevelIntel;
  collectiveAlignment: number;
  dreamUniquenessScore: number;
  connectionCount: number;
  avgMatchScore: number;
  computedAt: string | null;
  source: 'cached' | 'realtime';
}

export interface CollectiveMood {
  dominantEmotion: string | null;
  dominantEmotionCount: number;
  topEmotions: Array<{ emotion: string; count: number }>;
  emergingSymbols: Array<{ symbol: string; count: number; growth: number }>;
  platformMood: PlatformMood;
  totalDreamsLast7Days: number;
  activeUsersLast7Days: number;
  resonanceEventsLast7Days: number;
  avgResonanceScore: number;
  fetchedAt: string;
}

export interface IntelConnection {
  id: string;
  match_pct: number;
  resonance_level: string;
  shared_emotions: string[] | null;
  shared_symbols: string[] | null;
  shared_themes: string[] | null;
  shared_archetypes: string[] | null;
  created_at: string;
  matched_user_id: string;
  matched_username: string;
  matched_dream_id: string;
  matched_dream_title: string | null;
  my_dream_id: string;
  my_dream_title: string | null;
  shared_symbol_count: number;
  shared_emotion_count: number;
}

export type IntelNotifType = 'DREAM_MATCH' | 'SEEN_IN_DREAMS' | 'AI_EVENT';

export interface IntelligenceNotification {
  id: string;
  notification_type: IntelNotifType;
  occurred_at: string;
  // DREAM_MATCH
  score?: number;
  resonance_level?: string;
  primary_shared?: string | null;
  primary_symbol?: string | null;
  other_username?: string;
  other_dream_title?: string | null;
  // SEEN_IN_DREAMS
  pattern_type?: string;
  pattern_value?: string;
  user_count?: number;
  confidence_score?: number;
  // AI_EVENT
  category?: string;
  message?: string;
  detail?: string;
  severity?: string;
}

// ── Timeline ──────────────────────────────────────────────────────────────────

export interface TimelineEmotion { week: string; emotion: string; count: number }
export interface TimelineSymbol  { week: string; manifestation: string; count: number }
export interface TimelineResonance { created_at: string; score_pct: number; resonance_level: string }
export interface TimelineFrequency { week: string; count: number }

export interface UserDreamTimeline {
  emotionHistory: TimelineEmotion[];
  symbolEvolution: TimelineSymbol[];
  resonanceHistory: TimelineResonance[];
  dreamFrequency: TimelineFrequency[];
  totals: { total_dreams: number; avg_dream_score: number; avg_resonance: number } | null;
}

// ── Dream Graph ───────────────────────────────────────────────────────────────

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
  accessDenied?: boolean;
  summary: {
    symbolCount: number;
    emotionCount: number;
    archetypeCount: number;
    themeCount: number;
    placeCount: number;
    connectionCount: number;
  };
}

// ── AI Insights ───────────────────────────────────────────────────────────────

export interface InsightCard { type: string; title: string; body: string; color: string }

export interface UserAIInsights {
  insights: InsightCard[];
  topEmotions: Array<{ emotion: string; count: number; avg_intensity: number }>;
  topSymbols:  Array<{ manifestation: string; count: number }>;
  topArchetypes: Array<{ archetype: string; count: number }>;
  resonanceStats: { total: number; avgScore: number; peakScore: number };
  dreamStats: { totalDreams: number; avgDreamScore: number; avgResonance: number };
  generatedAt: string;
}

// ── Platform Events (anonymized) ──────────────────────────────────────────────

export interface PlatformEvent {
  id: string;
  event_type: 'NEW_DREAM' | 'RESONANCE_EVENT';
  occurred_at: string;
  score_pct?: number;
  resonance_level?: string;
  top_emotion?: string;
  top_symbol?: string;
  category?: string;
  anon_user?: string;
}

// ── Smart Notifications ───────────────────────────────────────────────────────

export type SmartNotifType = 'RESONANCE_ALERT' | 'SYMBOL_EVENT' | 'CONNECTION_EVENT' | 'COLLECTIVE_MOOD';
export type NotifPriority  = 'high' | 'medium' | 'low';

export interface SmartNotification {
  id: string;
  type: SmartNotifType;
  priority: NotifPriority;
  title: string;
  body: string;
  occurred_at: string;
  data: Record<string, unknown>;
}
