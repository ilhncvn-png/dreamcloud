import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class EventEngineService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  // ── Live Event Stream ─────────────────────────────────────────────────────────

  async getLiveEvents(hours = 24, limit = 60): Promise<Array<Record<string, unknown>>> {
    const [newDreams, newMatches, newSignals, newConnections] = await Promise.all([
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT 'NEW_DREAM' AS event_type, d.id, d.title, d.category, d.visibility,
                u.username, d.created_at AS occurred_at
         FROM dreams d JOIN users u ON u.id = d.user_id
         WHERE d.deleted_at IS NULL AND d.created_at > NOW() - ($1 || ' hours')::INTERVAL
         ORDER BY d.created_at DESC LIMIT 20`,
        [String(hours)],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT 'NEW_MATCH' AS event_type, dm.id,
                ROUND((dm.match_score * 100)::numeric, 1) AS score,
                dm.resonance_level,
                ua.username AS user_a, ub.username AS user_b,
                dm.shared_emotions[1] AS top_emotion,
                dm.shared_symbols[1]  AS top_symbol,
                dm.created_at AS occurred_at
         FROM dream_matches dm
         JOIN users ua ON ua.id = dm.user_id_a
         JOIN users ub ON ub.id = dm.user_id_b
         WHERE dm.created_at > NOW() - ($1 || ' hours')::INTERVAL
         ORDER BY dm.match_score DESC, dm.created_at DESC LIMIT 20`,
        [String(hours)],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT 'AI_SIGNAL' AS event_type, ae.id, ae.category, ae.message,
                ae.severity, ae.detail, ae.created_at AS occurred_at
         FROM ai_events ae
         WHERE ae.created_at > NOW() - ($1 || ' hours')::INTERVAL
         ORDER BY ae.created_at DESC LIMIT 15`,
        [String(hours)],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT 'NEW_CONNECTION' AS event_type, dc.id,
                ua.username AS user_a, ub.username AS user_b,
                dc.level, dc.created_at AS occurred_at
         FROM dream_connections dc
         JOIN users ua ON ua.id = dc.user_id_a
         JOIN users ub ON ub.id = dc.user_id_b
         WHERE dc.created_at > NOW() - ($1 || ' hours')::INTERVAL
         ORDER BY dc.created_at DESC LIMIT 10`,
        [String(hours)],
      ).catch(() => [] as Array<Record<string, unknown>>),
    ]);

    const merged: Array<Record<string, unknown>> = [
      ...newDreams, ...newMatches, ...newSignals, ...newConnections,
    ];

    return merged
      .sort((a, b) => new Date(String(b['occurred_at'])).getTime() - new Date(String(a['occurred_at'])).getTime())
      .slice(0, limit);
  }

  async getEventStats(hours = 24): Promise<Record<string, unknown>> {
    const rows = await this.db.query<Array<Record<string, unknown>>>(
      `SELECT
         (SELECT COUNT(*)::int FROM dreams WHERE deleted_at IS NULL AND created_at > NOW() - ($1 || ' hours')::INTERVAL) AS total_dreams,
         (SELECT COUNT(*)::int FROM dream_matches WHERE created_at > NOW() - ($1 || ' hours')::INTERVAL)                 AS total_matches,
         (SELECT COUNT(*)::int FROM ai_events WHERE created_at > NOW() - ($1 || ' hours')::INTERVAL)                    AS total_ai_events,
         (SELECT COUNT(*)::int FROM users WHERE created_at > NOW() - ($1 || ' hours')::INTERVAL)                        AS active_users`,
      [String(hours)],
    );
    return { ...rows[0], window_hours: hours } as Record<string, unknown>;
  }

  // ── User Dream Timeline ───────────────────────────────────────────────────────

  async getUserTimeline(userId: string): Promise<Record<string, unknown>> {
    const [emotionHistory, symbolEvolution, resonanceHistory, dreamFrequency, dreamTotals] = await Promise.all([
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT DATE_TRUNC('week', d.created_at)::date AS week,
                de.emotion, COUNT(*)::int AS count
         FROM dream_emotions de
         JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL
         WHERE d.user_id = $1 AND d.created_at > NOW() - INTERVAL '12 weeks'
         GROUP BY week, de.emotion ORDER BY week ASC, count DESC`,
        [userId],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `WITH ranked AS (
           SELECT DATE_TRUNC('week', d.created_at)::date AS week,
                  ds.manifestation, COUNT(*)::int AS count,
                  ROW_NUMBER() OVER (PARTITION BY DATE_TRUNC('week', d.created_at) ORDER BY COUNT(*) DESC) AS rn
           FROM dream_symbols ds
           JOIN dreams d ON d.id = ds.dream_id AND d.deleted_at IS NULL
           WHERE d.user_id = $1 AND d.created_at > NOW() - INTERVAL '12 weeks'
           GROUP BY week, ds.manifestation
         )
         SELECT week, manifestation, count FROM ranked WHERE rn <= 3 ORDER BY week ASC`,
        [userId],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT dm.created_at,
                ROUND((dm.match_score * 100)::numeric, 1) AS score_pct,
                dm.resonance_level,
                CASE WHEN dm.user_id_a = $1::uuid THEN ub.username ELSE ua.username END AS other_user
         FROM dream_matches dm
         JOIN users ua ON ua.id = dm.user_id_a
         JOIN users ub ON ub.id = dm.user_id_b
         WHERE dm.user_id_a = $1::uuid OR dm.user_id_b = $1::uuid
         ORDER BY dm.created_at DESC LIMIT 40`,
        [userId],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT DATE_TRUNC('week', created_at)::date AS week, COUNT(*)::int AS count
         FROM dreams WHERE user_id = $1 AND deleted_at IS NULL
         AND created_at > NOW() - INTERVAL '16 weeks'
         GROUP BY week ORDER BY week ASC`,
        [userId],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT COUNT(*)::int                                                                          AS total_dreams,
                ROUND(AVG(da.dream_score)::numeric, 1)                                                AS avg_dream_score,
                ROUND(AVG(da.resonance_score)::numeric, 1)                                            AS avg_resonance,
                COUNT(DISTINCT DATE_TRUNC('week', d.created_at))::int                                 AS active_weeks
         FROM dreams d LEFT JOIN dream_analysis da ON da.dream_id = d.id
         WHERE d.user_id = $1 AND d.deleted_at IS NULL`,
        [userId],
      ),
    ]);

    return {
      userId,
      emotionHistory,
      symbolEvolution,
      resonanceHistory,
      dreamFrequency,
      totals: dreamTotals[0] as Record<string, unknown>,
    };
  }

  // ── Dream Graph ───────────────────────────────────────────────────────────────

  async getDreamGraph(dreamId: string): Promise<Record<string, unknown>> {
    const [symbols, emotions, figures, themes, places, connections] = await Promise.all([
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT manifestation AS label, symbol_category AS category,
                ROUND(confidence * 100)::int AS weight
         FROM dream_symbols WHERE dream_id = $1 ORDER BY confidence DESC`,
        [dreamId],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT emotion AS label, intensity, is_primary FROM dream_emotions WHERE dream_id = $1`,
        [dreamId],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT archetype_candidate AS label, figure_type,
                COALESCE(ROUND(archetype_confidence * 100)::int, 50) AS weight
         FROM dream_figures WHERE dream_id = $1 AND archetype_candidate IS NOT NULL`,
        [dreamId],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT theme AS label, is_primary FROM dream_themes WHERE dream_id = $1`,
        [dreamId],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT COALESCE(name, location_type) AS label, archetype_type, emotional_tone
         FROM dream_places WHERE dream_id = $1 AND (name IS NOT NULL OR location_type IS NOT NULL)`,
        [dreamId],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT dm.id, ROUND((dm.match_score * 100)::numeric, 1) AS score,
                dm.resonance_level, dm.shared_symbols, dm.shared_emotions,
                CASE WHEN dm.dream_id_a = $1::uuid THEN ub.username ELSE ua.username END AS other_user,
                CASE WHEN dm.dream_id_a = $1::uuid THEN db_d.title  ELSE da.title    END AS other_title,
                CASE WHEN dm.dream_id_a = $1::uuid THEN db_d.id::text ELSE da.id::text END AS other_dream_id
         FROM dream_matches dm
         JOIN dreams da   ON da.id   = dm.dream_id_a
         JOIN dreams db_d ON db_d.id = dm.dream_id_b
         JOIN users  ua   ON ua.id   = dm.user_id_a
         JOIN users  ub   ON ub.id   = dm.user_id_b
         WHERE dm.dream_id_a = $1::uuid OR dm.dream_id_b = $1::uuid
         ORDER BY dm.match_score DESC LIMIT 8`,
        [dreamId],
      ),
    ]);

    const nodes: Array<Record<string, unknown>> = [
      ...symbols.map((s, i) => ({ id: `sym_${i}`, type: 'symbol',    label: s['label'], weight: Number(s['weight']), category: s['category'],   color: '#60A5FA' })),
      ...emotions.map((e, i) => ({ id: `emo_${i}`, type: 'emotion',   label: e['label'], isPrimary: e['is_primary'],  intensity: e['intensity'], color: '#F472B6' })),
      ...figures.map( (f, i) => ({ id: `arc_${i}`, type: 'archetype', label: f['label'], weight: Number(f['weight']), figureType: f['figure_type'], color: '#FBBF24' })),
      ...themes.map(  (t, i) => ({ id: `thm_${i}`, type: 'theme',     label: t['label'], isPrimary: t['is_primary'],  color: '#A78BFA' })),
      ...places.map(  (p, i) => ({ id: `plc_${i}`, type: 'place',     label: p['label'], archetype: p['archetype_type'], tone: p['emotional_tone'], color: '#34D399' })),
    ];

    return {
      dreamId,
      nodes,
      connections,
      summary: {
        symbolCount:    symbols.length,
        emotionCount:   emotions.length,
        archetypeCount: figures.length,
        themeCount:     themes.length,
        placeCount:     places.length,
        connectionCount:connections.length,
      },
    };
  }

  // ── AI Insights ───────────────────────────────────────────────────────────────

  async getUserInsights(userId: string): Promise<Record<string, unknown>> {
    const [
      topEmotions, topSymbols, topArchetypes,
      resonanceStats, dreamStats, moodTrend,
    ] = await Promise.all([
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT de.emotion, COUNT(*)::int AS count,
                ROUND(AVG(CASE de.intensity
                  WHEN 'low' THEN 1 WHEN 'moderate' THEN 2 WHEN 'high' THEN 3
                  WHEN 'intense' THEN 4 WHEN 'overwhelming' THEN 5 END)::numeric, 1) AS avg_intensity
         FROM dream_emotions de JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL
         WHERE d.user_id = $1 GROUP BY de.emotion ORDER BY count DESC LIMIT 5`,
        [userId],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT ds.manifestation, COUNT(*)::int AS count
         FROM dream_symbols ds JOIN dreams d ON d.id = ds.dream_id AND d.deleted_at IS NULL
         WHERE d.user_id = $1 GROUP BY ds.manifestation ORDER BY count DESC LIMIT 5`,
        [userId],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT df.archetype_candidate AS archetype, COUNT(*)::int AS count
         FROM dream_figures df JOIN dreams d ON d.id = df.dream_id AND d.deleted_at IS NULL
         WHERE d.user_id = $1 AND df.archetype_candidate IS NOT NULL
         GROUP BY df.archetype_candidate ORDER BY count DESC LIMIT 3`,
        [userId],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT COUNT(*)::int AS total,
                ROUND(AVG(match_score * 100)::numeric, 1) AS avg_score,
                MAX(match_score * 100)::int               AS peak_score
         FROM dream_matches WHERE user_id_a = $1 OR user_id_b = $1`,
        [userId],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT COUNT(*)::int                              AS total_dreams,
                ROUND(AVG(da.dream_score)::numeric, 1)    AS avg_dream_score,
                ROUND(AVG(da.resonance_score)::numeric, 1) AS avg_resonance_score,
                COUNT(DISTINCT d.category)::int           AS category_variety
         FROM dreams d LEFT JOIN dream_analysis da ON da.dream_id = d.id
         WHERE d.user_id = $1 AND d.deleted_at IS NULL`,
        [userId],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `WITH cur AS (
           SELECT de.emotion, COUNT(*)::int AS cnt
           FROM dream_emotions de JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL
           WHERE d.user_id = $1 AND d.created_at > NOW() - INTERVAL '4 weeks'
           GROUP BY de.emotion ORDER BY cnt DESC LIMIT 1
         ), prior AS (
           SELECT de.emotion, COUNT(*)::int AS cnt
           FROM dream_emotions de JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL
           WHERE d.user_id = $1
             AND d.created_at BETWEEN NOW() - INTERVAL '8 weeks' AND NOW() - INTERVAL '4 weeks'
           GROUP BY de.emotion ORDER BY cnt DESC LIMIT 1
         )
         SELECT c.emotion AS current_mood, c.cnt AS current_count,
                p.emotion AS prior_mood, p.cnt AS prior_count FROM cur c, prior p`,
        [userId],
      ),
    ]);

    const rs  = resonanceStats[0] as Record<string, unknown> | undefined;
    const ds  = dreamStats[0]     as Record<string, unknown> | undefined;
    const mt  = moodTrend[0]      as Record<string, unknown> | undefined;
    const te  = topEmotions[0]    as Record<string, unknown> | undefined;
    const ts  = topSymbols[0]     as Record<string, unknown> | undefined;
    const ta  = topArchetypes[0]  as Record<string, unknown> | undefined;

    // Generate natural-language insights
    const insights: Array<{ type: string; priority: number; title: string; body: string; color: string }> = [];

    if (te) {
      insights.push({
        type: 'emotion', priority: 1,
        title: 'Baskın Duygu Deseni',
        body: `Bilinçaltı en sık "${String(te['emotion'])}" duygusunu işliyor — ${String(te['count'])} rüyada görüldü. Ortalama yoğunluk: ${String(te['avg_intensity'])}/5.`,
        color: '#F472B6',
      });
    }
    if (ts) {
      insights.push({
        type: 'symbol', priority: 2,
        title: 'Tekrarlayan Sembol',
        body: `"${String(ts['manifestation'])}" sembolü ${String(ts['count'])} rüyada belirdi. Bu evrensel bir arketip göstergesi olabilir.`,
        color: '#60A5FA',
      });
    }
    if (ta) {
      insights.push({
        type: 'archetype', priority: 3,
        title: 'Aktif Arketip',
        body: `"${String(ta['archetype'])}" arketipi en çok aktive olan Jung figürü (${String(ta['count'])} rüyada). Derin bir bilinçaltı mesajı taşıyor olabilir.`,
        color: '#FBBF24',
      });
    }
    if (rs && Number(rs['total']) > 0) {
      insights.push({
        type: 'resonance', priority: 4,
        title: 'Rezonans Kapasitesi',
        body: `${String(rs['total'])} rüyacıyla bilinçaltı bağlantısı kuruldu. Ortalama uyum: ${String(rs['avg_score'])}%. Zirve skor: ${String(rs['peak_score'])}%.`,
        color: '#A78BFA',
      });
    }
    if (mt?.['current_mood'] && mt?.['prior_mood']) {
      const shifted = mt['current_mood'] !== mt['prior_mood'];
      insights.push({
        type: 'trend', priority: 5,
        title: 'Duygu Akışı',
        body: shifted
          ? `Son 4 haftada baskın mod "${String(mt['prior_mood'])}"dan "${String(mt['current_mood'])}"ya döndü — bilinçaltında aktif bir dönüşüm.`
          : `Son 8 haftada baskın mod "${String(mt['current_mood'])}" olarak tutarlı kalıyor — güçlü bir duygusal temel.`,
        color: '#34D399',
      });
    }
    if (ds && Number(ds['total_dreams']) >= 10 && Number(ds['avg_dream_score']) > 0) {
      const score = Number(ds['avg_dream_score']);
      const quality = score >= 75 ? 'yüksek kaliteli' : score >= 50 ? 'orta kaliteli' : 'gelişime açık';
      insights.push({
        type: 'quality', priority: 6,
        title: 'Rüya Kalitesi',
        body: `Ortalama rüya skoru ${String(ds['avg_dream_score'])} — ${quality} rüya içeriği. ${String(ds['total_dreams'])} rüya analiz edildi.`,
        color: '#00E87A',
      });
    }

    return {
      userId,
      insights: insights.sort((a, b) => a.priority - b.priority),
      topEmotions,
      topSymbols,
      topArchetypes,
      resonanceStats: {
        total:     parseInt(String(rs?.['total']      ?? '0')),
        avgScore:  parseFloat(String(rs?.['avg_score'] ?? '0')),
        peakScore: parseInt(String(rs?.['peak_score']  ?? '0')),
      },
      dreamStats: {
        totalDreams:      parseInt(String(ds?.['total_dreams']       ?? '0')),
        avgDreamScore:    parseFloat(String(ds?.['avg_dream_score']   ?? '0')),
        avgResonance:     parseFloat(String(ds?.['avg_resonance_score'] ?? '0')),
        categoryVariety:  parseInt(String(ds?.['category_variety']   ?? '0')),
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
