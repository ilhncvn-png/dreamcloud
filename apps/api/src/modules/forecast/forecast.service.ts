import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// ── Exported types ──────────────────────────────────────────────────────────

export type TrendDir = 'Rising' | 'Stable' | 'Falling' | 'Exploding';

export interface TrendItem {
  name:          string;
  currentCount:  number;
  previousCount: number;
  changePercent: number;
  trend:         TrendDir;
}

export interface EmotionShift {
  emotion:       string;
  currentRatio:  number;
  previousRatio: number;
  delta:         number;
  trend:         TrendDir;
}

export interface CityForecastSummary {
  name:                string;
  slug:                string;
  country:             string | null;
  dreamCount:          number;
  previousDreamCount:  number;
  changePercent:       number;
  trend:               TrendDir;
  dominantEmotion:     string | null;
  lucidRatio:          number;
  nightmareRatio:      number;
  topThemes:           string[];
}

export interface DreamForecast {
  period:               'today' | 'week' | 'month';
  generatedAt:          string;
  totalDreams:          number;
  totalDreamers:        number;
  forecastScore:        number;
  dominantEmotion:      string | null;
  dominantMood:         string;
  lucidRatio:           number;
  nightmareRatio:       number;
  previousLucidRatio:   number;
  previousNightmareRatio: number;
  lucidDelta:           number;
  nightmareDelta:       number;
  lucidTrend:           TrendDir;
  nightmareTrend:       TrendDir;
  risingThemes:         TrendItem[];
  fallingThemes:        TrendItem[];
  risingSymbols:        TrendItem[];
  fallingSymbols:       TrendItem[];
  emotionalShifts:      EmotionShift[];
  cityForecasts:        CityForecastSummary[];
}

export interface CityForecastDetail extends CityForecastSummary {
  risingThemes:    TrendItem[];
  fallingThemes:   TrendItem[];
  emotionalShifts: EmotionShift[];
  topSymbols:      string[];
}

// ── Internal raw types ──────────────────────────────────────────────────────

interface RawStats {
  total_dreams:    string;
  total_dreamers:  string;
  lucid_count:     string;
  nightmare_count: string;
  prev_total:      string;
  prev_lucid:      string;
  prev_nightmare:  string;
  dominant_emotion: string | null;
}

interface RawTrendRow {
  name:          string;
  current_count: string;
  prev_count:    string;
}

interface RawEmotionRow {
  emotion:       string;
  current_ratio: string;
  prev_ratio:    string;
}

