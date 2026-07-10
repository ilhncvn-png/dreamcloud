import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// ── Response shapes ────────────────────────────────────────────────────────────

export interface AtlasEmotion  { emotion: string; count: number; percentage: number }
export interface AtlasArchetype { archetype: string; count: number }

export interface AtlasWorld {
  totalDreams:    number;
  totalDreamers:  number;
  totalPlaces:    number;
  totalClusters:  number;
  totalMatches:   number;
  lucidRatio:     number;
  nightmareRatio: number;
  beautifulRatio: number;
  topEmotions:    AtlasEmotion[];
  topArchetypes:  AtlasArchetype[];
  generatedAt:    string;
}

export interface AtlasPlace {
  name:       string;
  type:       string;
  country:    string | null;
  latitude:   number | null;
  longitude:  number | null;
  dreamCount: number;
  score:      number;
}

export interface AtlasSymbol {
  symbol:               string;
  count:                number;
  percentage:           number;
  universalCount:       number;
  exampleManifestation: string | null;
}

export type TrendDir = 'new' | 'rising' | 'stable' | 'falling';
export interface AtlasTrending {
  name:     string;
  count:    number;
  trend:    TrendDir;
  trendPct: number;
}

// ── Raw DB row types ───────────────────────────────────────────────────────────

