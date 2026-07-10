import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bull';
import { Repository } from 'typeorm';
import { AnalysisStatus } from '../../common/enums/database.enums';
import { Dream } from '../dreams/entities/dream.entity';
import { DREAM_ANALYZER, type IDreamAnalyzer, type DreamAnalysisResult } from './ai/ai-analysis.interface';
import { ANALYSIS_JOB, ANALYSIS_QUEUE } from './constants';
import { DreamAnalysis } from './entities/dream-analysis.entity';
import { DreamEmotion } from './entities/dream-emotion.entity';
import { DreamFigure } from './entities/dream-figure.entity';
import { DreamLocation } from './entities/dream-location.entity';
import { DreamObject } from './entities/dream-object.entity';
import { DreamSymbol } from './entities/dream-symbol.entity';
import { DreamTheme } from './entities/dream-theme.entity';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    @InjectQueue(ANALYSIS_QUEUE)
    private readonly analysisQueue: Queue,

    @Inject(DREAM_ANALYZER)
    private readonly analyzer: IDreamAnalyzer,

    @InjectRepository(Dream)
    private readonly dreamRepo: Repository<Dream>,

    @InjectRepository(DreamAnalysis)
    private readonly analysisRepo: Repository<DreamAnalysis>,

    @InjectRepository(DreamTheme)
    private readonly themeRepo: Repository<DreamTheme>,

    @InjectRepository(DreamEmotion)
    private readonly emotionRepo: Repository<DreamEmotion>,

    @InjectRepository(DreamFigure)
    private readonly figureRepo: Repository<DreamFigure>,

    @InjectRepository(DreamLocation)
    private readonly locationRepo: Repository<DreamLocation>,

    @InjectRepository(DreamSymbol)
    private readonly symbolRepo: Repository<DreamSymbol>,

    @InjectRepository(DreamObject)
    private readonly objectRepo: Repository<DreamObject>,
  ) {}

  async enqueue(dreamId: string): Promise<void> {
    // Upsert a pending analysis row so the control table is always in sync
    await this.analysisRepo.upsert(
      { dreamId, status: AnalysisStatus.PENDING },
      { conflictPaths: ['dreamId'], skipUpdateIfNoValuesChanged: true },
    );
    await this.analysisQueue.add(ANALYSIS_JOB, { dreamId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async analyze(dreamId: string): Promise<void> {
    const dream = await this.dreamRepo.findOne({ where: { id: dreamId } });
    if (!dream) {
      this.logger.warn(`Dream not found for analysis: ${dreamId}`);
      return;
    }

    // Skip drafts — no point analysing unpublished content
    if (dream.isDraft) {
      await this.analysisRepo.update({ dreamId }, { status: AnalysisStatus.SKIPPED });
      return;
    }

    await this.analysisRepo.update({ dreamId }, { status: AnalysisStatus.PROCESSING });

    try {
      const result: DreamAnalysisResult = await this.analyzer.analyze(
        dreamId,
        dream.title,
        dream.content,
      );

      await this.persist(dreamId, result);

      this.logger.log(`Analysis completed for dream ${dreamId} (${result.modelVersion})`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(`Analysis failed for dream ${dreamId}: ${reason}`);
      await this.analysisRepo.update(
        { dreamId },
        { status: AnalysisStatus.FAILED, failedAt: new Date(), failureReason: reason },
      );
      throw err;
    }
  }

  async getAnalysis(dreamId: string): Promise<DreamAnalysis | null> {
    return this.analysisRepo.findOne({
      where: { dreamId },
      relations: ['themes', 'emotions', 'figures', 'locations', 'symbols', 'objects'],
    });
  }

  async getAnalysisSummary(
    dreamId: string,
  ): Promise<Pick<DreamAnalysis, 'status' | 'primaryTheme' | 'primaryEmotion' | 'emotionalIntensity'> | null> {
    return this.analysisRepo.findOne({
      where: { dreamId },
      select: ['status', 'primaryTheme', 'primaryEmotion', 'emotionalIntensity'],
    });
  }

  // ── private ─────────────────────────────────────────────────────────────────

  private async persist(dreamId: string, result: DreamAnalysisResult): Promise<void> {
    // Delete previous extraction rows before re-inserting (idempotent re-analysis)
    await Promise.all([
      this.themeRepo.delete({ dreamId }),
      this.emotionRepo.delete({ dreamId }),
      this.figureRepo.delete({ dreamId }),
      this.locationRepo.delete({ dreamId }),
      this.symbolRepo.delete({ dreamId }),
      this.objectRepo.delete({ dreamId }),
    ]);

    await Promise.all([
      result.themes.length    && this.themeRepo.save(result.themes.map((t) => ({ ...t, dreamId }))),
      result.emotions.length  && this.emotionRepo.save(result.emotions.map((e) => ({ ...e, dreamId }))),
      result.figures.length   && this.figureRepo.save(result.figures.map((f) => ({ ...f, dreamId }))),
      result.locations.length && this.locationRepo.save(result.locations.map((l) => ({ ...l, dreamId }))),
      result.symbols.length   && this.symbolRepo.save(result.symbols.map((s) => ({ ...s, dreamId }))),
      result.objects.length   && this.objectRepo.save(result.objects.map((o) => ({ ...o, dreamId }))),
    ]);

    await this.analysisRepo.update(
      { dreamId },
      {
        status:             AnalysisStatus.COMPLETED,
        modelVersion:       result.modelVersion,
        analyzedAt:         new Date(),
        failedAt:           null,
        failureReason:      null,
        // TypeORM JSONB column typing quirk: _QueryDeepPartialEntity doesn't accept Record directly
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rawResponse:        result.rawResponse as any,
        primaryTheme:       result.primaryTheme,
        primaryEmotion:     result.primaryEmotion,
        emotionalIntensity: result.emotionalIntensity,
        emotionalArc:       result.emotionalArc,
        residualEmotion:    result.residualEmotion,
      },
    );
  }
}
