export type DreamWeather = 'peaceful' | 'active' | 'transforming' | 'lucid' | 'nightmare-heavy';
export type NodeColor    = '#60A5FA' | '#C084FC' | '#F87171' | '#FBBF24' | '#34D399';

export interface MapCity {
  name:               string;
  slug:               string;
  country:            string | null;
  type:               string;
  latitude:           number;
  longitude:          number;
  dreamCount:         number;
  dreamScore:         number;
  lucidRatio:         number;
  nightmareRatio:     number;
  dominantEmotion:    string | null;
  dominantThemes:     string[];
  dominantSymbols:    string[];
  dominantArchetypes: string[];
  dreamWeather:       DreamWeather;
  nodeColor:          NodeColor;
}

export interface MapCityDetail extends MapCity {
  emotionDistribution: Array<{ emotion: string; count: number; percentage: number }>;
  recentSnippets:      Array<{ title: string | null; excerpt: string; category: string; createdAt: string }>;
}

export interface ConstellationCity {
  name:         string;
  latitude:     number;
  longitude:    number;
  linkStrength: number;
}

export interface MapConstellation {
  clusterId:     string;
  clusterName:   string;
  clusterSlug:   string;
  strengthScore: number;
  memberCount:   number;
  cities:        ConstellationCity[];
  connections:   Array<{ from: ConstellationCity; to: ConstellationCity }>;
}

export interface MapWorld {
  totalDreams:     number;
  totalDreamers:   number;
  totalPlaces:     number;
  totalClusters:   number;
  totalMatches:    number;
  lucidRatio:      number;
  nightmareRatio:  number;
  beautifulRatio:  number;
  dominantEmotion: string | null;
  generatedAt:     string;
}
