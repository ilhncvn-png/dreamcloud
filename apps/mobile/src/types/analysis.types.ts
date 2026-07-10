export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ThemeSignal {
  theme: string;
  themeFamily: string | null;
  isPrimary: boolean;
  confidence: number;
}

export interface EmotionSignal {
  emotion: string;
  intensity: string;
  isPrimary: boolean;
  isResidual: boolean;
  arcPosition: string | null;
}

export interface FigureSignal {
  figureType: string;
  isKnown: boolean;
  relationshipType: string | null;
  archetypeCandidate: string | null;
  archetypeConfidence: number | null;
  qualityDescriptors: string[];
  narrativeRole: string | null;
}

export interface LocationSignal {
  locationTier: number;
  name: string | null;
  locationType: string | null;
  archetypeType: string | null;
  emotionalTone: string | null;
  isDistorted: boolean;
  geographicHint: string | null;
}

export interface SymbolSignal {
  symbolCategory: string;
  manifestation: string | null;
  emotionalContext: string | null;
  narrativeFunction: string | null;
  isUniversal: boolean;
  confidence: number;
}

export interface ObjectSignal {
  objectName: string | null;
  objectType: string | null;
  symbolicCategory: string | null;
  narrativeFunction: string | null;
  emotionalContext: string | null;
  isImpossible: boolean;
}

export interface DreamAnalysisResponse {
  dreamId: string;
  status: AnalysisStatus;
  modelVersion: string | null;
  analyzedAt: string | null;
  primaryTheme: string | null;
  primaryEmotion: string | null;
  emotionalIntensity: string | null;
  emotionalArc: { from: string; to: string } | null;
  residualEmotion: string | null;
  themes: ThemeSignal[];
  emotions: EmotionSignal[];
  figures: FigureSignal[];
  locations: LocationSignal[];
  symbols: SymbolSignal[];
  objects: ObjectSignal[];
}

/**
 * A decoded dream element that connects to the wider subconscious network.
 *
 * V1: populated from tonight's collective field (forecast API).
 * V2: matchCount + matchPreviewIds from Dream Match Engine.
 * V3: clusterId + clusterName + clusterMemberCount from Resonance Cluster Engine.
 *
 * Components consuming this type should render progressively based on
 * which fields are present — never assume a specific version's fields exist.
 */
export interface NetworkSignal {
  type: 'theme' | 'symbol' | 'emotion' | 'archetype';
  name: string;
  displayLabel: string;

  // V1 — collective field data
  activeCountTonight?: number;

  // V2 — Dream Match Engine
  matchCount?: number;
  matchPreviewIds?: string[];

  // V3 — Resonance Cluster Engine
  clusterId?: string;
  clusterName?: string;
  clusterMemberCount?: number;
}
