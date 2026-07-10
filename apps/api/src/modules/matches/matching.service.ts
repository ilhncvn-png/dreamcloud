import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalysisStatus } from '../../common/enums/database.enums';
import { DreamNotificationService } from '../notifications/dream-notification.service';
import { Dream } from '../dreams/entities/dream.entity';
import { DreamAnalysis } from '../analysis/entities/dream-analysis.entity';
import { DreamTheme } from '../analysis/entities/dream-theme.entity';
import { DreamEmotion } from '../analysis/entities/dream-emotion.entity';
import { DreamSymbol } from '../analysis/entities/dream-symbol.entity';
import { DreamLocation } from '../analysis/entities/dream-location.entity';
import { DreamFigure } from '../analysis/entities/dream-figure.entity';
import { DreamMatch } from './entities/dream-match.entity';
import { MatchEngineService, type DreamDimensions } from './match-engine.service';

export interface ConnectionSummary {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  topMatchScore: number;
  topResonanceLevel: string;
  sharedThemes: string[];
  sharedEmotions: string[];
  matchCount: number;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    @InjectRepository(DreamAnalysis)
    private readonly analysisRepo: Repository<DreamAnalysis>,

    @InjectRepository(DreamTheme)
    private readonly themeRepo: Repository<DreamTheme>,

    @InjectRepository(DreamEmotion)
    private readonly emotionRepo: Repository<DreamEmotion>,

    @InjectRepository(DreamSymbol)
    private readonly symbolRepo: Repository<DreamSymbol>,

    @InjectRepository(DreamLocation)
    private readonly locationRepo: Repository<DreamLocation>,

    @InjectRepository(DreamFigure)
    private readonly figureRepo: Repository<DreamFigure>,

    @InjectRepository(DreamMatch)
    private readonly matchRepo: Repository<DreamMatch>,

    @InjectRepository(Dream)
    private readonly dreamRepo: Repository<Dream>,

