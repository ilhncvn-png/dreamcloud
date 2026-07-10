/**
 * One-shot script: computes dream matches for all analysed dreams.
 * Usage: cd apps/api && npx ts-node -r tsconfig-paths/register src/database/scripts/run-matching.ts
 */
import 'reflect-metadata';
import AppDataSource from '../data-source';
import { AnalysisStatus } from '../../common/enums/database.enums';
import { DreamAnalysis } from '../../modules/analysis/entities/dream-analysis.entity';
import { DreamTheme } from '../../modules/analysis/entities/dream-theme.entity';
import { DreamEmotion } from '../../modules/analysis/entities/dream-emotion.entity';
import { DreamSymbol } from '../../modules/analysis/entities/dream-symbol.entity';
import { DreamLocation } from '../../modules/analysis/entities/dream-location.entity';
import { DreamFigure } from '../../modules/analysis/entities/dream-figure.entity';
import { Dream } from '../../modules/dreams/entities/dream.entity';
import { DreamMatch, ResonanceLevel } from '../../modules/matches/entities/dream-match.entity';
import { MatchEngineService } from '../../modules/matches/match-engine.service';

interface Dims {
  dreamId: string;
  userId: string;
  themes: string[];
  emotions: string[];
  symbols: string[];     // symbolCategory (enum), NOT manifestation (free text)
  locations: string[];
  archetypes: string[];  // archetypeCandidate values (confidence >= 0.5)
}

async function main() {
  const ds = AppDataSource;
  await ds.initialize();

  const analysisRepo = ds.getRepository(DreamAnalysis);
  const themeRepo    = ds.getRepository(DreamTheme);
  const emotionRepo  = ds.getRepository(DreamEmotion);
  const symbolRepo   = ds.getRepository(DreamSymbol);
  const locationRepo = ds.getRepository(DreamLocation);
  const figureRepo   = ds.getRepository(DreamFigure);
  const dreamRepo    = ds.getRepository(Dream);
  const matchRepo    = ds.getRepository(DreamMatch);
  const engine       = new MatchEngineService();

  const analyses = await analysisRepo.find({
    where: { status: AnalysisStatus.COMPLETED },
    select: ['dreamId'],
  });

  console.log(`\nLoading dimensions for ${analyses.length} dreams...\n`);

  const dims = new Map<string, Dims>();

  for (const { dreamId } of analyses) {
    const dream = await dreamRepo.findOne({ where: { id: dreamId }, select: ['id', 'userId', 'isDraft'] });
    if (!dream || dream.isDraft) continue;

    const [themes, emotions, symbols, locations, figures] = await Promise.all([
      themeRepo.find({ where: { dreamId } }),
      emotionRepo.find({ where: { dreamId } }),
      symbolRepo.find({ where: { dreamId } }),
      locationRepo.find({ where: { dreamId } }),
      figureRepo.find({ where: { dreamId } }),
    ]);

    dims.set(dreamId, {
      dreamId,
      userId:     dream.userId,
      themes:     themes.map((t) => t.theme).filter((v): v is string => v != null),
      emotions:   emotions.map((e) => e.emotion).filter((v): v is string => v != null),
      symbols:    symbols.map((s) => s.symbolCategory).filter((v): v is string => v != null),
      locations:  locations.map((l) => l.name).filter((v): v is string => v != null),
      archetypes: figures
        .filter((f) => f.archetypeCandidate && (f.archetypeConfidence ?? 0) >= 0.5)
        .map((f) => f.archetypeCandidate as string),
    });
  }

  const ids = [...dims.keys()];
  let pairs = 0;

  console.log(`Running match engine on ${ids.length} dreams...\n`);

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const idI = ids[i];
      const idJ = ids[j];
      if (!idI || !idJ) continue;

      const a = dims.get(idI);
      const b = dims.get(idJ);
      if (!a || !b) continue;
      if (a.userId === b.userId) continue;

      const result = engine.calculate(a, b);
      if (!result) continue;

      const [idA, idB]   = idI < idJ ? [idI, idJ]           : [idJ, idI];
      const [uidA, uidB] = idI < idJ ? [a.userId, b.userId] : [b.userId, a.userId];

      await matchRepo.upsert(
        {
          dreamIdA:  idA,
          dreamIdB:  idB,
          userIdA:   uidA,
          userIdB:   uidB,
          matchScore:       result.matchScore,
          resonanceLevel:   result.resonanceLevel as ResonanceLevel,
          themeScore:       result.themeScore,
          emotionScore:     result.emotionScore,
          symbolScore:      result.symbolScore,
          locationScore:    result.locationScore,
          archetypeScore:   result.archetypeScore,
          sharedThemes:     result.sharedThemes,
          sharedEmotions:   result.sharedEmotions,
          sharedSymbols:    result.sharedSymbols,
          sharedLocations:  result.sharedLocations,
          sharedArchetypes: result.sharedArchetypes,
          calculatedAt:     new Date(),
        },
        { conflictPaths: ['dreamIdA', 'dreamIdB'] },
      );

      const shared = [
        result.sharedThemes.length   ? `themes:[${result.sharedThemes.join(',')}]`       : '',
        result.sharedEmotions.length ? `emotions:[${result.sharedEmotions.join(',')}]`   : '',
        result.sharedSymbols.length  ? `symbols:[${result.sharedSymbols.join(',')}]`     : '',
        result.sharedArchetypes.length ? `archetypes:[${result.sharedArchetypes.join(',')}]` : '',
      ].filter(Boolean).join(' ');

      console.log(`✓ [${result.resonanceLevel.toUpperCase().padEnd(9)}] score:${result.matchScore} ${shared}`);
      pairs++;
    }
  }

  // Refresh matchCount on all dreams
  for (const id of ids) {
    const count = await matchRepo.count({ where: [{ dreamIdA: id }, { dreamIdB: id }] });
    await dreamRepo.update({ id }, { matchCount: count });
  }

  console.log(`\nDone: ${pairs} match pairs stored.\n`);
  await ds.destroy();
}

main().catch((e) => { console.error(e); process.exit(1); });
