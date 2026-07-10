export interface DreamIdentity {
  primaryArchetype: string;
  primaryArchetypeName: string;
  primaryArchetypeEnglish: string;
  primaryArchetypeEmoji: string;
  primaryArchetypeDescription: string;
  primaryArchetypeScore: number;
  secondaryArchetype: string;
  secondaryArchetypeName: string;
  secondaryArchetypeEnglish: string;
  secondaryArchetypeEmoji: string;
  secondaryArchetypeScore: number;
  personalitySummary: string;
  dominantThemes: string[];
  dominantEmotions: string[];
  dominantSymbols: string[];
  dominantLocations: string[];
  dominantArchetypes: string[];
  resonanceScore: number;
  lucidScore: number;
  transformationScore: number;
  wonderScore: number;
  connectionScore: number;
  dreamCount: number;
  computedAt: string;
  isStale: boolean;
}
