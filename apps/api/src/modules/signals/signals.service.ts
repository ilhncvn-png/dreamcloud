import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { type SignalItemDto, type SignalsResponseDto, type TrendDirection } from './dto/signals-response.dto';

type Period = '24h' | '7d' | '30d';

interface PeriodBounds {
  from:     Date;
  prevFrom: Date;
  prevTo:   Date;
  label:    string;
}

interface RawCount { name: string; count: string }

// ── Helpers ──────────────────────────────────────────────────────────────────

function periodBounds(period: Period): PeriodBounds {
  const now  = new Date();
  switch (period) {
    case '24h': {
      const from     = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const prevFrom = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      return { from, prevFrom, prevTo: from, label: 'Son 24 Saat' };
    }
    case '7d': {
      const from     = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
      const prevFrom = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      return { from, prevFrom, prevTo: from, label: 'Son 7 Gün' };
    }
    case '30d':
    default: {
      const from     = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const prevFrom = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      return { from, prevFrom, prevTo: from, label: 'Son 30 Gün' };
    }
  }
}

function trend(curr: number, prev: number): { trend: TrendDirection; trendPct: number } {
  if (prev === 0) return { trend: curr > 0 ? 'new' : 'stable', trendPct: 0 };
  const pct = Math.round((curr / prev - 1) * 100);
  if (pct > 10)  return { trend: 'rising',  trendPct: pct };
  if (pct < -10) return { trend: 'falling', trendPct: pct };
  return { trend: 'stable', trendPct: 0 };
}

function mergeWithTrend(current: RawCount[], previous: RawCount[]): SignalItemDto[] {
  const prevMap = new Map(previous.map((r) => [r.name, parseInt(r.count, 10)]));
  return current.map((r) => {
    const curr = parseInt(r.count, 10);
    const prev = prevMap.get(r.name) ?? 0;
    const { trend: t, trendPct } = trend(curr, prev);
    return { name: r.name, count: curr, trend: t, trendPct };
  });
}

// ── Service ───────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const LIMIT = 10;

@Injectable()
export class SignalsService {
  private readonly logger = new Logger(SignalsService.name);
  private readonly cache = new Map<Period, { data: SignalsResponseDto; expiresAt: number }>();

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getSignals(period: Period): Promise<SignalsResponseDto> {
    const cached = this.cache.get(period);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const data = await this.compute(period);
    this.cache.set(period, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    this.logger.log(`Signals computed for ${period}: ${data.dreamCount} dreams`);
    return data;
  }

  invalidateCache(): void {
    this.cache.clear();
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async compute(period: Period): Promise<SignalsResponseDto> {
    const { from, prevFrom, prevTo, label } = periodBounds(period);

    const [dreamCount, themes, emotions, symbols, locations, archetypes] = await Promise.all([
      this.countDreams(from),
      this.aggregate('dream_themes',    'theme',             from, prevFrom, prevTo),
      this.aggregate('dream_emotions',  'emotion',           from, prevFrom, prevTo),
      this.aggregate('dream_symbols',   'symbol_category',   from, prevFrom, prevTo),
      this.aggregate('dream_locations', 'name',              from, prevFrom, prevTo),
      this.aggregateArchetypes(from, prevFrom, prevTo),
    ]);

    return {
      period,
      periodLabel: label,
      dreamCount,
      generatedAt: new Date().toISOString(),
      themes,
      emotions,
      symbols,
      locations,
      archetypes,
    };
  }

  private async countDreams(from: Date): Promise<number> {
    const [row]: [{ cnt: string }] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS cnt
       FROM dreams d
       WHERE d.is_draft = false
         AND d.deleted_at IS NULL
         AND d.created_at >= $1`,
      [from],
    );
    return parseInt(row?.cnt ?? '0', 10);
  }

  private async aggregate(
    table: string,
    column: string,
    from: Date,
    prevFrom: Date,
    prevTo: Date,
  ): Promise<SignalItemDto[]> {
    const currSql = `
      SELECT t."${column}" AS name, COUNT(*)::int AS count
      FROM "${table}" t
      JOIN dream_analyses da ON da.dream_id = t.dream_id
      JOIN dreams d ON d.id = t.dream_id
      WHERE da.status = 'completed'
        AND d.created_at >= $1
        AND d.is_draft = false
        AND d.deleted_at IS NULL
        AND t."${column}" IS NOT NULL
      GROUP BY t."${column}"
      ORDER BY count DESC
      LIMIT ${LIMIT}
    `;

    const current: RawCount[] = await this.dataSource.query(currSql, [from]);
    if (current.length === 0) return [];

    const names = current.map((r) => r.name);
    const prevSql = `
      SELECT t."${column}" AS name, COUNT(*)::int AS count
      FROM "${table}" t
      JOIN dream_analyses da ON da.dream_id = t.dream_id
      JOIN dreams d ON d.id = t.dream_id
      WHERE da.status = 'completed'
        AND d.created_at >= $1 AND d.created_at < $2
        AND d.is_draft = false
        AND d.deleted_at IS NULL
        AND t."${column}" = ANY($3)
      GROUP BY t."${column}"
    `;

    const previous: RawCount[] = await this.dataSource.query(prevSql, [prevFrom, prevTo, names]);
    return mergeWithTrend(current, previous);
  }

  private async aggregateArchetypes(from: Date, prevFrom: Date, prevTo: Date): Promise<SignalItemDto[]> {
    const currSql = `
      SELECT f.archetype_candidate AS name, COUNT(*)::int AS count
      FROM dream_figures f
      JOIN dream_analyses da ON da.dream_id = f.dream_id
      JOIN dreams d ON d.id = f.dream_id
      WHERE da.status = 'completed'
        AND d.created_at >= $1
        AND d.is_draft = false
        AND d.deleted_at IS NULL
        AND f.archetype_candidate IS NOT NULL
      GROUP BY f.archetype_candidate
      ORDER BY count DESC
      LIMIT ${LIMIT}
    `;

    const current: RawCount[] = await this.dataSource.query(currSql, [from]);
    if (current.length === 0) return [];

    const names = current.map((r) => r.name);
    const prevSql = `
      SELECT f.archetype_candidate AS name, COUNT(*)::int AS count
      FROM dream_figures f
      JOIN dream_analyses da ON da.dream_id = f.dream_id
      JOIN dreams d ON d.id = f.dream_id
      WHERE da.status = 'completed'
        AND d.created_at >= $1 AND d.created_at < $2
        AND d.is_draft = false
        AND d.deleted_at IS NULL
        AND f.archetype_candidate = ANY($3)
      GROUP BY f.archetype_candidate
    `;

    const previous: RawCount[] = await this.dataSource.query(prevSql, [prevFrom, prevTo, names]);
    return mergeWithTrend(current, previous);
  }
}