    private readonly engine: MatchEngineService,
    private readonly dreamNotif: DreamNotificationService,
  ) {}

  async computeAllMatches(): Promise<{ pairs: number }> {
    const analyses = await this.analysisRepo.find({
      where: { status: AnalysisStatus.COMPLETED },
      select: ['dreamId'],
    });

    const dreamIds = analyses.map((a) => a.dreamId);
    this.logger.log(`Computing matches across ${dreamIds.length} dreams...`);

    const dims = new Map<string, DreamDimensions>();
    for (const id of dreamIds) {
      const d = await this.loadDimensions(id);
      if (d) dims.set(id, d);
    }

    const ids = [...dims.keys()];
    let pairs = 0;

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const idI = ids[i] as string;
        const idJ = ids[j] as string;
        const a = dims.get(idI)!;
        const b = dims.get(idJ)!;
        if (a.userId === b.userId) continue;

        const result = this.engine.calculate(a, b);
        if (!result) continue;

        const [idA, idB]   = idI < idJ ? [idI, idJ] : [idJ, idI];
        const [uidA, uidB] = idI < idJ ? [a.userId, b.userId] : [b.userId, a.userId];

        await this.matchRepo.upsert(
          {
            dreamIdA: idA, dreamIdB: idB,
            userIdA: uidA, userIdB: uidB,
            matchScore:       result.matchScore,
            resonanceLevel:   result.resonanceLevel,
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

        pairs++;
      }
    }

    // Refresh matchCount on all dreams
    for (const id of ids) {
      const count = await this.matchRepo.count({
        where: [{ dreamIdA: id }, { dreamIdB: id }],
      });
      await this.dreamRepo.update({ id }, { matchCount: count });
    }

    this.logger.log(`Matching complete — ${pairs} pairs stored`);
    return { pairs };
  }

  async computeMatchesForDream(dreamId: string): Promise<number> {
    const sourceDims = await this.loadDimensions(dreamId);
    if (!sourceDims) return 0;

    const allAnalyses = await this.analysisRepo.find({
      where: { status: AnalysisStatus.COMPLETED },
      select: ['dreamId'],
    });

    let matched = 0;
    for (const { dreamId: otherId } of allAnalyses) {
      if (otherId === dreamId) continue;
      const otherDims = await this.loadDimensions(otherId);
      if (!otherDims || otherDims.userId === sourceDims.userId) continue;

      const result = this.engine.calculate(sourceDims, otherDims);
      if (!result) continue;

      const [idA, idB]   = dreamId < otherId ? [dreamId, otherId] : [otherId, dreamId];
      const [uidA, uidB] = dreamId < otherId
        ? [sourceDims.userId, otherDims.userId]
        : [otherDims.userId, sourceDims.userId];

      // Check before upsert to know if this is a new pair
      const existing = await this.matchRepo.findOne({
        where: { dreamIdA: idA, dreamIdB: idB },
        select: ['id'],
      });

      const saved = await this.matchRepo.save(
        this.matchRepo.create({
          dreamIdA: idA, dreamIdB: idB,
          userIdA: uidA, userIdB: uidB,
          matchScore:       result.matchScore,
          resonanceLevel:   result.resonanceLevel,
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
          ...(existing ? { id: existing.id } : {}),
        }),
      );

      // Fire notifications only on genuinely new matches
      if (!existing) {
        void this.dreamNotif.notifyNewMatch({
          matchId:        saved.id,
          userIdA:        uidA, dreamIdA: idA,
          userIdB:        uidB, dreamIdB: idB,
          resonanceLevel: result.resonanceLevel,
          matchScore:     result.matchScore,
          sharedSymbols:  result.sharedSymbols,
          sharedLocations: result.sharedLocations,
        });
      }

      matched++;
    }

    const count = await this.matchRepo.count({
      where: [{ dreamIdA: dreamId }, { dreamIdB: dreamId }],
    });
    await this.dreamRepo.update({ id: dreamId }, { matchCount: count });

    return matched;
  }

  async getMyMatches(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ matches: DreamMatch[]; total: number }> {
    const [matches, total] = await this.matchRepo
      .createQueryBuilder('m')
      .where('(m.userIdA = :uid OR m.userIdB = :uid)', { uid: userId })
      .leftJoinAndSelect('m.dreamA', 'da')
      .leftJoinAndSelect('da.user', 'ua')
      .leftJoinAndSelect('ua.profile', 'uap')
      .leftJoinAndSelect('m.dreamB', 'db')
      .leftJoinAndSelect('db.user', 'ub')
      .leftJoinAndSelect('ub.profile', 'ubp')
      .orderBy('m.matchScore', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { matches, total };
  }

  async getMatchesForDream(
    dreamId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ matches: DreamMatch[]; total: number }> {
    const [matches, total] = await this.matchRepo
      .createQueryBuilder('m')
      .where('(m.dreamIdA = :id OR m.dreamIdB = :id)', { id: dreamId })
      .leftJoinAndSelect('m.dreamA', 'da')
      .leftJoinAndSelect('da.user', 'ua')
      .leftJoinAndSelect('ua.profile', 'uap')
      .leftJoinAndSelect('m.dreamB', 'db')
      .leftJoinAndSelect('db.user', 'ub')
      .leftJoinAndSelect('ub.profile', 'ubp')
      .orderBy('m.matchScore', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { matches, total };
  }

  async getMyConnections(userId: string): Promise<ConnectionSummary[]> {
    const matches = await this.matchRepo
      .createQueryBuilder('m')
      .where('(m.userIdA = :uid OR m.userIdB = :uid)', { uid: userId })
      .leftJoinAndSelect('m.dreamA', 'da')
      .leftJoinAndSelect('da.user', 'ua')
      .leftJoinAndSelect('ua.profile', 'uap')
      .leftJoinAndSelect('m.dreamB', 'db')
      .leftJoinAndSelect('db.user', 'ub')
      .leftJoinAndSelect('ub.profile', 'ubp')
      .orderBy('m.matchScore', 'DESC')
      .getMany();

    const byUser = new Map<string, ConnectionSummary>();
    for (const m of matches) {
      const isA       = m.userIdA === userId;
      const otherId   = isA ? m.userIdB : m.userIdA;
      const otherUser = isA ? m.dreamB?.user : m.dreamA?.user;
      if (!otherUser) continue;

      if (!byUser.has(otherId)) {
        byUser.set(otherId, {
          userId:           otherId,
          username:         otherUser.username,
          displayName:      (otherUser as any).profile?.displayName ?? null,
          avatarUrl:        (otherUser as any).profile?.avatarUrl ?? null,
          topMatchScore:    m.matchScore,
          topResonanceLevel: m.resonanceLevel,
          sharedThemes:     m.sharedThemes,
          sharedEmotions:   m.sharedEmotions,
          matchCount:       0,
        });
      }
      byUser.get(otherId)!.matchCount++;
    }

    return [...byUser.values()].sort((a, b) => b.topMatchScore - a.topMatchScore);
  }

  async getMatchById(
    matchId: string,
  ): Promise<{ match: DreamMatch; sharedArchetypes: string[] } | null> {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: [
        'dreamA', 'dreamA.user', 'dreamA.user.profile',
        'dreamB', 'dreamB.user', 'dreamB.user.profile',
      ],
    });
    if (!match) return null;

    // Prefer stored sharedArchetypes; fall back to computing from figures for legacy rows
    let sharedArchetypes = match.sharedArchetypes ?? [];
    if (sharedArchetypes.length === 0) {
      const [figuresA, figuresB] = await Promise.all([
        this.figureRepo.find({ where: { dreamId: match.dreamIdA } }),
        this.figureRepo.find({ where: { dreamId: match.dreamIdB } }),
      ]);
      const archetypesA = new Set(
        figuresA.filter((f) => f.archetypeCandidate && (f.archetypeConfidence ?? 0) >= 0.5)
                .map((f) => f.archetypeCandidate as string),
      );
      const archetypesB = new Set(
        figuresB.filter((f) => f.archetypeCandidate && (f.archetypeConfidence ?? 0) >= 0.5)
                .map((f) => f.archetypeCandidate as string),
      );
      sharedArchetypes = [...archetypesA].filter((a) => archetypesB.has(a));
    }

    return { match, sharedArchetypes };
  }

  private async loadDimensions(dreamId: string): Promise<DreamDimensions | null> {
    const dream = await this.dreamRepo.findOne({
      where: { id: dreamId },
      select: ['id', 'userId', 'isDraft'],
    });
    if (!dream || dream.isDraft) return null;

    const analysisExists = await this.analysisRepo.count({
      where: { dreamId, status: AnalysisStatus.COMPLETED },
    });
    if (!analysisExists) return null;

    // Query extraction tables directly (TypeORM ManyToOne relation uses wrong join column)
    const [themes, emotions, symbols, locations] = await Promise.all([
      this.themeRepo.find({ where: { dreamId } }),
      this.emotionRepo.find({ where: { dreamId } }),
      this.symbolRepo.find({ where: { dreamId } }),
      this.locationRepo.find({ where: { dreamId } }),
    ]);

    const figures = await this.figureRepo.find({ where: { dreamId } });

    return {
      dreamId,
      userId:     dream.userId,
      themes:     themes.map((t) => t.theme).filter((v): v is string => v != null),
      emotions:   emotions.map((e) => e.emotion).filter((v): v is string => v != null),
      symbols:    symbols.map((s) => s.symbolCategory).filter((v): v is string => v != null),
      locations:  locations.map((l) => l.name).filter((v): v is string => v != null),
      archetypes: figures
        .filter((f) => f.archetypeCandidate && (f.archetypeConfidence ?? 0) >= 0.5)
        .map((f) => f.archetypeCandidate as string),
    };
  }
}
