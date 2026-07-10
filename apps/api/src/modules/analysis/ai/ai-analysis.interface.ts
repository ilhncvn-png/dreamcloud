export interface ExtractedTheme {
  theme: string;
  themeFamily: string | null;
  isPrimary: boolean;
  confidence: number;
}

export interface ExtractedEmotion {
  emotion: string;
  intensity: 'low' | 'moderate' | 'high' | 'overwhelming';
  isPrimary: boolean;
  isResidual: boolean;
  arcPosition: 'start' | 'middle' | 'end' | 'throughout' | null;
}

export interface ExtractedFigure {
  figureType: 'unknown' | 'known_personal' | 'known_public' | 'self_variant';
  isKnown: boolean;
  relationshipType: string | null;
  archetypeCandidate: string | null;
  archetypeConfidence: number | null;
  qualityDescriptors: string[];
  narrativeRole: string | null;
}

export interface ExtractedLocation {
  locationTier: 1 | 2 | 3;
  name: string | null;
  locationType: string | null;
  archetypeType: string | null;
  emotionalTone: string | null;
  isDistorted: boolean;
  geographicHint: string | null;
}

export interface ExtractedSymbol {
  symbolCategory: string;
  manifestation: string | null;
  emotionalContext: string | null;
  narrativeFunction: string | null;
  isUniversal: boolean;
  confidence: number;
}

export interface ExtractedObject {
  objectName: string | null;
  objectType: string | null;
  symbolicCategory: string | null;
  narrativeFunction: string | null;
  emotionalContext: string | null;
  isImpossible: boolean;
}

export interface DreamAnalysisResult {
  modelVersion: string;
  primaryTheme: string | null;
  primaryEmotion: string | null;
  emotionalIntensity: 'low' | 'moderate' | 'high' | 'overwhelming' | null;
  emotionalArc: { from: string; to: string } | null;
  residualEmotion: string | null;
  themes: ExtractedTheme[];
  emotions: ExtractedEmotion[];
  figures: ExtractedFigure[];
  locations: ExtractedLocation[];
  symbols: ExtractedSymbol[];
  objects: ExtractedObject[];
  rawResponse: Record<string, unknown>;
}

export interface IDreamAnalyzer {
  analyze(dreamId: string, title: string | null, content: string): Promise<DreamAnalysisResult>;
}

export const DREAM_ANALYZER = 'DREAM_ANALYZER';
