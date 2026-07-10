import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type TrendPeriod = 'today' | 'week' | 'month';

export interface TrendingPlace {
  name: string;
  type: string;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  dreamCount: number;
  avgConfidence: number;
}

export interface PlaceIntelligence {
  name: string;
  type: string;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  dreamCount: number;
  dreamScore: number;
  lucidRatio: number;
  nightmareRatio: number;
  emotions: Array<{ emotion: string; count: number; percentage: number }>;
  symbols: Array<{ symbol: string; count: number }>;
  themes: Array<{ theme: string; count: number }>;
  archetypes: Array<{ archetype: string; count: number }>;
}

export interface CuratedPlaces {
  peaceful:   TrendingPlace[];
  lucid:      TrendingPlace[];
  emotional:  TrendingPlace[];
  cities:     TrendingPlace[];
  landmarks:  TrendingPlace[];
}

const INTERVAL: Record<TrendPeriod, string> = {
  today: '24 hours',
  week:  '7 days',
  month: '30 days',
};

@Injectable()
export class PlacesService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  // ─── Trending ────────────────────────────────────────────────────────────────

  async getTrending(period: TrendPeriod = 'week', limit = 20): Promise<TrendingPlace[]> {
    const interval = INTERVAL[period];
    const rows: {
      name: string; type: string; country: string | null; city: string | null;
      latitude: string | null; longitude: string | null;
      dream_count: string; avg_confidence: string;
    }[] = await this.ds.query(
      `
      SELECT
        dp.name, dp.type::text, dp.country, dp.city,
        dp.latitude::text, dp.longitude::text,
        COUNT(DISTINCT dp.dream_id) AS dream_count,
        AVG(dp.confidence)          AS avg_confidence
      FROM dream_places dp
      JOIN dreams d ON d.id = dp.dream_id
        AND d.is_draft     = FALSE
        AND d.deleted_at   IS NULL
        AND d.visibility   = 'public'
      WHERE dp.created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY dp.name, dp.type, dp.country, dp.city, dp.latitude, dp.longitude
      ORDER BY dream_count DESC, avg_confidence DESC
      LIMIT $1
      `,
      [limit],
    );

    return this.mapTrending(rows);
  }

  async getTrendingAll(): Promise<{ today: TrendingPlace[]; week: TrendingPlace[]; month: TrendingPlace[] }> {
    const [today, week, month] = await Promise.all([
      this.getTrending('today', 10),
      this.getTrending('week',  10),
      this.getTrending('month', 10),
    ]);
    return { today, week, month };
  }

  // ─── Curated sections for mobile ─────────────────────────────────────────────

  async getCurated(): Promise<CuratedPlaces> {
    const [peaceful, lucid, emotional, cities, landmarks] = await Promise.all([
      this.getByEmotion(['peace', 'love', 'joy']),
      this.getByCategory('lucid'),
      this.getByEmotion(['fear', 'anxiety', 'anger', 'sadness']),
      this.getByType('CITY'),
      this.getByType('LANDMARK'),
    ]);
    return { peaceful, lucid, emotional, cities, landmarks };
  }

  private async getByEmotion(emotions: string[]): Promise<TrendingPlace[]> {
    const placeholders = emotions.map((_, i) => `$${i + 1}`).join(', ');
    const rows: {
      name: string; type: string; country: string | null; city: string | null;
      latitude: string | null; longitude: string | null;
      dream_count: string; avg_confidence: string;
    }[] = await this.ds.query(
      `
      SELECT
        dp.name, dp.type::text, dp.country, dp.city,
        dp.latitude::text, dp.longitude::text,
        COUNT(DISTINCT dp.dream_id) AS dream_count,
        AVG(dp.confidence)          AS avg_confidence
      FROM dream_places dp
      JOIN dreams d ON d.id = dp.dream_id AND d.is_draft = FALSE AND d.deleted_at IS NULL AND d.visibility = 'public'
      JOIN dream_emotions de ON de.dream_id = dp.dream_id AND de.emotion IN (${placeholders})
      GROUP BY dp.name, dp.type, dp.country, dp.city, dp.latitude, dp.longitude
      ORDER BY dream_count DESC
      LIMIT 10
      `,
      emotions,
    );
    return this.mapTrending(rows);
  }

  private async getByCategory(category: string): Promise<TrendingPlace[]> {
    const rows: {
      name: string; type: string; country: string | null; city: string | null;
      latitude: string | null; longitude: string | null;
      dream_count: string; avg_confidence: string;
    }[] = await this.ds.query(
      `
      SELECT
        dp.name, dp.type::text, dp.country, dp.city,
        dp.latitude::text, dp.longitude::text,
        COUNT(DISTINCT dp.dream_id) AS dream_count,
        AVG(dp.confidence)          AS avg_confidence
      FROM dream_places dp
      JOIN dreams d ON d.id = dp.dream_id AND d.is_draft = FALSE AND d.deleted_at IS NULL AND d.visibility = 'public' AND d.category = $1
      GROUP BY dp.name, dp.type, dp.country, dp.city, dp.latitude, dp.longitude
      ORDER BY dream_count DESC
      LIMIT 10
      `,
      [category],
    );
    return this.mapTrending(rows);
  }

  private async getByType(type: string): Promise<TrendingPlace[]> {
    const rows: {
      name: string; type: string; country: string | null; city: string | null;
      latitude: string | null; longitude: string | null;
      dream_count: string; avg_confidence: string;
    }[] = await this.ds.query(
      `
      SELECT
        dp.name, dp.type::text, dp.country, dp.city,
        dp.latitude::text, dp.longitude::text,
        COUNT(DISTINCT dp.dream_id) AS dream_count,
        AVG(dp.confidence)          AS avg_confidence
      FROM dream_places dp
      JOIN dreams d ON d.id = dp.dream_id AND d.is_draft = FALSE AND d.deleted_at IS NULL AND d.visibility = 'public'
      WHERE dp.type = $1::dream_place_type
      GROUP BY dp.name, dp.type, dp.country, dp.city, dp.latitude, dp.longitude
      ORDER BY dream_count DESC
      LIMIT 10
      `,
      [type],
    );
    return this.mapTrending(rows);
  }

  // ─── Place intelligence ──────────────────────────────────────────────────────

  async getPlaceIntelligence(name: string): Promise<PlaceIntelligence | null> {
    const base: {
      name: string; type: string; country: string | null; city: string | null;
      latitude: string | null; longitude: string | null;
      dream_count: string; avg_confidence: string;
      lucid_count: string; nightmare_count: string;
    }[] = await this.ds.query(
      `
      SELECT
        dp.name, dp.type::text, dp.country, dp.city,
        dp.latitude::text, dp.longitude::text,
        COUNT(DISTINCT dp.dream_id)                                         AS dream_count,
        AVG(dp.confidence)                                                  AS avg_confidence,
        COUNT(DISTINCT d.id) FILTER (WHERE d.category = 'lucid')           AS lucid_count,
        COUNT(DISTINCT d.id) FILTER (WHERE d.category = 'nightmare')       AS nightmare_count
      FROM dream_places dp
      JOIN dreams d ON d.id = dp.dream_id AND d.is_draft = FALSE AND d.deleted_at IS NULL
      WHERE LOWER(dp.name) = LOWER($1)
      GROUP BY dp.name, dp.type, dp.country, dp.city, dp.latitude, dp.longitude
      `,
      [name],
    );

    if (!base[0]) return null;

    const b          = base[0];
    const dreamCount = parseInt(b.dream_count, 10);
    const avgConf    = Math.round(parseFloat(b.avg_confidence) || 0);

    const [emotions, symbols, themes, archetypes] = await Promise.all([
      this.ds.query<{ emotion: string; count: string }[]>(
        `SELECT de.emotion, COUNT(*) AS count
         FROM dream_places dp
         JOIN dream_emotions de ON de.dream_id = dp.dream_id
         JOIN dreams d ON d.id = dp.dream_id AND d.is_draft = FALSE AND d.deleted_at IS NULL
         WHERE LOWER(dp.name) = LOWER($1)
         GROUP BY de.emotion ORDER BY count DESC`,
        [name],
      ),
      this.ds.query<{ symbol: string; count: string }[]>(
        `SELECT ds.symbol_category AS symbol, COUNT(*) AS count
         FROM dream_places dp
         JOIN dream_symbols ds ON ds.dream_id = dp.dream_id
         JOIN dreams d ON d.id = dp.dream_id AND d.is_draft = FALSE AND d.deleted_at IS NULL
         WHERE LOWER(dp.name) = LOWER($1)
         GROUP BY ds.symbol_category ORDER BY count DESC LIMIT 10`,
        [name],
      ),
      this.ds.query<{ theme: string; count: string }[]>(
        `SELECT dt.theme, COUNT(*) AS count
         FROM dream_places dp
         JOIN dream_themes dt ON dt.dream_id = dp.dream_id
         JOIN dreams d ON d.id = dp.dream_id AND d.is_draft = FALSE AND d.deleted_at IS NULL
         WHERE LOWER(dp.name) = LOWER($1)
         GROUP BY dt.theme ORDER BY count DESC LIMIT 10`,
        [name],
      ),
      this.ds.query<{ archetype: string; count: string }[]>(
        `SELECT df.archetype_candidate AS archetype, COUNT(*) AS count
         FROM dream_places dp
         JOIN dream_figures df ON df.dream_id = dp.dream_id AND df.archetype_candidate IS NOT NULL AND df.archetype_candidate != 'unknown'
         JOIN dreams d ON d.id = dp.dream_id AND d.is_draft = FALSE AND d.deleted_at IS NULL
         WHERE LOWER(dp.name) = LOWER($1)
         GROUP BY df.archetype_candidate ORDER BY count DESC LIMIT 5`,
        [name],
      ),
    ]);

    const totalEmotions = emotions.reduce((s, e) => s + parseInt(e.count, 10), 0);

    return {
      name:     b.name,
      type:     b.type,
      country:  b.country,
      city:     b.city,
      latitude:  b.latitude  ? parseFloat(b.latitude)  : null,
      longitude: b.longitude ? parseFloat(b.longitude) : null,
      dreamCount,
      dreamScore:      avgConf,
      lucidRatio:      dreamCount > 0 ? parseInt(b.lucid_count, 10)     / dreamCount : 0,
      nightmareRatio:  dreamCount > 0 ? parseInt(b.nightmare_count, 10) / dreamCount : 0,
      emotions: emotions.map((e) => ({
        emotion:    e.emotion,
        count:      parseInt(e.count, 10),
        percentage: totalEmotions > 0
          ? Math.round((parseInt(e.count, 10) / totalEmotions) * 100)
          : 0,
      })),
      symbols:    symbols.map((s) => ({ symbol: s.symbol, count: parseInt(s.count, 10) })),
      themes:     themes.map((t)  => ({ theme:  t.theme,  count: parseInt(t.count, 10) })),
      archetypes: archetypes.map((a) => ({ archetype: a.archetype, count: parseInt(a.count, 10) })),
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private mapTrending(rows: {
    name: string; type: string; country: string | null; city: string | null;
    latitude: string | null; longitude: string | null;
    dream_count: string; avg_confidence: string;
  }[]): TrendingPlace[] {
    return rows.map((r) => ({
      name:          r.name,
      type:          r.type,
      country:       r.country,
      city:          r.city,
      latitude:      r.latitude  ? parseFloat(r.latitude)  : null,
      longitude:     r.longitude ? parseFloat(r.longitude) : null,
      dreamCount:    parseInt(r.dream_count, 10),
      avgConfidence: Math.round(parseFloat(r.avg_confidence) || 0),
    }));
  }
}
