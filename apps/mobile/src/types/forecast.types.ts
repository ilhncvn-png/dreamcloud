export type TrendDir = 'Rising' | 'Stable' | 'Falling' | 'Exploding';
export type ForecastPeriod = 'today' | 'week' | 'month';

export interface TrendItem {
  name:          string;
  currentCount:  number;
  previousCount: number;
  changePercent: number;
  trend:         TrendDir;
}

export interface EmotionShift {
  emotion:       string;
  currentRatio:  number;
  previousRatio: number;
  delta:         number;
  trend:         TrendDir;
}

export interface CityForecastSummary {
  name:                string;
  slug:                string;
  country:             string | null;
  dreamCount:          number;
  previousDreamCount:  number;
  changePercent:       number;
  trend:               TrendDir;
  dominantEmotion:     string | null;
  lucidRatio:          number;
  nightmareRatio:      number;
  topThemes:           string[];
}

export interface DreamForecast {
  period:                  ForecastPeriod;
  generatedAt:             string;
  totalDreams:             number;
  totalDreamers:           number;
  forecastScore:           number;
  dominantEmotion:         string | null;
  dominantMood:            string;
  lucidRatio:              number;
  nightmareRatio:          number;
  previousLucidRatio:      number;
  previousNightmareRatio:  number;
  lucidDelta:              number;
  nightmareDelta:          number;
  lucidTrend:              TrendDir;
  nightmareTrend:          TrendDir;
  risingThemes:            TrendItem[];
  fallingThemes:           TrendItem[];
  risingSymbols:           TrendItem[];
  fallingSymbols:          TrendItem[];
  emotionalShifts:         EmotionShift[];
  cityForecasts:           CityForecastSummary[];
}

export interface CityForecastDetail extends CityForecastSummary {
  risingThemes:    TrendItem[];
  fallingThemes:   TrendItem[];
  emotionalShifts: EmotionShift[];
  topSymbols:      string[];
}
