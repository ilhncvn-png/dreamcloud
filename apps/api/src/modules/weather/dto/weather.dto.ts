export type TraceType      = 'symbol' | 'emotion' | 'theme' | 'archetype' | 'location' | 'figure';
export type SignalType     = 'emerging' | 'dominant' | 'rare' | 'fading' | 'global';
export type TrendDirection = 'rising' | 'stable' | 'falling';
export type ActivityLevel  = 'low' | 'moderate' | 'high' | 'intense';

export interface DreamTraceDto {
  id:              string;
  type:            TraceType;
  name:            string;
  label:           string;
  currentCount:    number;
  previousCount:   number;
  growthPercent:   number;
  activeDreams:    number;
  activeUsers:     number;
  trendDirection:  TrendDirection;
  traceScore:      number;
  confidenceScore: number;
  timeframe:       '24h';
  generatedAt:     string;
}

export interface TraceSignalDto {
  id:         string;
  type:       SignalType;
  traceId:    string;
  traceName:  string;
  traceType:  TraceType;
  traceLabel: string;
  headline:   string;
  body:       string;
  strength:   number;
}

export interface CollectivePatternDto {
  id:       string;
  element1: { type: TraceType; name: string; label: string };
  element2: { type: TraceType; name: string; label: string };
  count:    number;
  headline: string;
  body:     string;
  strength: number;
}

export interface DreamWeatherDto {
  generatedAt:        string;
  period:             '24h';
  totalDreams:        number;
  totalDreamers:      number;
  weatherTitle:       string;
  weatherSummary:     string;
  weatherDescription: string;
  activityLevel:      ActivityLevel;
  dominantTrace:      DreamTraceDto | null;
  topTraces:          DreamTraceDto[];
  signals:            TraceSignalDto[];
  patterns:           CollectivePatternDto[];
}

export interface TraceDetailDto {
  trace:                DreamTraceDto;
  signal:               TraceSignalDto | null;
  narrative:            string;
  whyImportant:         string;
  associatedEmotions:   Array<{ name: string; label: string; count: number }>;
  associatedThemes:     Array<{ name: string; label: string; count: number }>;
  associatedArchetypes: Array<{ name: string; label: string; count: number }>;
  recentDreamExcerpts:  Array<{ dreamId: string; excerpt: string; createdAt: string }>;
}
