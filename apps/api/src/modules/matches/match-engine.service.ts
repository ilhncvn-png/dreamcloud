import { Injectable } from '@nestjs/common';
import { ResonanceLevel } from './entities/dream-match.entity';

export interface DreamDimensions {
  dreamId: string;
  userId: string;
  themes: string[];
  emotions: string[];
  symbols: string[];      // uses symbolCategory (enum), NOT manifestation (free text)
  locations: string[];
  archetypes: string[];   // archetypeCandidate values from dream_figures (confidence >= 0.5)
}

export interface MatchCalculation {
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
}

// Weights must sum to 1.0
// theme 30% | emotion 25% | symbol 20% | archetype 15% | location 10%
const WEIGHTS = {
  theme:     0.30,
  emotion:   0.25,
  symbol:    0.20,
  archetype: 0.15,
  location:  0.10,
} as const;

// Minimum score (0-100) to persist a match — any single shared element across
// any weighted dimension will exceed this threshold.
const SIGNAL_THRESHOLD = 10;

@Injectable()
export class MatchEngineService {
  calculate(a: DreamDimensions, b: DreamDimensions): MatchCalculation | null {
    const { intersection: sharedThemes,     score: themeScore     } = jaccardScore(a.themes,     b.themes);
    const { intersection: sharedEmotions,   score: emotionScore   } = jaccardScore(a.emotions,   b.emotions);
    const { intersection: sharedSymbols,    score: symbolScore    } = jaccardScore(a.symbols,    b.symbols);
    const { intersection: sharedLocations,  score: locationScore  } = jaccardScore(a.locations,  b.locations);
    const { intersection: sharedArchetypes, score: archetypeScore } = jaccardScore(a.archetypes, b.archetypes);

    const matchScore = Math.round(
      themeScore     * WEIGHTS.theme     +
      emotionScore   * WEIGHTS.emotion   +
      symbolScore    * WEIGHTS.symbol    +
      locationScore  * WEIGHTS.location  +
      archetypeScore * WEIGHTS.archetype,
    );

    if (matchScore < SIGNAL_THRESHOLD) return null;

    return {
      matchScore,
      resonanceLevel: toResonanceLevel(matchScore),
      themeScore,
      emotionScore,
      symbolScore,
      locationScore,
      archetypeScore,
      sharedThemes,
      sharedEmotions,
      sharedSymbols,
      sharedLocations,
      sharedArchetypes,
    };
  }
}

function jaccardScore(a: string[], b: string[]): { intersection: string[]; score: number } {
  if (a.length === 0 || b.length === 0) return { intersection: [], score: 0 };
  const setA = new Set(a.map((x) => x.toLowerCase()));
  const setB = new Set(b.map((x) => x.toLowerCase()));
  const intersection = [...setA].filter((x) => setB.has(x));
  const union = new Set([...setA, ...setB]);
  return { intersection, score: Math.round((intersection.length / union.size) * 100) };
}

function toResonanceLevel(score: number): ResonanceLevel {
  if (score >= 85) return ResonanceLevel.MIRROR;
  if (score >= 65) return ResonanceLevel.DEEP;
  if (score >= 45) return ResonanceLevel.STRONG;
  if (score >= 25) return ResonanceLevel.RESONANCE;
  return ResonanceLevel.SIGNAL;
}
