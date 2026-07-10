import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  type CollectivePatternDto, type DreamTraceDto, type DreamWeatherDto,
  type SignalType, type TraceDetailDto, type TraceSignalDto,
  type TraceType, type TrendDirection,
} from './dto/weather.dto';
import {
  computeActivityLevel, generatePatternBody, generatePatternHeadline,
  generateSignalBody, generateSignalHeadline, generateTraceNarrative,
  generateTraceWhyImportant, generateWeatherDescription, generateWeatherSummary,
  generateWeatherTitle, getLabel,
} from './weather.language';

// ── Internal types ─────────────────────────────────────────────────────────────

interface RawDimension { name: string; active_dreams: string; active_users: string }
interface RawCount     { name: string; count: string }
interface RawTotals    { dream_count: string; dreamer_count: string }
interface RawPattern   { name1: string; type1: string; name2: string; type2: string; co_count: string }
interface RawExcerpt   { dream_id: string; excerpt: string; created_at: string }
interface RawAssoc     { name: string; count: string }

// ── Constants ─────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 10 * 60 * 1000;
const LIMIT        = 15;

const TRACE_TABLE: Record<string, { table: string; column: string }> = {
  theme:     { table: 'dream_themes',    column: 'theme' },
  emotion:   { table: 'dream_emotions',  column: 'emotion' },
  symbol:    { table: 'dream_symbols',   column: 'symbol_category' },
  location:  { table: 'dream_locations', column: 'name' },
  archetype: { table: 'dream_figures',   column: 'archetype_candidate' },
  figure:    { table: 'dream_figures',   column: 'archetype_candidate' },
};

const ASSOC_TABLE: Record<string, { table: string; column: string }> = {
  emotion:   { table: 'dream_emotions', column: 'emotion' },
  theme:     { table: 'dream_themes',   column: 'theme' },
  archetype: { table: 'dream_figures',  column: 'archetype_candidate' },
};

// ── Scoring (Phase 3) ─────────────────────────────────────────────────────────

function computeScore(
  currentCount:  number,
  previousCount: number,
  activeUsers:   number,
  totalDreams:   number,
  totalDreamers: number,
): { traceScore: number; growthPercent: number; trendDirection: TrendDirection } {
  let growthPercent = 0;
  if (previousCount === 0 && currentCount > 0) growthPercent = 100;
  else if (previousCount > 0)
    growthPercent = Math.round((currentCount / previousCount - 1) * 100);

  const trendDirection: TrendDirection =
    growthPercent > 10 ? 'rising' : growthPercent < -10 ? 'falling' : 'stable';

  const freqScore      = Math.min(35, Math.round(totalDreams > 0 ? (currentCount / totalDreams) * 350 : 0));
  let   growthScore    = 0;
  if (previousCount === 0 && currentCount > 0) growthScore = 20;
  else if (previousCount > 0)
    growthScore = Math.min(25, Math.max(0, Math.round(growthPercent * 0.25)));
  const diversityScore = Math.min(20, Math.round(totalDreamers > 0 ? (activeUsers / totalDreamers) * 100 : 0));
  const recencyScore   = currentCount >= 5 ? 10 : currentCount >= 2 ? 5 : 2;
  const traceScore     = Math.min(100, freqScore + growthScore + diversityScore + recencyScore + 10);

  return { traceScore, growthPercent, trendDirection };
}

// ── Signal detection (Phase 2) ────────────────────────────────────────────────