interface RawWorld {
  total_dreams:    string;
  total_dreamers:  string;
  lucid_ratio:     string;
  nightmare_ratio: string;
  beautiful_ratio: string;
}
interface RawEmotion { emotion: string; count: string }
interface RawArchetype { archetype: string; count: string }
interface RawPlace {
  name:           string;
  type:           string;
  country:        string | null;
  latitude:       string | null;
  longitude:      string | null;
  dream_count:    string;
  score:          string | null;
}
interface RawSymbol {
  symbol:                string;
  count:                 string;
  universal_count:       string;
  example_manifestation: string | null;
}
interface RawCount { name: string; count: string }

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class AtlasService {
  constructor(
    @InjectDataSource()
    private readonly ds: DataSource,
  ) {}

  // ── World overview ──────────────────────────────────────────────────────────

  async getWorld(): Promise<AtlasWorld> {
    const [[raw], emotionRows, archetypeRows, placeCount, clusterCount, matchCount] =
      await Promise.all([
        this.ds.query<RawWorld[]>(`
          SELECT
            COUNT(DISTINCT d.id)::text                                           AS total_dreams,
            COUNT(DISTINCT d.user_id)::text                                      AS total_dreamers,
            ROUND(
              COUNT(CASE WHEN d.category = 'lucid'     THEN 1 END)::numeric
              / NULLIF(COUNT(DISTINCT d.id), 0) * 100, 1
            )::text                                                              AS lucid_ratio,
            ROUND(
              COUNT(CASE WHEN d.category = 'nightmare' THEN 1 END)::numeric
              / NULLIF(COUNT(DISTINCT d.id), 0) * 100, 1
            )::text                                                              AS nightmare_ratio,
            ROUND(
              COUNT(CASE WHEN d.category = 'beautiful' THEN 1 END)::numeric
              / NULLIF(COUNT(DISTINCT d.id), 0) * 100, 1
            )::text                                                              AS beautiful_ratio
          FROM dreams d
          WHERE d.is_draft = false AND d.deleted_at IS NULL AND d.visibility = 'public'
        `),
        this.ds.query<RawEmotion[]>(`
          SELECT de.emotion, COUNT(*)::text AS count
          FROM dream_emotions de
          JOIN dreams d ON d.id = de.dream_id
            AND d.is_draft = false AND d.deleted_at IS NULL AND d.visibility = 'public'
          GROUP BY de.emotion
          ORDER BY count DESC
          LIMIT 6
        `),
        this.ds.query<RawArchetype[]>(`
          SELECT primary_archetype AS archetype, COUNT(*)::text AS count
          FROM dream_identities
          GROUP BY primary_archetype
          ORDER BY count DESC
          LIMIT 6
        `),
        this.ds.query<[{ c: string }]>(`SELECT COUNT(DISTINCT name)::text AS c FROM dream_places`),
        this.ds.query<[{ c: string }]>(`SELECT COUNT(*)::text AS c FROM dream_clusters`),
        this.ds.query<[{ c: string }]>(`SELECT COUNT(*)::text AS c FROM dream_matches`),
      ]);

    const totalDreams = parseInt(raw?.total_dreams ?? '0', 10);
    const totalEmotions = emotionRows.reduce((s, r) => s + parseInt(r.count, 10), 0) || 1;

    return {
      totalDreams,
      totalDreamers:  parseInt(raw?.total_dreamers  ?? '0', 10),
      totalPlaces:    parseInt(placeCount[0]?.c      ?? '0', 10),
      totalClusters:  parseInt(clusterCount[0]?.c    ?? '0', 10),
      totalMatches:   parseInt(matchCount[0]?.c      ?? '0', 10),
      lucidRatio:     parseFloat(raw?.lucid_ratio     ?? '0'),
      nightmareRatio: parseFloat(raw?.nightmare_ratio ?? '0'),
      beautifulRatio: parseFloat(raw?.beautiful_ratio ?? '0'),
      topEmotions: emotionRows.map((r) => ({
        emotion:    r.emotion,
        count:      parseInt(r.count, 10),
        percentage: Math.round((parseInt(r.count, 10) / totalEmotions) * 100),
      })),
      topArchetypes: archetypeRows.map((r) => ({
        archetype: r.archetype,
        count:     parseInt(r.count, 10),
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Peaceful places ─────────────────────────────────────────────────────────

  async getPeaceful(limit = 10): Promise<AtlasPlace[]> {
    const rows = await this.ds.query<RawPlace[]>(`
      SELECT
        dp.name,
        dp.type,
        dp.country,
        dp.latitude::text,
        dp.longitude::text,
        COUNT(DISTINCT dp.dream_id)::text AS dream_count,
        ROUND(
          COUNT(CASE WHEN de.emotion IN (
            'peace','joy','love','calm','happiness','serenity',
            'wonder','bliss','contentment','gratitude','hope','beauty'
          ) THEN 1 END)::numeric
          / NULLIF(COUNT(de.emotion), 0) * 100, 1
        )::text AS score
      FROM dream_places dp
      JOIN dreams d ON d.id = dp.dream_id
        AND d.is_draft = false AND d.deleted_at IS NULL
      LEFT JOIN dream_emotions de ON de.dream_id = dp.dream_id
      GROUP BY dp.name, dp.type, dp.country, dp.latitude, dp.longitude
      HAVING COUNT(DISTINCT dp.dream_id) >= 1
      ORDER BY score DESC NULLS LAST, dream_count DESC
      LIMIT $1
    `, [limit]);

    return rows.map(this.toAtlasPlace);
  }

  // ── Nightmare hotspots ──────────────────────────────────────────────────────

  async getNightmares(limit = 10): Promise<AtlasPlace[]> {
    const rows = await this.ds.query<RawPlace[]>(`
      SELECT
        dp.name,
        dp.type,
        dp.country,
        dp.latitude::text,
        dp.longitude::text,
        COUNT(DISTINCT dp.dream_id)::text AS dream_count,
        ROUND(
          COUNT(DISTINCT CASE WHEN d.category = 'nightmare' THEN dp.dream_id END)::numeric
          / NULLIF(COUNT(DISTINCT dp.dream_id), 0) * 100, 1
        )::text AS score
      FROM dream_places dp
      JOIN dreams d ON d.id = dp.dream_id
        AND d.is_draft = false AND d.deleted_at IS NULL
      GROUP BY dp.name, dp.type, dp.country, dp.latitude, dp.longitude
      HAVING COUNT(DISTINCT dp.dream_id) >= 1
      ORDER BY score DESC NULLS LAST, dream_count DESC
      LIMIT $1
    `, [limit]);

    return rows.map(this.toAtlasPlace);
  }

  // ── Lucid dream capitals ────────────────────────────────────────────────────

  async getLucid(limit = 10): Promise<AtlasPlace[]> {
    const rows = await this.ds.query<RawPlace[]>(`
      SELECT
        dp.name,
        dp.type,
        dp.country,
        dp.latitude::text,
        dp.longitude::text,
        COUNT(DISTINCT dp.dream_id)::text AS dream_count,
        ROUND(
          COUNT(DISTINCT CASE WHEN d.category = 'lucid' THEN dp.dream_id END)::numeric
          / NULLIF(COUNT(DISTINCT dp.dream_id), 0) * 100, 1
        )::text AS score
      FROM dream_places dp
      JOIN dreams d ON d.id = dp.dream_id
        AND d.is_draft = false AND d.deleted_at IS NULL
      GROUP BY dp.name, dp.type, dp.country, dp.latitude, dp.longitude
      HAVING COUNT(DISTINCT dp.dream_id) >= 1
      ORDER BY score DESC NULLS LAST, dream_count DESC
      LIMIT $1
    `, [limit]);

    return rows.map(this.toAtlasPlace);
  }

  // ── Global symbols ──────────────────────────────────────────────────────────

  async getSymbols(limit = 20): Promise<AtlasSymbol[]> {
    const rows = await this.ds.query<RawSymbol[]>(`
      SELECT
        ds.symbol_category                                  AS symbol,
        COUNT(*)::text                                      AS count,
        COUNT(CASE WHEN ds.is_universal THEN 1 END)::text  AS universal_count,
        MAX(ds.manifestation)                               AS example_manifestation
      FROM dream_symbols ds
      JOIN dreams d ON d.id = ds.dream_id
        AND d.is_draft = false AND d.deleted_at IS NULL
      WHERE ds.symbol_category IS NOT NULL
      GROUP BY ds.symbol_category
      ORDER BY count DESC
      LIMIT $1
    `, [limit]);

    const total = rows.reduce((s, r) => s + parseInt(r.count, 10), 0) || 1;

    return rows.map((r) => ({
      symbol:               r.symbol,
      count:                parseInt(r.count, 10),
      percentage:           Math.round((parseInt(r.count, 10) / total) * 100),
      universalCount:       parseInt(r.universal_count, 10),
      exampleManifestation: r.example_manifestation,
    }));
  }

  // ── Trending themes (week vs previous week) ─────────────────────────────────

  async getTrending(limit = 15): Promise<AtlasTrending[]> {
    const now     = new Date();
    const from    = new Date(now.getTime() - 7  * 86_400_000);
    const prevFrom = new Date(now.getTime() - 14 * 86_400_000);

    const [current, previous] = await Promise.all([
      this.ds.query<RawCount[]>(`
        SELECT dt.theme AS name, COUNT(*)::text AS count
        FROM dream_themes dt
        JOIN dreams d ON d.id = dt.dream_id
          AND d.is_draft = false AND d.deleted_at IS NULL
        WHERE d.created_at >= $1
        GROUP BY dt.theme
        ORDER BY count DESC
        LIMIT $2
      `, [from, limit]),
      this.ds.query<RawCount[]>(`
        SELECT dt.theme AS name, COUNT(*)::text AS count
        FROM dream_themes dt
        JOIN dreams d ON d.id = dt.dream_id
          AND d.is_draft = false AND d.deleted_at IS NULL
        WHERE d.created_at >= $1 AND d.created_at < $2
        GROUP BY dt.theme
        ORDER BY count DESC
        LIMIT $3
      `, [prevFrom, from, limit]),
    ]);

    const prevMap = new Map(previous.map((r) => [r.name, parseInt(r.count, 10)]));

    return current.map((r) => {
      const curr = parseInt(r.count, 10);
      const prev = prevMap.get(r.name) ?? 0;
      let trend: TrendDir = 'stable';
      let trendPct = 0;
      if (prev === 0) {
        trend = curr > 0 ? 'new' : 'stable';
      } else {
        trendPct = Math.round(((curr - prev) / prev) * 100);
        if (trendPct > 10)  trend = 'rising';
        else if (trendPct < -10) trend = 'falling';
      }
      return { name: r.name, count: curr, trend, trendPct };
    });
  }

  // ── Helper ──────────────────────────────────────────────────────────────────

  private toAtlasPlace(r: RawPlace): AtlasPlace {
    return {
      name:       r.name,
      type:       r.type,
      country:    r.country,
      latitude:   r.latitude  != null ? parseFloat(r.latitude)  : null,
      longitude:  r.longitude != null ? parseFloat(r.longitude) : null,
      dreamCount: parseInt(r.dream_count, 10),
      score:      r.score != null ? parseFloat(r.score) : 0,
    };
  }
}
