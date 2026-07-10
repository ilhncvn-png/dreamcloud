export type DreamPlaceType =
  | 'CITY' | 'COUNTRY' | 'LANDMARK' | 'HOTEL'
  | 'RESTAURANT' | 'CAFE' | 'STREET' | 'BUILDING' | 'NATURE' | 'UNKNOWN';

export interface TrendingPlace {
  name: string;
  type: DreamPlaceType;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  dreamCount: number;
  avgConfidence: number;
}

export interface TrendingAll {
  today: TrendingPlace[];
  week:  TrendingPlace[];
  month: TrendingPlace[];
}

export interface PlaceEmotion {
  emotion: string;
  count: number;
  percentage: number;
}

export interface PlaceIntelligence {
  name: string;
  type: DreamPlaceType;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  dreamCount: number;
  dreamScore: number;
  lucidRatio: number;
  nightmareRatio: number;
  emotions: PlaceEmotion[];
  symbols: Array<{ symbol: string; count: number }>;
  themes: Array<{ theme: string; count: number }>;
  archetypes: Array<{ archetype: string; count: number }>;
}

export interface CuratedPlaces {
  peaceful:  TrendingPlace[];
  lucid:     TrendingPlace[];
  emotional: TrendingPlace[];
  cities:    TrendingPlace[];
  landmarks: TrendingPlace[];
}