interface RawCityRow {
  name:             string;
  country:          string | null;
  current_count:    string;
  prev_count:       string;
  lucid_ratio:      string;
  nightmare_ratio:  string;
  dominant_emotion: string | null;
  top_themes:       string[] | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name.toLowerCase()
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function computeTrend(current: number, previous: number): { trend: TrendDir; changePercent: number } {
  if (current === 0 && previous === 0) return { trend: 'Stable', changePercent: 0 };
  if (previous === 0)                  return { trend: current >= 3 ? 'Exploding' : 'Rising', changePercent: 100 };
  const changePercent = Math.round(((current - previous) / previous) * 100);
  let trend: TrendDir;
  if (current >= 3 && changePercent >= 150) trend = 'Exploding';
  else if (changePercent >= 25)             trend = 'Rising';
  else if (changePercent <= -25)            trend = 'Falling';
  else                                      trend = 'Stable';
  return { trend, changePercent };
}

function computeRatioDelta(cur: number, prev: number): { delta: number; trend: TrendDir } {
  const delta = Math.round((cur - prev) * 10) / 10;
  let trend: TrendDir;
  if (delta >= 15)  trend = 'Exploding';
  else if (delta >= 5)  trend = 'Rising';
  else if (delta <= -5) trend = 'Falling';
  else                  trend = 'Stable';
  return { delta, trend };
}

function computeDominantMood(
  dominantEmotion: string | null,
  lucidRatio: number,
  nightmareRatio: number,
): string {
  if (nightmareRatio >= 45) return 'Kaotik';
  if (lucidRatio     >= 40) return 'Bilinçli';
  switch (dominantEmotion) {
    case 'joy': case 'love': case 'peace': case 'happiness': return 'Huzurlu';
    case 'wonder': case 'awe': case 'mystery':               return 'Gizemli';
    case 'fear': case 'anxiety': case 'dread':               return 'Gergin';
    case 'sadness': case 'grief':                            return 'Melankolik';
    case 'anger': case 'rage':                               return 'Tutuşmuş';
    default: return 'Nötr';
  }
}

function computeForecastScore(
  totalDreams: number,
  risingThemes: TrendItem[],
  risingSymbols: TrendItem[],
  lucidDelta: number,
  nightmareDelta: number,
): number {
  const activityScore   = Math.min(40, Math.log(totalDreams + 1) * 12);
  const trendScore      = Math.min(30, (risingThemes.length + risingSymbols.length) * 4);
  const volatilityScore = Math.min(20, Math.abs(lucidDelta) * 0.5 + Math.abs(nightmareDelta) * 0.3);
  const explosionBonus  = [...risingThemes, ...risingSymbols].filter(t => t.trend === 'Exploding').length * 5;
  return Math.min(100, Math.round(activityScore + trendScore + volatilityScore + explosionBonus));
}

function toTrendItems(rows: RawTrendRow[]): TrendItem[] {
  return rows.map((r) => {
    const current  = parseInt(r.current_count, 10);
    const previous = parseInt(r.prev_count, 10);
    const { trend, changePercent } = computeTrend(current, previous);
    return { name: r.name, currentCount: current, previousCount: previous, changePercent, trend };
  });
}

// ── Period intervals ────────────────────────────────────────────────────────

function getIntervals(period: 'today' | 'week' | 'month'): { cur: string; prev: string } {
  switch (period) {
    case 'today': return { cur: '1 day',   prev: '2 days'  };
    case 'week':  return { cur: '7 days',  prev: '14 days' };
    case 'month': return { cur: '30 days', prev: '60 days' };
  }
}

// ── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class ForecastService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  getToday():  Promise<DreamForecast> { return this.compute('today'); }
  getWeek():   Promise<DreamForecast> { return this.compute('week'); }
  getMonth():  Promise<DreamForecast> { return this.compute('month'); }

  // ── Main compute ──────────────────────────────────────────────────────────

