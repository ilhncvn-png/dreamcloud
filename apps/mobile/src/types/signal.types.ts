export type TrendDirection = 'new' | 'rising' | 'stable' | 'falling';
export type SignalPeriod = '24h' | '7d' | '30d';

export interface SignalItem {
  name: string;
  count: number;
  trend: TrendDirection;
  trendPct: number;
}

export interface DreamSignals {
  period: SignalPeriod;
  periodLabel: string;
  dreamCount: number;
  generatedAt: string;
  themes: SignalItem[];
  emotions: SignalItem[];
  symbols: SignalItem[];
  locations: SignalItem[];
  archetypes: SignalItem[];
}
