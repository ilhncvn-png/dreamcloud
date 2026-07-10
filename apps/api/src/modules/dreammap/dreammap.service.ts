import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// ── Types ──────────────────────────────────────────────────────────────────────

export type DreamWeather = 'peaceful' | 'active' | 'transforming' | 'lucid' | 'nightmare-heavy';
export type NodeColor    = '#60A5FA' | '#C084FC' | '#F87171' | '#FBBF24' | '#34D399';

export interface MapCity {
  name:               string;
  slug:               string;
  country:            string | null;
  type:               string;
  latitude:           number;
  longitude:          number;
  dreamCount:         number;
  dreamScore:         number;
  lucidRatio:         number;
  nightmareRatio:     number;
  dominantEmotion:    string | null;
  dominantThemes:     string[];
  dominantSymbols:    string[];
  dominantArchetypes: string[];
  dreamWeather:       DreamWeather;
  nodeColor:          NodeColor;
}

export interface MapCityDetail extends MapCity {
  emotionDistribution: Array<{ emotion: string; count: number; percentage: number }>;
  recentSnippets:      Array<{ title: string | null; excerpt: string; category: string; createdAt: string }>;
}

export interface ConstellationCity {
  name:        string;
  latitude:    number;
  longitude:   number;
  linkStrength: number;
}

export interface MapConstellation {
  clusterId:    string;
  clusterName:  string;
  clusterSlug:  string;
  strengthScore: number;
  memberCount:  number;
  cities:       ConstellationCity[];
  connections:  Array<{ from: ConstellationCity; to: ConstellationCity }>;
}

export interface MapWorld {
  totalDreams:     number;
  totalDreamers:   number;
  totalPlaces:     number;
  totalClusters:   number;
  totalMatches:    number;
  lucidRatio:      number;
  nightmareRatio:  number;
  beautifulRatio:  number;
  dominantEmotion: string | null;
  generatedAt:     string;
}

// ── Raw DB rows ────────────────────────────────────────────────────────────────

interface RawCity {
  name:               string;
  country:            string | null;
  type:               string;
  latitude:           string;
  longitude:          string;
  dream_count:        string;
  lucid_ratio:        string | null;
  nightmare_ratio:    string | null;
  dominant_emotion:   string | null;
  dominant_themes:    string[];
  dominant_symbols:   string[];
  dominant_archetypes: string[];
}

interface RawConstellation {
  cluster_id:    string;
  cluster_name:  string;
  cluster_slug:  string;
  strength_score: string;
  member_count:  string;
  city_name:     string;
  latitude:      string;
  longitude:     string;
  link_strength: string;
}

interface RawEmotion {
  emotion: string;
  count:   string;
}