  private async compute(period: 'today' | 'week' | 'month'): Promise<DreamForecast> {
    const { cur, prev } = getIntervals(period);

    const [statsRows, themeRows, symbolRows, emotionRows, cityRows] = await Promise.all([
      this.queryStats(cur, prev),
      this.queryTrends('dream_themes', 'theme',  cur, prev),
      this.queryTrends('dream_symbols', 'symbol_category',  cur, prev),
      this.queryEmotions(cur, prev),
      this.queryCities(cur, prev),
    ]);

    // Stats
    const s = statsRows[0] as RawStats | undefined;
    const totalDreams       = s ? parseInt(s.total_dreams, 10) : 0;
    const totalDreamers     = s ? parseInt(s.total_dreamers, 10) : 0;
    const lucidCount        = s ? parseInt(s.lucid_count, 10) : 0;
    const nightmareCount    = s ? parseInt(s.nightmare_count, 10) : 0;
    const prevTotal         = s ? parseInt(s.prev_total, 10) : 0;
    const prevLucid         = s ? parseInt(s.prev_lucid, 10) : 0;
    const prevNightmare     = s ? parseInt(s.prev_nightmare, 10) : 0;
    const dominantEmotion   = s?.dominant_emotion ?? null;

    const lucidRatio            = totalDreams > 0 ? Math.round((lucidCount / totalDreams) * 100 * 10) / 10 : 0;
    const nightmareRatio        = totalDreams > 0 ? Math.round((nightmareCount / totalDreams) * 100 * 10) / 10 : 0;
    const previousLucidRatio    = prevTotal > 0 ? Math.round((prevLucid / prevTotal) * 100 * 10) / 10 : 0;
    const previousNightmareRatio = prevTotal > 0 ? Math.round((prevNightmare / prevTotal) * 100 * 10) / 10 : 0;

    const lucidResult     = computeRatioDelta(lucidRatio, previousLucidRatio);
    const nightmareResult = computeRatioDelta(nightmareRatio, previousNightmareRatio);

    // Themes
    const allThemes     = toTrendItems(themeRows as RawTrendRow[]);
    const risingThemes  = allThemes.filter(t => t.trend === 'Rising' || t.trend === 'Exploding')
                                   .sort((a, b) => b.changePercent - a.changePercent)
                                   .slice(0, 8);
    const fallingThemes = allThemes.filter(t => t.trend === 'Falling')
                                   .sort((a, b) => a.changePercent - b.changePercent)
                                   .slice(0, 5);

    // Symbols
    const allSymbols     = toTrendItems(symbolRows as RawTrendRow[]);
    const risingSymbols  = allSymbols.filter(t => t.trend === 'Rising' || t.trend === 'Exploding')
                                     .sort((a, b) => b.changePercent - a.changePercent)
                                     .slice(0, 8);
    const fallingSymbols = allSymbols.filter(t => t.trend === 'Falling')
                                     .sort((a, b) => a.changePercent - b.changePercent)
                                     .slice(0, 5);

    // Emotions
    const emotionalShifts: EmotionShift[] = (emotionRows as RawEmotionRow[]).map((r) => {
      const currentRatio  = Math.round(parseFloat(r.current_ratio) * 10) / 10;
      const previousRatio = Math.round(parseFloat(r.prev_ratio) * 10) / 10;
      const { delta, trend } = computeRatioDelta(currentRatio, previousRatio);
      return { emotion: r.emotion, currentRatio, previousRatio, delta, trend };
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 8);

    // Cities
    const cityForecasts: CityForecastSummary[] = (cityRows as RawCityRow[]).map((r) => {
      const current  = parseInt(r.current_count, 10);
      const previous = parseInt(r.prev_count, 10);
      const { trend, changePercent } = computeTrend(current, previous);
      return {
        name:               r.name,
        slug:               toSlug(r.name),
        country:            r.country,
        dreamCount:         current,
        previousDreamCount: previous,
        changePercent,
        trend,
        dominantEmotion:    r.dominant_emotion,
        lucidRatio:         parseInt(r.lucid_ratio, 10),
        nightmareRatio:     parseInt(r.nightmare_ratio, 10),
        topThemes:          r.top_themes ?? [],
      };
    });

    const dominantMood  = computeDominantMood(dominantEmotion, lucidRatio, nightmareRatio);
    const forecastScore = computeForecastScore(totalDreams, risingThemes, risingSymbols, lucidResult.delta, nightmareResult.delta);

    return {
      period,
      generatedAt:            new Date().toISOString(),
      totalDreams,
      totalDreamers,
      forecastScore,
      dominantEmotion,
      dominantMood,
      lucidRatio,
      nightmareRatio,
      previousLucidRatio,
      previousNightmareRatio,
      lucidDelta:             lucidResult.delta,
      nightmareDelta:         nightmareResult.delta,
      lucidTrend:             lucidResult.trend,
      nightmareTrend:         nightmareResult.trend,
      risingThemes,
      fallingThemes,
      risingSymbols,
      fallingSymbols,
      emotionalShifts,
      cityForecasts,
    };
  }

  // ── City detail ───────────────────────────────────────────────────────────

  async getCityForecast(slug: string): Promise<CityForecastDetail | null> {
    const { cur, prev } = getIntervals('month');

    // Lookup city name from slug
    const nameRows = await this.ds.query<Array<{ name: string; country: string | null }>>(`
      SELECT DISTINCT dp.name, dp.country
      FROM dream_places dp
      WHERE LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        dp.name, 'ç','c'),'ğ','g'),'ı','i'),'ö','o'),'ş','s'),'ü','u')
      ) = LOWER(REPLACE($1, '-', ' '))
      LIMIT 1
    `, [slug]);

    if (nameRows.length === 0) return null;
    const cityName = (nameRows[0] as { name: string; country: string | null }).name;
    const country  = (nameRows[0] as { name: string; country: string | null }).country ?? null;

    const [statsRows, themeRows, symbolRows, emotionRows] = await Promise.all([
      this.ds.query<Array<{ cur_count: string; prev_count: string; lucid_ratio: string; nightmare_ratio: string; dominant_emotion: string | null }>>(`
        WITH cur_city AS (
          SELECT
            COUNT(DISTINCT dp.dream_id)::int       AS cur_count,
            COUNT(DISTINCT CASE WHEN d.category = 'lucid'     THEN d.id END)::int AS lucid_count,
            COUNT(DISTINCT CASE WHEN d.category = 'nightmare' THEN d.id END)::int AS nightmare_count
          FROM dream_places dp
          JOIN dreams d ON d.id = dp.dream_id
          WHERE dp.name = $1
            AND d.created_at >= NOW() - INTERVAL '${cur}'
            AND d.is_draft = false AND d.deleted_at IS NULL
        ),
        prev_city AS (
          SELECT COUNT(DISTINCT dp.dream_id)::int AS prev_count
          FROM dream_places dp
          JOIN dreams d ON d.id = dp.dream_id
          WHERE dp.name = $1
            AND d.created_at >= NOW() - INTERVAL '${prev}'
            AND d.created_at < NOW() - INTERVAL '${cur}'
            AND d.is_draft = false AND d.deleted_at IS NULL
        )
        SELECT
          cc.cur_count,
          COALESCE(pc.prev_count, 0) AS prev_count,
          CASE WHEN cc.cur_count > 0 THEN ROUND(cc.lucid_count::numeric / cc.cur_count * 100) ELSE 0 END AS lucid_ratio,
          CASE WHEN cc.cur_count > 0 THEN ROUND(cc.nightmare_count::numeric / cc.cur_count * 100) ELSE 0 END AS nightmare_ratio,
          (
            SELECT de.emotion FROM dream_emotions de
            JOIN dream_places dp2 ON dp2.dream_id = de.dream_id AND dp2.name = $1
            JOIN dreams d2 ON d2.id = dp2.dream_id
            WHERE d2.created_at >= NOW() - INTERVAL '${cur}'
              AND d2.is_draft = false AND d2.deleted_at IS NULL
            GROUP BY de.emotion ORDER BY COUNT(*) DESC LIMIT 1
          ) AS dominant_emotion
        FROM cur_city cc, prev_city pc
      `, [cityName]),

      this.ds.query<RawTrendRow[]>(`
        WITH cur AS (
          SELECT dt.theme AS name, COUNT(*)::int AS current_count
          FROM dream_themes dt JOIN dream_places dp ON dp.dream_id = dt.dream_id AND dp.name = $1
          JOIN dreams d ON d.id = dp.dream_id
          WHERE d.created_at >= NOW() - INTERVAL '${cur}' AND d.is_draft = false AND d.deleted_at IS NULL
          GROUP BY dt.theme
        ),
        prev AS (
          SELECT dt.theme AS name, COUNT(*)::int AS cnt
          FROM dream_themes dt JOIN dream_places dp ON dp.dream_id = dt.dream_id AND dp.name = $1
          JOIN dreams d ON d.id = dp.dream_id
          WHERE d.created_at >= NOW() - INTERVAL '${prev}' AND d.created_at < NOW() - INTERVAL '${cur}'
            AND d.is_draft = false AND d.deleted_at IS NULL
          GROUP BY dt.theme
        )
        SELECT c.name, c.current_count::text, COALESCE(p.cnt, 0)::text AS prev_count
        FROM cur c LEFT JOIN prev p ON p.name = c.name
        ORDER BY c.current_count DESC LIMIT 15
      `, [cityName]),

      this.ds.query<Array<{ name: string }>>(`
        SELECT ds.symbol_category AS name
        FROM dream_symbols ds JOIN dream_places dp ON dp.dream_id = ds.dream_id AND dp.name = $1
        JOIN dreams d ON d.id = dp.dream_id
        WHERE d.created_at >= NOW() - INTERVAL '${cur}' AND d.is_draft = false AND d.deleted_at IS NULL
        GROUP BY ds.symbol_category ORDER BY COUNT(*) DESC LIMIT 5
      `, [cityName]),

      this.ds.query<RawEmotionRow[]>(`
        WITH cur_total AS (
          SELECT GREATEST(COUNT(*)::float, 1) AS total FROM dreams d
          JOIN dream_places dp ON dp.dream_id = d.id AND dp.name = $1
          WHERE d.created_at >= NOW() - INTERVAL '${cur}' AND d.is_draft = false AND d.deleted_at IS NULL
        ),
        prev_total AS (
          SELECT GREATEST(COUNT(*)::float, 1) AS total FROM dreams d
          JOIN dream_places dp ON dp.dream_id = d.id AND dp.name = $1
          WHERE d.created_at >= NOW() - INTERVAL '${prev}' AND d.created_at < NOW() - INTERVAL '${cur}'
            AND d.is_draft = false AND d.deleted_at IS NULL
        ),
        cur_em AS (
          SELECT de.emotion, COUNT(*)::int AS cnt
          FROM dream_emotions de JOIN dream_places dp ON dp.dream_id = de.dream_id AND dp.name = $1
          JOIN dreams d ON d.id = dp.dream_id
          WHERE d.created_at >= NOW() - INTERVAL '${cur}' AND d.is_draft = false AND d.deleted_at IS NULL
          GROUP BY de.emotion
        ),
        prev_em AS (
          SELECT de.emotion, COUNT(*)::int AS cnt
          FROM dream_emotions de JOIN dream_places dp ON dp.dream_id = de.dream_id AND dp.name = $1
          JOIN dreams d ON d.id = dp.dream_id
          WHERE d.created_at >= NOW() - INTERVAL '${prev}' AND d.created_at < NOW() - INTERVAL '${cur}'
            AND d.is_draft = false AND d.deleted_at IS NULL
          GROUP BY de.emotion
        )
        SELECT
          c.emotion,
          ROUND((c.cnt / ct.total * 100)::numeric, 1)::text AS current_ratio,
          ROUND((COALESCE(p.cnt, 0) / pt.total * 100)::numeric, 1)::text AS prev_ratio
        FROM cur_em c CROSS JOIN cur_total ct CROSS JOIN prev_total pt
        LEFT JOIN prev_em p ON p.emotion = c.emotion
        ORDER BY c.cnt DESC LIMIT 8
      `, [cityName]),
    ]);

    const sr = statsRows[0] as { cur_count: string; prev_count: string; lucid_ratio: string; nightmare_ratio: string; dominant_emotion: string | null } | undefined;
    const curCount  = sr ? parseInt(sr.cur_count, 10) : 0;
    const prevCount = sr ? parseInt(sr.prev_count, 10) : 0;
    const { trend, changePercent } = computeTrend(curCount, prevCount);

    const allThemes      = toTrendItems(themeRows as RawTrendRow[]);
    const cityRisingThemes  = allThemes.filter(t => t.trend === 'Rising' || t.trend === 'Exploding').slice(0, 5);
    const cityFallingThemes = allThemes.filter(t => t.trend === 'Falling').slice(0, 3);

    const cityEmotionalShifts: EmotionShift[] = (emotionRows as RawEmotionRow[]).map((r) => {
      const currentRatio  = parseFloat(r.current_ratio);
      const previousRatio = parseFloat(r.prev_ratio);
      const { delta, trend: eTrend } = computeRatioDelta(currentRatio, previousRatio);
      return { emotion: r.emotion, currentRatio, previousRatio, delta, trend: eTrend };
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    return {
      name:               cityName,
      slug,
      country,
      dreamCount:         curCount,
      previousDreamCount: prevCount,
      changePercent,
      trend,
      dominantEmotion:    sr?.dominant_emotion ?? null,
      lucidRatio:         sr ? parseInt(sr.lucid_ratio, 10) : 0,
      nightmareRatio:     sr ? parseInt(sr.nightmare_ratio, 10) : 0,
      topThemes:          allThemes.slice(0, 3).map(t => t.name),
      topSymbols:         (symbolRows as Array<{ name: string }>).map(r => r.name),
      risingThemes:       cityRisingThemes,
      fallingThemes:      cityFallingThemes,
      emotionalShifts:    cityEmotionalShifts,
    };
  }

  // ── Private queries ───────────────────────────────────────────────────────

  private queryStats(cur: string, prev: string): Promise<unknown[]> {
    return this.ds.query(`
      WITH cur AS (
        SELECT
          COUNT(*)::int                                                            AS total_dreams,
          COUNT(DISTINCT d.user_id)::int                                           AS total_dreamers,
          COUNT(CASE WHEN d.category = 'lucid'     THEN 1 END)::int               AS lucid_count,
          COUNT(CASE WHEN d.category = 'nightmare' THEN 1 END)::int               AS nightmare_count
        FROM dreams d
        WHERE d.created_at >= NOW() - INTERVAL '${cur}'
          AND d.is_draft = false AND d.deleted_at IS NULL
      ),
      prev AS (
        SELECT
          COUNT(*)::int                                                            AS total_dreams,
          COUNT(CASE WHEN d.category = 'lucid'     THEN 1 END)::int               AS lucid_count,
          COUNT(CASE WHEN d.category = 'nightmare' THEN 1 END)::int               AS nightmare_count
        FROM dreams d
        WHERE d.created_at >= NOW() - INTERVAL '${prev}'
          AND d.created_at < NOW() - INTERVAL '${cur}'
          AND d.is_draft = false AND d.deleted_at IS NULL
      )
      SELECT
        cur.total_dreams,
        cur.total_dreamers,
        cur.lucid_count,
        cur.nightmare_count,
        prev.total_dreams   AS prev_total,
        prev.lucid_count    AS prev_lucid,
        prev.nightmare_count AS prev_nightmare,
        (
          SELECT de.emotion FROM dream_emotions de
          JOIN dreams d2 ON d2.id = de.dream_id
          WHERE d2.created_at >= NOW() - INTERVAL '${cur}'
            AND d2.is_draft = false AND d2.deleted_at IS NULL
          GROUP BY de.emotion ORDER BY COUNT(*) DESC LIMIT 1
        ) AS dominant_emotion
      FROM cur, prev
    `);
  }

  private queryTrends(table: string, col: string, cur: string, prev: string): Promise<unknown[]> {
    return this.ds.query(`
      WITH cur_t AS (
        SELECT t.${col} AS name, COUNT(*)::int AS current_count
        FROM ${table} t
        JOIN dreams d ON d.id = t.dream_id
        WHERE d.created_at >= NOW() - INTERVAL '${cur}'
          AND d.is_draft = false AND d.deleted_at IS NULL
          AND t.${col} IS NOT NULL
        GROUP BY t.${col}
      ),
      prev_t AS (
        SELECT t.${col} AS name, COUNT(*)::int AS cnt
        FROM ${table} t
        JOIN dreams d ON d.id = t.dream_id
        WHERE d.created_at >= NOW() - INTERVAL '${prev}'
          AND d.created_at < NOW() - INTERVAL '${cur}'
          AND d.is_draft = false AND d.deleted_at IS NULL
          AND t.${col} IS NOT NULL
        GROUP BY t.${col}
      )
      SELECT
        c.name,
        c.current_count::text,
        COALESCE(p.cnt, 0)::text AS prev_count
      FROM cur_t c
      LEFT JOIN prev_t p ON p.name = c.name
      ORDER BY c.current_count DESC
      LIMIT 20
    `);
  }

  private queryEmotions(cur: string, prev: string): Promise<unknown[]> {
    return this.ds.query(`
      WITH cur_total AS (
        SELECT GREATEST(COUNT(*)::float, 1) AS total
        FROM dreams d
        WHERE d.created_at >= NOW() - INTERVAL '${cur}'
          AND d.is_draft = false AND d.deleted_at IS NULL
      ),
      prev_total AS (
        SELECT GREATEST(COUNT(*)::float, 1) AS total
        FROM dreams d
        WHERE d.created_at >= NOW() - INTERVAL '${prev}'
          AND d.created_at < NOW() - INTERVAL '${cur}'
          AND d.is_draft = false AND d.deleted_at IS NULL
      ),
      cur_em AS (
        SELECT de.emotion, COUNT(*)::int AS cnt
        FROM dream_emotions de
        JOIN dreams d ON d.id = de.dream_id
        WHERE d.created_at >= NOW() - INTERVAL '${cur}'
          AND d.is_draft = false AND d.deleted_at IS NULL
        GROUP BY de.emotion
      ),
      prev_em AS (
        SELECT de.emotion, COUNT(*)::int AS cnt
        FROM dream_emotions de
        JOIN dreams d ON d.id = de.dream_id
        WHERE d.created_at >= NOW() - INTERVAL '${prev}'
          AND d.created_at < NOW() - INTERVAL '${cur}'
          AND d.is_draft = false AND d.deleted_at IS NULL
        GROUP BY de.emotion
      )
      SELECT
        c.emotion,
        ROUND((c.cnt / ct.total * 100)::numeric, 1)::text AS current_ratio,
        ROUND((COALESCE(p.cnt, 0) / pt.total * 100)::numeric, 1)::text AS prev_ratio
      FROM cur_em c
      CROSS JOIN cur_total ct
      CROSS JOIN prev_total pt
      LEFT JOIN prev_em p ON p.emotion = c.emotion
      ORDER BY c.cnt DESC
      LIMIT 10
    `);
  }

  private queryCities(cur: string, prev: string): Promise<unknown[]> {
    return this.ds.query(`
      WITH cur_cities AS (
        SELECT
          dp.name,
          MAX(dp.country) AS country,
          COUNT(DISTINCT dp.dream_id)::int AS current_count,
          CASE WHEN COUNT(DISTINCT dp.dream_id) > 0
            THEN ROUND(100.0 * COUNT(DISTINCT CASE WHEN d.category = 'lucid' THEN d.id END) / COUNT(DISTINCT d.id))
            ELSE 0 END::int AS lucid_ratio,
          CASE WHEN COUNT(DISTINCT dp.dream_id) > 0
            THEN ROUND(100.0 * COUNT(DISTINCT CASE WHEN d.category = 'nightmare' THEN d.id END) / COUNT(DISTINCT d.id))
            ELSE 0 END::int AS nightmare_ratio
        FROM dream_places dp
        JOIN dreams d ON d.id = dp.dream_id
        WHERE d.created_at >= NOW() - INTERVAL '${cur}'
          AND d.is_draft = false AND d.deleted_at IS NULL
        GROUP BY dp.name
      ),
      prev_cities AS (
        SELECT dp.name, COUNT(DISTINCT dp.dream_id)::int AS prev_count
        FROM dream_places dp
        JOIN dreams d ON d.id = dp.dream_id
        WHERE d.created_at >= NOW() - INTERVAL '${prev}'
          AND d.created_at < NOW() - INTERVAL '${cur}'
          AND d.is_draft = false AND d.deleted_at IS NULL
        GROUP BY dp.name
      )
      SELECT
        c.name,
        c.country,
        c.current_count::text,
        COALESCE(p.prev_count, 0)::text AS prev_count,
        c.lucid_ratio::text,
        c.nightmare_ratio::text,
        (
          SELECT de.emotion FROM dream_emotions de
          JOIN dream_places dp2 ON dp2.dream_id = de.dream_id AND dp2.name = c.name
          JOIN dreams d2 ON d2.id = dp2.dream_id
          WHERE d2.created_at >= NOW() - INTERVAL '${cur}'
            AND d2.is_draft = false AND d2.deleted_at IS NULL
          GROUP BY de.emotion ORDER BY COUNT(*) DESC LIMIT 1
        ) AS dominant_emotion,
        ARRAY(
          SELECT dt.theme FROM dream_themes dt
          JOIN dream_places dp3 ON dp3.dream_id = dt.dream_id AND dp3.name = c.name
          JOIN dreams d3 ON d3.id = dp3.dream_id
          WHERE d3.created_at >= NOW() - INTERVAL '${cur}'
            AND d3.is_draft = false AND d3.deleted_at IS NULL
          GROUP BY dt.theme ORDER BY COUNT(*) DESC LIMIT 3
        ) AS top_themes
      FROM cur_cities c
      LEFT JOIN prev_cities p ON p.name = c.name
      ORDER BY c.current_count DESC
      LIMIT 8
    `);
  }
}
