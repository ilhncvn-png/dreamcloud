export type TraceType      = 'symbol' | 'emotion' | 'theme' | 'archetype' | 'location' | 'figure';
export type SignalType     = 'emerging' | 'dominant' | 'rare' | 'fading' | 'global';
export type TrendDirection = 'rising' | 'stable' | 'falling';
export type ActivityLevel  = 'low' | 'moderate' | 'high' | 'intense';

export interface DreamTrace {
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

export interface TraceSignal {
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

export interface CollectivePattern {
  id:       string;
  element1: { type: TraceType; name: string; label: string };
  element2: { type: TraceType; name: string; label: string };
  count:    number;
  headline: string;
  body:     string;
  strength: number;
}

export interface DreamWeather {
  generatedAt:        string;
  period:             '24h';
  totalDreams:        number;
  totalDreamers:      number;
  weatherTitle:       string;
  weatherSummary:     string;
  weatherDescription: string;
  activityLevel:      ActivityLevel;
  dominantTrace:      DreamTrace | null;
  topTraces:          DreamTrace[];
  signals:            TraceSignal[];
  patterns:           CollectivePattern[];
}

export interface TraceDetail {
  trace:                DreamTrace;
  signal:               TraceSignal | null;
  narrative:            string;
  whyImportant:         string;
  associatedEmotions:   Array<{ name: string; label: string; count: number }>;
  associatedThemes:     Array<{ name: string; label: string; count: number }>;
  associatedArchetypes: Array<{ name: string; label: string; count: number }>;
  recentDreamExcerpts:  Array<{ dreamId: string; excerpt: string; createdAt: string }>;
}