interface RawSnippet {
  title:      string | null;
  excerpt:    string;
  category:   string;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function computeWeather(
  lucidRatio:     number,
  nightmareRatio: number,
  dreamCount:     number,
  themes:         string[],
): DreamWeather {
  if (nightmareRatio >= 30) return 'nightmare-heavy';
  if (lucidRatio >= 30)     return 'lucid';
  const isTransforming = themes.some((t) =>
    ['transformation', 'change', 'rebirth', 'threshold', 'journey', 'crossing'].includes(t),
  );
  if (isTransforming)   return 'transforming';
  if (dreamCount >= 3)  return 'active';
  return 'peaceful';
}

function computeNodeColor(weather: DreamWeather): NodeColor {
  const MAP: Record<DreamWeather, NodeColor> = {
    peaceful:         '#60A5FA',
    active:           '#34D399',
    transforming:     '#FBBF24',
    lucid:            '#C084FC',
    'nightmare-heavy':'#F87171',
  };
  return MAP[weather];
}

function computeDreamScore(dreamCount: number, lucidRatio: number, nightmareRatio: number): number {
  const base = Math.log(dreamCount + 1) * 30;
  const score = base + lucidRatio * 0.4 - nightmareRatio * 0.15;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function toMapCity(r: RawCity): MapCity {
  const dreamCount     = parseInt(r.dream_count, 10);
  const lucidRatio     = parseFloat(r.lucid_ratio     ?? '0');
  const nightmareRatio = parseFloat(r.nightmare_ratio ?? '0');
  const themes         = Array.isArray(r.dominant_themes)    ? r.dominant_themes    : [];
  const symbols        = Array.isArray(r.dominant_symbols)   ? r.dominant_symbols   : [];
  const archetypes     = Array.isArray(r.dominant_archetypes)? r.dominant_archetypes: [];
  const dreamWeather   = computeWeather(lucidRatio, nightmareRatio, dreamCount, themes);

  return {
    name:               r.name,
    slug:               toSlug(r.name),
    country:            r.country,
    type:               r.type,
    latitude:           parseFloat(r.latitude),
    longitude:          parseFloat(r.longitude),
    dreamCount,
    dreamScore:         computeDreamScore(dreamCount, lucidRatio, nightmareRatio),
    lucidRatio,
    nightmareRatio,
    dominantEmotion:    r.dominant_emotion,
    dominantThemes:     themes.filter(Boolean),
    dominantSymbols:    symbols.filter(Boolean),
    dominantArchetypes: archetypes.filter(Boolean),
    dreamWeather,
    nodeColor:          computeNodeColor(dreamWeather),
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class DreamMapService {
  constructor(
    @InjectDataSource()
    private readonly ds: DataSource,
  ) {}

  // ── World ───────────────────────────────────────────────────────────────────

  async getWorld(): Promise<MapWorld> {
    const [[raw], [topEmotion], placeCount, clusterCount, matchCount] = await Promise.all([
      this.ds.query<[{
        total_dreams: string; total_dreamers: string;
        lucid_ratio: string; nightmare_ratio: string; beautiful_ratio: string;
      }]>(`
        SELECT
          COUNT(DISTINCT d.id)::text                                               AS total_dreams,
          COUNT(DISTINCT d.user_id)::text                                          AS total_dreamers,
          ROUND(COUNT(CASE WHEN d.category='lucid'     THEN 1 END)::numeric
            / NULLIF(COUNT(DISTINCT d.id),0)*100, 1)::text                        AS lucid_ratio,
          ROUND(COUNT(CASE WHEN d.category='nightmare' THEN 1 END)::numeric
            / NULLIF(COUNT(DISTINCT d.id),0)*100, 1)::text                        AS nightmare_ratio,
          ROUND(COUNT(CASE WHEN d.category='beautiful' THEN 1 END)::numeric
            / NULLIF(COUNT(DISTINCT d.id),0)*100, 1)::text                        AS beautiful_ratio
        FROM dreams d
        WHERE d.is_draft=false AND d.deleted_at IS NULL AND d.visibility='public'
      `),
      this.ds.query<[{ emotion: string }]>(`
        SELECT de.emotion
        FROM dream_emotions de
        JOIN dreams d ON d.id = de.dream_id
          AND d.is_draft=false AND d.deleted_at IS NULL AND d.visibility='public'
        GROUP BY de.emotion ORDER BY COUNT(*) DESC LIMIT 1
      `),
      this.ds.query<[{ c: string }]>(`SELECT COUNT(DISTINCT name)::text AS c FROM dream_places`),
      this.ds.query<[{ c: string }]>(`SELECT COUNT(*)::text AS c FROM dream_clusters`),
      this.ds.query<[{ c: string }]>(`SELECT COUNT(*)::text AS c FROM dream_matches`),
    ]);

    return {
      totalDreams:     parseInt(raw?.total_dreams     ?? '0', 10),
      totalDreamers:   parseInt(raw?.total_dreamers   ?? '0', 10),
      totalPlaces:     parseInt(placeCount[0]?.c      ?? '0', 10),
      totalClusters:   parseInt(clusterCount[0]?.c    ?? '0', 10),
      totalMatches:    parseInt(matchCount[0]?.c       ?? '0', 10),
      lucidRatio:      parseFloat(raw?.lucid_ratio     ?? '0'),
      nightmareRatio:  parseFloat(raw?.nightmare_ratio ?? '0'),
      beautifulRatio:  parseFloat(raw?.beautiful_ratio ?? '0'),
      dominantEmotion: topEmotion?.emotion ?? null,
      generatedAt:     new Date().toISOString(),
    };
  }

  // ── Cities (all map nodes) ──────────────────────────────────────────────────

  async getCities(): Promise<MapCity[]> {
    const rows = await this.ds.query<RawCity[]>(`
      WITH city_base AS (
        SELECT
          dp.name,
          dp.country,
          dp.type,
          AVG(dp.latitude)::text  AS latitude,
          AVG(dp.longitude)::text AS longitude,
          COUNT(DISTINCT dp.dream_id)::text AS dream_count,
          ROUND(
            COUNT(DISTINCT CASE WHEN d.category='lucid'     THEN dp.dream_id END)::numeric
            / NULLIF(COUNT(DISTINCT dp.dream_id),0)*100, 1
          )::text AS lucid_ratio,
          ROUND(
            COUNT(DISTINCT CASE WHEN d.category='nightmare' THEN dp.dream_id END)::numeric
            / NULLIF(COUNT(DISTINCT dp.dream_id),0)*100, 1
          )::text AS nightmare_ratio
        FROM dream_places dp
        JOIN dreams d ON d.id = dp.dream_id
          AND d.is_draft=false AND d.deleted_at IS NULL
        WHERE dp.latitude IS NOT NULL AND dp.longitude IS NOT NULL
        GROUP BY dp.name, dp.country, dp.type
      )
      SELECT
        cb.name,
        cb.country,
        cb.type,
        cb.latitude,
        cb.longitude,
        cb.dream_count,
        cb.lucid_ratio,
        cb.nightmare_ratio,
        (SELECT de.emotion FROM dream_emotions de
         JOIN dream_places dp2 ON dp2.dream_id = de.dream_id AND dp2.name = cb.name
         GROUP BY de.emotion ORDER BY COUNT(*) DESC LIMIT 1
        )                                                           AS dominant_emotion,
        COALESCE((
          SELECT ARRAY_AGG(th ORDER BY cnt DESC) FROM (
            SELECT dt.theme AS th, COUNT(*) AS cnt
            FROM dream_themes dt
            JOIN dream_places dp2 ON dp2.dream_id = dt.dream_id AND dp2.name = cb.name
            GROUP BY dt.theme LIMIT 3
          ) s
        ), '{}')                                                    AS dominant_themes,
        COALESCE((
          SELECT ARRAY_AGG(sym ORDER BY cnt DESC) FROM (
            SELECT ds.symbol_category AS sym, COUNT(*) AS cnt
            FROM dream_symbols ds
            JOIN dream_places dp2 ON dp2.dream_id = ds.dream_id AND dp2.name = cb.name
            WHERE ds.symbol_category IS NOT NULL
            GROUP BY ds.symbol_category LIMIT 3
          ) s
        ), '{}')                                                    AS dominant_symbols,
        COALESCE((
          SELECT ARRAY_AGG(arc ORDER BY cnt DESC) FROM (
            SELECT f.archetype_candidate AS arc, COUNT(*) AS cnt
            FROM dream_figures f
            JOIN dream_places dp2 ON dp2.dream_id = f.dream_id AND dp2.name = cb.name
            WHERE f.archetype_candidate IS NOT NULL AND f.archetype_candidate != 'unknown'
            GROUP BY f.archetype_candidate LIMIT 3
          ) s
        ), '{}')                                                    AS dominant_archetypes
      FROM city_base cb
      ORDER BY cb.dream_count DESC
    `);

    return rows.map(toMapCity);
  }

  // ── Single city detail ──────────────────────────────────────────────────────

  async getCity(slug: string): Promise<MapCityDetail | null> {
    // Find by slug: lower-replace name
    const rows = await this.ds.query<RawCity[]>(`
      WITH city_base AS (
        SELECT
          dp.name,
          dp.country,
          dp.type,
          AVG(dp.latitude)::text  AS latitude,
          AVG(dp.longitude)::text AS longitude,
          COUNT(DISTINCT dp.dream_id)::text AS dream_count,
          ROUND(
            COUNT(DISTINCT CASE WHEN d.category='lucid'     THEN dp.dream_id END)::numeric
            / NULLIF(COUNT(DISTINCT dp.dream_id),0)*100, 1
          )::text AS lucid_ratio,
          ROUND(
            COUNT(DISTINCT CASE WHEN d.category='nightmare' THEN dp.dream_id END)::numeric
            / NULLIF(COUNT(DISTINCT dp.dream_id),0)*100, 1
          )::text AS nightmare_ratio
        FROM dream_places dp
        JOIN dreams d ON d.id = dp.dream_id
          AND d.is_draft=false AND d.deleted_at IS NULL
        WHERE dp.latitude IS NOT NULL AND dp.longitude IS NOT NULL
          AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            dp.name, 'ç','c'),'ğ','g'),'ı','i'),'ö','o'),'ş','s'),'ü','u')
          ) = LOWER(REPLACE($1, '-', ' '))
        GROUP BY dp.name, dp.country, dp.type
      )
      SELECT
        cb.name, cb.country, cb.type,
        cb.latitude, cb.longitude,
        cb.dream_count, cb.lucid_ratio, cb.nightmare_ratio,
        (SELECT de.emotion FROM dream_emotions de
         JOIN dream_places dp2 ON dp2.dream_id = de.dream_id AND dp2.name = cb.name
         GROUP BY de.emotion ORDER BY COUNT(*) DESC LIMIT 1)       AS dominant_emotion,
        COALESCE((
          SELECT ARRAY_AGG(th ORDER BY cnt DESC) FROM (
            SELECT dt.theme AS th, COUNT(*) AS cnt
            FROM dream_themes dt
            JOIN dream_places dp2 ON dp2.dream_id = dt.dream_id AND dp2.name = cb.name
            GROUP BY dt.theme LIMIT 5
          ) s
        ), '{}')                                                    AS dominant_themes,
        COALESCE((
          SELECT ARRAY_AGG(sym ORDER BY cnt DESC) FROM (
            SELECT ds.symbol_category AS sym, COUNT(*) AS cnt
            FROM dream_symbols ds
            JOIN dream_places dp2 ON dp2.dream_id = ds.dream_id AND dp2.name = cb.name
            WHERE ds.symbol_category IS NOT NULL
            GROUP BY ds.symbol_category LIMIT 5
          ) s
        ), '{}')                                                    AS dominant_symbols,
        COALESCE((
          SELECT ARRAY_AGG(arc ORDER BY cnt DESC) FROM (
            SELECT f.archetype_candidate AS arc, COUNT(*) AS cnt
            FROM dream_figures f
            JOIN dream_places dp2 ON dp2.dream_id = f.dream_id AND dp2.name = cb.name
            WHERE f.archetype_candidate IS NOT NULL AND f.archetype_candidate != 'unknown'
            GROUP BY f.archetype_candidate LIMIT 3
          ) s
        ), '{}')                                                    AS dominant_archetypes
      FROM city_base cb
      LIMIT 1
    `, [slug]);

    if (rows.length === 0) return null;
    const row  = rows[0] as RawCity;
    const base = toMapCity(row);

    // Emotion distribution
    const emotionRows = await this.ds.query<RawEmotion[]>(`
      SELECT de.emotion, COUNT(*)::text AS count
      FROM dream_emotions de
      JOIN dream_places dp ON dp.dream_id = de.dream_id AND dp.name = $1
      GROUP BY de.emotion
      ORDER BY count DESC
      LIMIT 8
    `, [row.name]);

    const totalEmotions = emotionRows.reduce((s, r) => s + parseInt(r.count, 10), 0) || 1;

    // Recent snippets (public dreams only)
    const snippets = await this.ds.query<RawSnippet[]>(`
      SELECT
        d.title,
        SUBSTRING(d.content, 1, 110) AS excerpt,
        d.category,
        d.created_at::text
      FROM dreams d
      JOIN dream_places dp ON dp.dream_id = d.id AND dp.name = $1
      WHERE d.is_draft=false AND d.deleted_at IS NULL AND d.visibility='public'
      ORDER BY d.created_at DESC
      LIMIT 3
    `, [row.name]);

    return {
      ...base,
      emotionDistribution: emotionRows.map((r) => ({
        emotion:    r.emotion,
        count:      parseInt(r.count, 10),
        percentage: Math.round((parseInt(r.count, 10) / totalEmotions) * 100),
      })),
      recentSnippets: snippets.map((s) => ({
        title:     s.title,
        excerpt:   s.excerpt,
        category:  s.category,
        createdAt: s.created_at,
      })),
    };
  }

  // ── Hotspots ────────────────────────────────────────────────────────────────

  async getHotspots(limit = 10): Promise<MapCity[]> {
    const all = await this.getCities();
    return all.slice(0, limit);
  }

  // ── Constellations ──────────────────────────────────────────────────────────

  async getConstellations(): Promise<MapConstellation[]> {
    const rows = await this.ds.query<RawConstellation[]>(`
      SELECT
        dc.id    AS cluster_id,
        dc.name  AS cluster_name,
        dc.slug  AS cluster_slug,
        dc.strength_score::text,
        dc.member_count::text,
        dp.name      AS city_name,
        AVG(dp.latitude)::text   AS latitude,
        AVG(dp.longitude)::text  AS longitude,
        COUNT(DISTINCT dp.dream_id)::text AS link_strength
      FROM dream_cluster_members dcm
      JOIN dream_clusters dc ON dc.id = dcm.cluster_id
      JOIN dream_places dp ON dp.user_id = dcm.user_id
      WHERE dp.latitude IS NOT NULL AND dp.longitude IS NOT NULL
      GROUP BY dc.id, dc.name, dc.slug, dc.strength_score, dc.member_count, dp.name
      HAVING COUNT(DISTINCT dp.dream_id) >= 1
      ORDER BY dc.strength_score DESC, link_strength DESC
    `);

    // Group by cluster
    const clusterMap = new Map<string, MapConstellation>();

    for (const r of rows) {
      if (!clusterMap.has(r.cluster_id)) {
        clusterMap.set(r.cluster_id, {
          clusterId:     r.cluster_id,
          clusterName:   r.cluster_name,
          clusterSlug:   r.cluster_slug,
          strengthScore: parseFloat(r.strength_score),
          memberCount:   parseInt(r.member_count, 10),
          cities:        [],
          connections:   [],
        });
      }
      const constellation = clusterMap.get(r.cluster_id)!;
      constellation.cities.push({
        name:         r.city_name,
        latitude:     parseFloat(r.latitude),
        longitude:    parseFloat(r.longitude),
        linkStrength: parseInt(r.link_strength, 10),
      });
    }

    // Build connections (fully connected within cluster — all pairs)
    for (const constellation of clusterMap.values()) {
      const cities = constellation.cities;
      for (let i = 0; i < cities.length; i++) {
        for (let j = i + 1; j < cities.length; j++) {
          constellation.connections.push({ from: cities[i]!, to: cities[j]! });
        }
      }
    }

    return Array.from(clusterMap.values())
      .filter((c) => c.cities.length > 0);
  }
}
