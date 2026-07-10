/**
 * One-shot script: runs the stub analyzer against all pending/failed dreams.
 * Usage: ts-node src/database/scripts/run-analysis.ts
 */
import 'reflect-metadata';
import { AnalysisStatus } from '../../common/enums/database.enums';
import { StubAnalyzerService } from '../../modules/analysis/ai/stub-analyzer.service';
import { Dream } from '../../modules/dreams/entities/dream.entity';
import { DreamAnalysis } from '../../modules/analysis/entities/dream-analysis.entity';
import { DreamTheme }    from '../../modules/analysis/entities/dream-theme.entity';
import { DreamEmotion }  from '../../modules/analysis/entities/dream-emotion.entity';
import { DreamFigure }   from '../../modules/analysis/entities/dream-figure.entity';
import { DreamLocation } from '../../modules/analysis/entities/dream-location.entity';
import { DreamSymbol }   from '../../modules/analysis/entities/dream-symbol.entity';
import { DreamObject }   from '../../modules/analysis/entities/dream-object.entity';
import AppDataSource from '../data-source';

async function main() {
  const ds = AppDataSource;
  await ds.initialize();

  const analysisRepo  = ds.getRepository(DreamAnalysis);
  const dreamRepo     = ds.getRepository(Dream);
  const themeRepo     = ds.getRepository(DreamTheme);
  const emotionRepo   = ds.getRepository(DreamEmotion);
  const figureRepo    = ds.getRepository(DreamFigure);
  const locationRepo  = ds.getRepository(DreamLocation);
  const symbolRepo    = ds.getRepository(DreamSymbol);
  const objectRepo    = ds.getRepository(DreamObject);

  const analyzer = new StubAnalyzerService();

  const pending = await analysisRepo.find({
    where: [{ status: AnalysisStatus.PENDING }, { status: AnalysisStatus.FAILED }],
  });

  console.log(`\nAnalyzing ${pending.length} dreams...\n`);

  let completed = 0;
  let skipped   = 0;

  for (const pa of pending) {
    const dream = await dreamRepo.findOne({ where: { id: pa.dreamId } });
    if (!dream || dream.isDraft) {
      await analysisRepo.update({ dreamId: pa.dreamId }, { status: AnalysisStatus.SKIPPED });
      skipped++;
      continue;
    }

    await analysisRepo.update({ dreamId: pa.dreamId }, { status: AnalysisStatus.PROCESSING });

    const result = await analyzer.analyze(pa.dreamId, dream.title, dream.content);

    // Delete previous rows
    await Promise.all([
      themeRepo.delete({ dreamId: pa.dreamId }),
      emotionRepo.delete({ dreamId: pa.dreamId }),
      figureRepo.delete({ dreamId: pa.dreamId }),
      locationRepo.delete({ dreamId: pa.dreamId }),
      symbolRepo.delete({ dreamId: pa.dreamId }),
      objectRepo.delete({ dreamId: pa.dreamId }),
    ]);

    if (result.themes.length)    await themeRepo.save(result.themes.map((t) => ({ ...t, dreamId: pa.dreamId })));
    if (result.emotions.length)  await emotionRepo.save(result.emotions.map((e) => ({ ...e, dreamId: pa.dreamId })));
    if (result.figures.length)   await figureRepo.save(result.figures.map((f) => ({ ...f, dreamId: pa.dreamId })));
    if (result.locations.length) await locationRepo.save(result.locations.map((l) => ({ ...l, dreamId: pa.dreamId })));
    if (result.symbols.length)   await symbolRepo.save(result.symbols.map((s) => ({ ...s, dreamId: pa.dreamId })));
    if (result.objects.length)   await objectRepo.save(result.objects.map((o) => ({ ...o, dreamId: pa.dreamId })));

    await analysisRepo.update(
      { dreamId: pa.dreamId },
      {
        status:             AnalysisStatus.COMPLETED,
        modelVersion:       result.modelVersion,
        analyzedAt:         new Date(),
        failedAt:           null,
        failureReason:      null,
        primaryTheme:       result.primaryTheme,
        primaryEmotion:     result.primaryEmotion,
        emotionalIntensity: result.emotionalIntensity,
        emotionalArc:       result.emotionalArc as any,
        residualEmotion:    result.residualEmotion,
      } as any,
    );

    console.log(`✓ ${dream.title ?? '(untitled)'} → theme:${result.primaryTheme ?? '-'} emotion:${result.primaryEmotion ?? '-'} [${result.themes.length}T ${result.emotions.length}E ${result.figures.length}F ${result.locations.length}L ${result.symbols.length}S ${result.objects.length}O]`);
    completed++;
  }

  console.log(`\nDone: ${completed} completed, ${skipped} skipped.\n`);
  await ds.destroy();
}

main().catch((e) => { console.error(e); process.exit(1); });
