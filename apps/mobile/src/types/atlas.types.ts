export interface AtlasEmotion {
  emotion:    string;
  count:      number;
  percentage: number;
}

export interface AtlasArchetype {
  archetype: string;
  count:     number;
}

export interface AtlasWorld {
  totalDreams:    number;
  totalDreamers:  number;
  totalPlaces:    number;
  totalClusters:  number;
  totalMatches:   number;
  lucidRatio:     number;
  nightmareRatio: number;
  beautifulRatio: number;
  topEmotions:    AtlasEmotion[];
  topArchetypes:  AtlasArchetype[];
  generatedAt:    string;
}

export interface AtlasPlace {
  name:       string;
  type:       string;
  country:    string | null;
  latitude:   number | null;
  longitude:  number | null;
  dreamCount: number;
  score:      number;
}

export interface AtlasSymbol {
  symbol:               string;
  count:                number;
  percentage:           number;
  universalCount:       number;
  exampleManifestation: string | null;
}

export type TrendDir = 'new' | 'rising' | 'stable' | 'falling';

export interface AtlasTrending {
  name:     string;
  count:    number;
  trend:    TrendDir;
  trendPct: number;
}