function detectSignal(
  trace:         DreamTraceDto,
  totalDreamers: number,
  allTraces:     DreamTraceDto[],
): SignalType | null {
  const { currentCount, previousCount, growthPercent, traceScore, activeUsers } = trace;
  const adoptionRate = totalDreamers > 0 ? activeUsers / totalDreamers : 0;

  if (adoptionRate >= 0.3 && currentCount >= 5) return 'global';
  const betterCount = allTraces.filter(t => t.traceScore > traceScore).length;
  if (traceScore >= 55 && currentCount >= 5 && betterCount < 3) return 'dominant';
  if (growthPercent >= 50 && previousCount <= 10 && currentCount >= 2 && traceScore >= 35)
    return 'emerging';
  if (currentCount <= 3 && currentCount > 0 && previousCount === 0 && traceScore >= 25)
    return 'rare';
  if (growthPercent <= -30 && previousCount >= 5) return 'fading';
  return null;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly cache  = new Map<string, { data: DreamWeatherDto; expiresAt: number }>();

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async getWeatherNow(): Promise<DreamWeatherDto> {
    const hit = this.cache.get('now');
    if (hit && hit.expiresAt > Date.now()) return hit.data;
    const data = await this.compute();
    this.cache.set('now', { data, expiresAt: Date.now() + CACHE_TTL_MS });
    this.logger.log(
      `Dream Weather: ${data.totalDreams} dreams, ${data.signals.length} signals, ${data.patterns.length} patterns`,
    );
    return data;
  }

  async getTraceDetail(type: string, name: string): Promise<TraceDetailDto> {
    if (!TRACE_TABLE[type]) throw new NotFoundException(`Unknown trace type: ${type}`);

    const weather = await this.getWeatherNow();
    const trace   = weather.topTraces.find(t => t.type === type && t.name === name)
      ?? await this.buildMinimalTrace(type as TraceType, name);

    if (!trace) throw new NotFoundException(`No recent trace data for ${type}:${name}`);

    const signal = weather.signals.find(s => s.traceType === type && s.traceName === name) ?? null;

    const [excerpts, emotions, themes, archetypes] = await Promise.all([
      this.fetchExcerpts(type as TraceType, name),
      this.fetchAssociated(type as TraceType, name, 'emotion'),
      this.fetchAssociated(type as TraceType, name, 'theme'),
      this.fetchAssociated(type as TraceType, name, 'archetype'),
    ]);

    return {
      trace,
      signal,
      narrative:            generateTraceNarrative(trace),
      whyImportant:         generateTraceWhyImportant(trace, signal?.type ?? null),
      associatedEmotions:   emotions,
      associatedThemes:     themes,
      associatedArchetypes: archetypes,
      recentDreamExcerpts:  excerpts,
    };
  }

  // ── Private: Core computation ─────────────────────────────────────────────

  private async compute(): Promise<DreamWeatherDto> {
    const now         = new Date();
    const from        = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const prevFrom    = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const generatedAt = now.toISOString();

    // Phase 1: Aggregate all dimensions in parallel
    const [totals, themeRaw, emotionRaw, symbolRaw, locationRaw, archetypeRaw, patternRaw] =
      await Promise.all([
        this.countTotals(from),
        this.aggregateDim('dream_themes',    'theme',               from, prevFrom),
        this.aggregateDim('dream_emotions',  'emotion',             from, prevFrom),
        this.aggregateDim('dream_symbols',   'symbol_category',     from, prevFrom),
        this.aggregateDim('dream_locations', 'name',                from, prevFrom),
        this.aggregateDim('dream_figures',   'archetype_candidate', from, prevFrom),
        this.fetchPatterns(from),
      ]);

    const { totalDreams, totalDreamers } = totals;

    const mkTraces = (raw: Array<RawDimension & { prev_count: string }>, type: TraceType) =>
      raw.map(r => this.buildTrace(r, type, totalDreams, totalDreamers, generatedAt));

    // Phase 3: Build scored traces, sort by traceScore desc
    const allTraces = [
      ...mkTraces(themeRaw,     'theme'),
      ...mkTraces(emotionRaw,   'emotion'),
      ...mkTraces(symbolRaw,    'symbol'),
      ...mkTraces(locationRaw,  'location'),
      ...mkTraces(archetypeRaw, 'archetype'),
    ].sort((a, b) => b.traceScore - a.traceScore);

    const topTraces = allTraces.slice(0, 12);

    // Phase 2: Detect signals from all traces
    const signals: TraceSignalDto[] = [];
    for (const trace of allTraces) {
      const st = detectSignal(trace, totalDreamers, allTraces);
      if (!st) continue;
      const label = getLabel(trace.type, trace.name);
      signals.push({
        id:         `${trace.type}:${trace.name}:${st}`,
        type:       st,
        traceId:    trace.id,
        traceName:  trace.name,
        traceType:  trace.type,
        traceLabel: label,
        headline:   generateSignalHeadline(label, st),
        body:       generateSignalBody(label, st, trace),
        strength:   trace.traceScore,
      });
    }

    // Phase 8: Collective co-occurrence patterns
    const patterns = this.buildPatterns(patternRaw);

    // Phase 4: Dream Weather composition
    const dominantSignal = signals.find(s => s.type === 'dominant' || s.type === 'global');
    const dominantTrace  = dominantSignal
      ? (allTraces.find(t => t.id === dominantSignal.traceId) ?? null)
      : (allTraces[0] ?? null);

    const activityLevel = computeActivityLevel(totalDreams, signals.length);

    // Phase 5: Turkish language generation
    const weatherTitle       = generateWeatherTitle(dominantTrace, totalDreams);
    const weatherSummary     = generateWeatherSummary(topTraces, signals, totalDreams, totalDreamers);
    const weatherDescription = generateWeatherDescription(activityLevel, dominantTrace);

    return {
      generatedAt, period: '24h',
      totalDreams, totalDreamers,
      weatherTitle, weatherSummary, weatherDescription,
      activityLevel, dominantTrace, topTraces, signals, patterns,
    };
  }

  // ── Private: DB queries ───────────────────────────────────────────────────

  private async countTotals(from: Date): Promise<{ totalDreams: number; totalDreamers: number }> {
    const [row]: [RawTotals] = await this.ds.query(
      `SELECT
         COUNT(DISTINCT d.id)::int      AS dream_count,
         COUNT(DISTINCT d.user_id)::int AS dreamer_count
       FROM dreams d
       JOIN dream_analyses da ON da.dream_id = d.id AND da.status = 'completed'
       WHERE d.is_draft = false AND d.deleted_at IS NULL AND d.created_at >= $1`,
      [from],
    );
    return {
      totalDreams:   parseInt(row?.dream_count   ?? '0', 10),
      totalDreamers: parseInt(row?.dreamer_count  ?? '0', 10),
    };
  }

  private async aggregateDim(
    table:    string,
    column:   string,
    from:     Date,
    prevFrom: Date,
  ): Promise<Array<RawDimension & { prev_count: string }>> {
    const rows: RawDimension[] = await this.ds.query(
      `SELECT
         t."${column}"                   AS name,
         COUNT(DISTINCT t.dream_id)::int AS active_dreams,
         COUNT(DISTINCT d.user_id)::int  AS active_users
       FROM "${table}" t
       JOIN dream_analyses da ON da.dream_id = t.dream_id AND da.status = 'completed'
       JOIN dreams d ON d.id = t.dream_id
       WHERE d.created_at >= $1
         AND d.is_draft = false
         AND d.deleted_at IS NULL
         AND t."${column}" IS NOT NULL
       GROUP BY t."${column}"
       ORDER BY active_dreams DESC
       LIMIT ${LIMIT}`,
      [from],
    );
    if (rows.length === 0) return [];

    const names   = rows.map(r => r.name);
    const prev: RawCount[] = await this.ds.query(
      `SELECT t."${column}" AS name, COUNT(*)::int AS count
       FROM "${table}" t
       JOIN dream_analyses da ON da.dream_id = t.dream_id AND da.status = 'completed'
       JOIN dreams d ON d.id = t.dream_id
       WHERE d.created_at >= $1 AND d.created_at < $2
         AND d.is_draft = false AND d.deleted_at IS NULL
         AND t."${column}" = ANY($3)
       GROUP BY t."${column}"`,
      [prevFrom, from, names],
    );
    const prevMap = new Map(prev.map(r => [r.name, r.count]));
    return rows.map(r => ({ ...r, prev_count: prevMap.get(r.name) ?? '0' }));
  }

  // Phase 8: Co-occurrence pattern queries
  private async fetchPatterns(from: Date): Promise<RawPattern[]> {
    const [themeEmotion, themeSymbol] = await Promise.all([
      this.ds.query<RawPattern[]>(
        `SELECT
           dt.theme      AS name1, 'theme'   AS type1,
           de.emotion    AS name2, 'emotion' AS type2,
           COUNT(*)::int AS co_count
         FROM dream_themes dt
         JOIN dream_emotions de  ON de.dream_id = dt.dream_id
         JOIN dream_analyses da  ON da.dream_id = dt.dream_id AND da.status = 'completed'
         JOIN dreams d           ON d.id = dt.dream_id
         WHERE d.is_draft = false AND d.deleted_at IS NULL AND d.created_at >= $1
           AND dt.theme IS NOT NULL AND de.emotion IS NOT NULL
         GROUP BY dt.theme, de.emotion
         HAVING COUNT(*) >= 2
         ORDER BY co_count DESC
         LIMIT 4`,
        [from],
      ),
      this.ds.query<RawPattern[]>(
        `SELECT
           dt.theme           AS name1, 'theme'  AS type1,
           ds.symbol_category AS name2, 'symbol' AS type2,
           COUNT(*)::int      AS co_count
         FROM dream_themes dt
         JOIN dream_symbols ds  ON ds.dream_id = dt.dream_id
         JOIN dream_analyses da ON da.dream_id = dt.dream_id AND da.status = 'completed'
         JOIN dreams d          ON d.id = dt.dream_id
         WHERE d.is_draft = false AND d.deleted_at IS NULL AND d.created_at >= $1
           AND dt.theme IS NOT NULL AND ds.symbol_category IS NOT NULL
         GROUP BY dt.theme, ds.symbol_category
         HAVING COUNT(*) >= 2
         ORDER BY co_count DESC
         LIMIT 4`,
        [from],
      ),
    ]);
    return [...themeEmotion, ...themeSymbol]
      .sort((a, b) => parseInt(b.co_count, 10) - parseInt(a.co_count, 10))
      .slice(0, 5);
  }

  // ── Private: TraceDetail helpers ─────────────────────────────────────────

  private async fetchExcerpts(
    type: TraceType,
    name: string,
  ): Promise<Array<{ dreamId: string; excerpt: string; createdAt: string }>> {
    const cfg = TRACE_TABLE[type];
    if (!cfg) return [];
    const rows: RawExcerpt[] = await this.ds.query(
      `SELECT d.id AS dream_id,
              SUBSTRING(d.content, 1, 150) AS excerpt,
              d.created_at::text           AS created_at
       FROM "${cfg.table}" t
       JOIN dreams d ON d.id = t.dream_id
       WHERE t."${cfg.column}" = $1
         AND d.deleted_at IS NULL AND d.is_draft = false
         AND d.created_at >= NOW() - INTERVAL '7 days'
       ORDER BY d.created_at DESC
       LIMIT 3`,
      [name],
    );
    return rows.map(r => ({ dreamId: r.dream_id, excerpt: r.excerpt ?? '', createdAt: r.created_at }));
  }

  private async fetchAssociated(
    type:      TraceType,
    name:      string,
    assocType: 'emotion' | 'theme' | 'archetype',
  ): Promise<Array<{ name: string; label: string; count: number }>> {
    if (type === assocType) return [];
    const src   = TRACE_TABLE[type];
    const assoc = ASSOC_TABLE[assocType];
    if (!src || !assoc) return [];

    const rows: RawAssoc[] = await this.ds.query(
      `SELECT a."${assoc.column}" AS name, COUNT(*)::int AS count
       FROM "${assoc.table}" a
       JOIN "${src.table}" s ON s.dream_id = a.dream_id AND s."${src.column}" = $1
       JOIN dreams d ON d.id = a.dream_id
       WHERE d.deleted_at IS NULL AND d.is_draft = false
         AND d.created_at >= NOW() - INTERVAL '7 days'
         AND a."${assoc.column}" IS NOT NULL
       GROUP BY a."${assoc.column}"
       ORDER BY count DESC
       LIMIT 5`,
      [name],
    );
    return rows.map(r => ({
      name:  r.name,
      label: getLabel(assocType as TraceType, r.name),
      count: parseInt(r.count, 10),
    }));
  }

  private async buildMinimalTrace(type: TraceType, name: string): Promise<DreamTraceDto | null> {
    const cfg  = TRACE_TABLE[type];
    if (!cfg) return null;
    const from = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const rows: Array<{ active_dreams: string; active_users: string }> = await this.ds.query(
      `SELECT COUNT(DISTINCT t.dream_id)::int AS active_dreams,
              COUNT(DISTINCT d.user_id)::int  AS active_users
       FROM "${cfg.table}" t
       JOIN dreams d ON d.id = t.dream_id
       WHERE t."${cfg.column}" = $1
         AND d.deleted_at IS NULL AND d.is_draft = false
         AND d.created_at >= $2`,
      [name, from],
    );

    const activeDreams = parseInt(rows[0]?.active_dreams ?? '0', 10);
    if (activeDreams === 0) return null;
    const activeUsers  = parseInt(rows[0]?.active_users  ?? '0', 10);
    const generatedAt  = new Date().toISOString();
    const { traceScore, growthPercent, trendDirection } =
      computeScore(activeDreams, 0, activeUsers, activeDreams, activeUsers);

    return {
      id:              `${type}:${name}`,
      type, name,
      label:           getLabel(type, name),
      currentCount:    activeDreams,
      previousCount:   0,
      growthPercent,
      activeDreams,
      activeUsers,
      trendDirection,
      traceScore,
      confidenceScore: 10,
      timeframe:       '24h',
      generatedAt,
    };
  }

  // ── Private: Builders ─────────────────────────────────────────────────────

  private buildTrace(
    raw:           RawDimension & { prev_count: string },
    type:          TraceType,
    totalDreams:   number,
    totalDreamers: number,
    generatedAt:   string,
  ): DreamTraceDto {
    const activeDreams  = parseInt(raw.active_dreams, 10);
    const activeUsers   = parseInt(raw.active_users,  10);
    const previousCount = parseInt(raw.prev_count,    10);
    const { traceScore, growthPercent, trendDirection } =
      computeScore(activeDreams, previousCount, activeUsers, totalDreams, totalDreamers);

    return {
      id:              `${type}:${raw.name}`,
      type,
      name:            raw.name,
      label:           getLabel(type, raw.name),
      currentCount:    activeDreams,
      previousCount,
      growthPercent,
      activeDreams,
      activeUsers,
      trendDirection,
      traceScore,
      confidenceScore: 10,
      timeframe:       '24h',
      generatedAt,
    };
  }

  private buildPatterns(raw: RawPattern[]): CollectivePatternDto[] {
    return raw.map(r => {
      const t1    = r.type1 as TraceType;
      const t2    = r.type2 as TraceType;
      const l1    = getLabel(t1, r.name1);
      const l2    = getLabel(t2, r.name2);
      const count = parseInt(r.co_count, 10);
      return {
        id:       `${r.type1}:${r.name1}+${r.type2}:${r.name2}`,
        element1: { type: t1, name: r.name1, label: l1 },
        element2: { type: t2, name: r.name2, label: l2 },
        count,
        headline: generatePatternHeadline(l1, l2),
        body:     generatePatternBody(l1, l2, count),
        strength: Math.min(100, count * 15),
      };
    });
  }
}
