export type ResonanceLevel = 'signal' | 'resonance' | 'strong' | 'deep' | 'mirror';

export interface MatchDreamSnippet {
  id: string;
  title: string | null;
  content: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isYou: boolean;
}

export interface MatchDetail {
  id: string;
  matchScore: number;
  resonanceLevel: ResonanceLevel;
  themeScore: number;
  emotionScore: number;
  symbolScore: number;
  locationScore: number;
  archetypeScore: number;
  myDream: MatchDreamSnippet;
  matchingDream: MatchDreamSnippet;
  sharedThemes: string[];
  sharedEmotions: string[];
  sharedSymbols: string[];
  sharedLocations: string[];
  sharedArchetypes: string[];
  calculatedAt: string;
}

export interface DreamMatch {
  id: string;
  myDreamId: string;
  myDreamTitle: string | null;
  matchingDreamId: string;
  matchingDreamTitle: string | null;
  matchingDreamContent: string;
  matchingUserId: string;
  matchingUserUsername: string;
  matchingUserDisplayName: string | null;
  matchingUserAvatarUrl: string | null;
  matchScore: number;
  resonanceLevel: ResonanceLevel;
  themeScore: number;
  emotionScore: number;
  symbolScore: number;
  locationScore: number;
  archetypeScore: number;
  sharedThemes: string[];
  sharedEmotions: string[];
  sharedSymbols: string[];
  sharedLocations: string[];
  sharedArchetypes: string[];
  calculatedAt: string;
}

export interface ConnectionSummary {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  topMatchScore: number;
  topResonanceLevel: ResonanceLevel;
  sharedThemes: string[];
  sharedEmotions: string[];
  matchCount: number;
}

export interface MatchPageMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface MatchesPage {
  items: DreamMatch[];
  meta: MatchPageMeta;
}
