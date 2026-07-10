import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class IntelligenceService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  // ── Dream Analysis ────────────────────────────────────────────────────────────

  async getDreamAnalysis(dreamId: string, requesterId: string): Promise<Record<string, unknown>> {
    const dreamRows = await this.db.query<Array<{ id: string; user_id: string; visibility: string }>>(
      `SELECT id, user_id::text, visibility FROM dreams WHERE id = $1 AND deleted_at IS NULL`,
      [dreamId],
    );
    if (!dreamRows.length) throw new NotFoundException('Dream not found');
    const dream = dreamRows[0]!;
    if (dream.user_id !== requesterId && dream.visibility !== 'public') {
      throw new ForbiddenException('Access denied');
    }

    const [analysis, emotions, symbols, figures, themes] = await Promise.all([
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT * FROM dream_analysis WHERE dream_id = $1`,
        [dreamId],
      ),
      this.db.query<Array<{ emotion: string; intensity: string; is_primary: boolean }>>(
        `SELECT emotion, intensity, is_primary FROM dream_emotions WHERE dream_id = $1 ORDER BY is_primary DESC`,
        [dreamId],
      ),
      this.db.query<Array<{ manifestation: string; symbol_category: string; confidence: number }>>(
        `SELECT manifestation, symbol_category, confidence FROM dream_symbols WHERE dream_id = $1 ORDER BY confidence DESC`,
        [dreamId],
      ),
      this.db.query<Array<{ figure_type: string; archetype_candidate: string | null; narrative_role: string | null }>>(
        `SELECT figure_type, archetype_candidate, narrative_role FROM dream_figures WHERE dream_id = $1`,
        [dreamId],
      ),
      this.db.query<Array<{ theme: string; theme_family: string | null; is_primary: boolean }>>(
        `SELECT theme, theme_family, is_primary FROM dream_themes WHERE dream_id = $1 ORDER BY is_primary DESC`,
        [dreamId],
      ),
    ]);

    const an = analysis[0] as Record<string, unknown> | undefined;
    const archetypes = figures
      .filter(f => f.archetype_candidate)
      .map(f => f.archetype_candidate as string)
      .filter((v, i, a) => a.indexOf(v) === i);

    return {
      dreamId,
      dreamScore:       an ? Number(an['dream_score'])     : null,
      resonanceScore:   an ? Number(an['resonance_score']) : null,
      primaryEmotion:   an ? an['primary_emotion']         : (emotions[0]?.emotion ?? null),
      primarySymbol:    an ? an['primary_symbol']          : (symbols[0]?.manifestation ?? null),
      primaryArchetype: an ? an['primary_archetype']       : (archetypes[0] ?? null),
      analyzedAt:       an ? an['processed_at']            : null,
      emotions:  emotions.map(e => ({ emotion: e.emotion, intensity: e.intensity, isPrimary: e.is_primary })),
      symbols:   symbols.map(s => ({ manifestation: s.manifestation, category: s.symbol_category, confidence: Math.round(s.confidence * 100) })),
      archetypes,
      themes:    themes.map(t => ({ theme: t.theme, family: t.theme_family, isPrimary: t.is_primary })),
    };
  }

  // ── Similar Dreams ────────────────────────────────────────────────────────────

  async getSimilarDreams(dreamId: string, requesterId: string, limit = 5): Promise<Array<Record<string, unknown>>> {
    const dreamRows = await this.db.query<Array<{ user_id: string; visibility: string }>>(
      `SELECT user_id::text, visibility FROM dreams WHERE id = $1 AND deleted_at IS NULL`,
      [dreamId],
    );
    if (!dreamRows.length) throw new NotFoundException('Dream not found');
    const dream = dreamRows[0]!;
    if (dream.user_id !== requesterId && dream.visibility !== 'public') {
      throw new ForbiddenException('Access denied');
    }

    return this.db.query<Array<Record<string, unknown>>>(
      `SELECT
         dm.id,
         ROUND((dm.match_score * 100)::numeric, 1)                     AS match_pct,
         dm.resonance_level,
         dm.shared_emotions,
         dm.shared_symbols,
         dm.shared_themes,
         dm.created_at,
         CASE WHEN dm.dream_id_a = $1::uuid THEN db_d.id::text ELSE da.id::text END AS matched_dream_id,
         CASE WHEN dm.dream_id_a = $1::uuid THEN db_d.title    ELSE da.title    END AS matched_dream_title,
         CASE WHEN dm.dream_id_a = $1::uuid THEN ub.id::text   ELSE ua.id::text END AS matched_user_id,
         CASE WHEN dm.dream_id_a = $1::uuid THEN ub.username   ELSE ua.username END AS matched_username,
         COALESCE(array_length(dm.shared_symbols, 1), 0)  AS shared_symbol_count,
         COALESCE(array_length(dm.shared_emotions, 1), 0) AS shared_emotion_count,
         COALESCE(array_length(dm.shared_themes, 1), 0)   AS shared_theme_count
       FROM dream_matches dm
       JOIN dreams da   ON da.id   = dm.dream_id_a
       JOIN dreams db_d ON db_d.id = dm.dream_id_b
       JOIN users  ua   ON ua.id   = dm.user_id_a
       JOIN users  ub   ON ub.id   = dm.user_id_b
       WHERE (dm.dream_id_a = $1::uuid OR dm.dream_id_b = $1::uuid)
         AND (da.visibility   = 'public' OR da.user_id   = $2::uuid)
         AND (db_d.visibility = 'public' OR db_d.user_id = $2::uuid)
       ORDER BY dm.match_score DESC
       LIMIT $3`,
      [dreamId, requesterId, limit],
    );
  }

  // ── User Resonance ────────────────────────────────────────────────────────────

  async getUserResonance(userId: string): Promise<Record<string, unknown>> {
    const storedRows = await this.db.query<Array<Record<string, unknown>>>(
      `SELECT resonance_level, collective_alignment, dream_uniqueness_score,
              connection_count, avg_match_score, computed_at
       FROM user_resonance_scores WHERE user_id = $1`,
      [userId],
    );

    if (storedRows.length) {
      const row = storedRows[0] as Record<string, unknown>;
      return {
        resonanceLevel:       String(row['resonance_level']),
        collectiveAlignment:  Number(row['collective_alignment']),
        dreamUniquenessScore: Number(row['dream_uniqueness_score']),
        connectionCount:      Number(row['connection_count']),
        avgMatchScore:        Number(row['avg_match_score']),
        computedAt:           row['computed_at'],
        source: 'cached',
      };
    }

    const matchRows = await this.db.query<Array<Record<string, unknown>>>(
      `SELECT
         COUNT(DISTINCT other_id)::int                  AS connection_count,
         ROUND(AVG(match_score)::numeric, 3)            AS avg_score
       FROM (
         SELECT user_id_b AS other_id, match_score FROM dream_matches WHERE user_id_a = $1
         UNION ALL
         SELECT user_id_a AS other_id, match_score FROM dream_matches WHERE user_id_b = $1
       ) t`,
      [userId],
    );

    const m = matchRows[0] as Record<string, unknown> | undefined;
    const avgScore       = parseFloat(String(m?.['avg_score'] ?? '0'));
    const connectionCount = parseInt(String(m?.['connection_count'] ?? '0'));
    const resonanceLevel =
      avgScore >= 0.80 ? 'cosmic'
      : avgScore >= 0.60 ? 'deep'
      : avgScore >= 0.40 ? 'surface'
      : 'dormant';

    return {
      resonanceLevel,
      collectiveAlignment:  Math.round(avgScore * 100),
      dreamUniquenessScore: 50,
      connectionCount,
      avgMatchScore:        avgScore,
      computedAt:           null,
      source: 'realtime',
    };
  }

  // ── Collective Mood ───────────────────────────────────────────────────────────

  async getCollectiveMood(): Promise<Record<string, unknown>> {
    const [dominantEmotions, emergingSymbols, platformStats, resonanceStats] = await Promise.all([
      this.db.query<Array<{ emotion: string; cnt: string }>>(
        `SELECT de.emotion, COUNT(*) AS cnt
         FROM dream_emotions de
         JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL
         WHERE d.created_at > NOW() - INTERVAL '7 days'
         GROUP BY de.emotion ORDER BY cnt DESC LIMIT 3`,
      ),
      this.db.query<Array<{ manifestation: string; current_count: string; growth: string }>>(
        `WITH cur AS (
           SELECT ds.manifestation, COUNT(*) AS cnt
           FROM dream_symbols ds JOIN dreams d ON d.id = ds.dream_id AND d.deleted_at IS NULL
           WHERE d.created_at > NOW() - INTERVAL '7 days'
           GROUP BY ds.manifestation
         ), prior AS (
           SELECT ds.manifestation, COUNT(*) AS cnt
           FROM dream_symbols ds JOIN dreams d ON d.id = ds.dream_id AND d.deleted_at IS NULL
           WHERE d.created_at > NOW() - INTERVAL '14 days'
             AND d.created_at <= NOW() - INTERVAL '7 days'
           GROUP BY ds.manifestation
         )
         SELECT c.manifestation,
                c.cnt::int AS current_count,
                (c.cnt - COALESCE(p.cnt, 0))::int AS growth
         FROM cur c LEFT JOIN prior p ON p.manifestation = c.manifestation
         ORDER BY growth DESC LIMIT 5`,
      ),
      this.db.query<Array<{ total_dreams: string; active_users: string }>>(
        `SELECT
           (SELECT COUNT(*) FROM dreams WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '7 days')::int AS total_dreams,
           (SELECT COUNT(DISTINCT user_id) FROM dreams WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '7 days')::int AS active_users`,
      ),
      this.db.query<Array<{ count: string; avg_score: string }>>(
        `SELECT COUNT(*)::int AS count,
                ROUND(AVG(match_score * 100)::numeric, 1) AS avg_score
         FROM dream_matches WHERE created_at > NOW() - INTERVAL '7 days'`,
      ),
    ]);

    const ps = platformStats[0] as Record<string, unknown> | undefined;
    const rs = resonanceStats[0] as Record<string, unknown> | undefined;
    const totalDreams    = parseInt(String(ps?.['total_dreams']  ?? '0'));
    const resonanceCount = parseInt(String(rs?.['count']         ?? '0'));
    const avgResonance   = parseFloat(String(rs?.['avg_score']   ?? '0'));

    const platformMood =
      avgResonance >= 75 ? 'UNIFIED'
      : avgResonance >= 55 ? 'RESONANT'
      : totalDreams > 10  ? 'FRAGMENTED'
      : 'DISPERSED';

    return {
      dominantEmotion:          dominantEmotions[0]?.emotion ?? null,
      dominantEmotionCount:     parseInt(dominantEmotions[0]?.cnt ?? '0'),
      topEmotions:              dominantEmotions.map(e => ({ emotion: e.emotion, count: parseInt(e.cnt) })),
      emergingSymbols:          emergingSymbols.map(s => ({
                                  symbol: s.manifestation,
                                  count:  parseInt(s.current_count),
                                  growth: parseInt(s.growth),
                                })),
      platformMood,
      totalDreamsLast7Days:     totalDreams,
      activeUsersLast7Days:     parseInt(String(ps?.['active_users']  ?? '0')),
      resonanceEventsLast7Days: resonanceCount,
      avgResonanceScore:        avgResonance,
      fetchedAt:                new Date().toISOString(),
    };
  }

  // ── User Connections ──────────────────────────────────────────────────────────

  async getUserConnections(userId: string, limit = 20): Promise<Array<Record<string, unknown>>> {
    return this.db.query<Array<Record<string, unknown>>>(
      `SELECT
         dm.id,
         ROUND((dm.match_score * 100)::numeric, 1)                          AS match_pct,
         dm.resonance_level,
         dm.shared_emotions,
         dm.shared_symbols,
         dm.shared_themes,
         dm.shared_archetypes,
         dm.created_at,
         CASE WHEN dm.user_id_a = $1::uuid THEN ub.id::text   ELSE ua.id::text   END AS matched_user_id,
         CASE WHEN dm.user_id_a = $1::uuid THEN ub.username   ELSE ua.username   END AS matched_username,
         CASE WHEN dm.user_id_a = $1::uuid THEN db_d.id::text ELSE da.id::text   END AS matched_dream_id,
         CASE WHEN dm.user_id_a = $1::uuid THEN db_d.title    ELSE da.title      END AS matched_dream_title,
         CASE WHEN dm.user_id_a = $1::uuid THEN da.id::text   ELSE db_d.id::text END AS my_dream_id,
         CASE WHEN dm.user_id_a = $1::uuid THEN da.title      ELSE db_d.title    END AS my_dream_title,
         COALESCE(array_length(dm.shared_symbols, 1), 0)  AS shared_symbol_count,
         COALESCE(array_length(dm.shared_emotions, 1), 0) AS shared_emotion_count
       FROM dream_matches dm
       JOIN dreams da   ON da.id   = dm.dream_id_a
       JOIN dreams db_d ON db_d.id = dm.dream_id_b
       JOIN users  ua   ON ua.id   = dm.user_id_a
       JOIN users  ub   ON ub.id   = dm.user_id_b
       WHERE (dm.user_id_a = $1::uuid OR dm.user_id_b = $1::uuid)
       ORDER BY dm.created_at DESC
       LIMIT $2`,
      [userId, limit],
    );
  }

  // ── Intelligence Notifications ────────────────────────────────────────────────

  async getIntelligenceNotifications(userId: string, limit = 20): Promise<Array<Record<string, unknown>>> {
    const username = await this.getUsernameById(userId);

    const [matchEvents, seenEvents, aiEvents] = await Promise.all([
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT
           dm.id,
           'DREAM_MATCH'                                                         AS notification_type,
           ROUND((dm.match_score * 100)::numeric, 1)                            AS score,
           dm.resonance_level,
           dm.shared_emotions[1]                                                 AS primary_shared,
           dm.shared_symbols[1]                                                  AS primary_symbol,
           dm.created_at                                                         AS occurred_at,
           CASE WHEN dm.user_id_a = $1::uuid THEN ub.username ELSE ua.username END AS other_username,
           CASE WHEN dm.user_id_a = $1::uuid THEN db_d.title  ELSE da.title    END AS other_dream_title
         FROM dream_matches dm
         JOIN dreams da   ON da.id   = dm.dream_id_a
         JOIN dreams db_d ON db_d.id = dm.dream_id_b
         JOIN users  ua   ON ua.id   = dm.user_id_a
         JOIN users  ub   ON ub.id   = dm.user_id_b
         WHERE (dm.user_id_a = $1::uuid OR dm.user_id_b = $1::uuid)
         ORDER BY dm.created_at DESC LIMIT 10`,
        [userId],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT
           sid.id,
           'SEEN_IN_DREAMS'   AS notification_type,
           sid.pattern_type,
           sid.pattern_value,
           sid.user_count,
           sid.confidence_score,
           sid.last_seen_at   AS occurred_at
         FROM seen_in_dreams sid
         WHERE $1 = ANY(sid.sample_usernames)
         ORDER BY sid.last_seen_at DESC LIMIT 5`,
        [username],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT
           id,
           'AI_EVENT'   AS notification_type,
           category,
           message,
           detail,
           severity,
           created_at   AS occurred_at
         FROM ai_events
         WHERE severity IN ('warning', 'critical')
           AND read_at IS NULL
         ORDER BY created_at DESC LIMIT 5`,
      ),
    ]);

    const merged: Array<Record<string, unknown>> = [
      ...matchEvents,
      ...seenEvents,
      ...aiEvents,
    ];

    return merged
      .sort((a, b) =>
        new Date(String(b['occurred_at'])).getTime() - new Date(String(a['occurred_at'])).getTime(),
      )
      .slice(0, limit);
  }

  // ── Personal Dream Timeline ───────────────────────────────────────────────────

  async getUserDreamTimeline(userId: string): Promise<Record<string, unknown>> {
    const [emotionHistory, symbolEvolution, resonanceHistory, dreamFrequency, totals] = await Promise.all([
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
                dm.resonance_level
         FROM dream_matches dm
         WHERE dm.user_id_a = $1::uuid OR dm.user_id_b = $1::uuid
         ORDER BY dm.created_at DESC LIMIT 30`,
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
        `SELECT COUNT(*)::int                               AS total_dreams,
                ROUND(AVG(da.dream_score)::numeric, 1)     AS avg_dream_score,
                ROUND(AVG(da.resonance_score)::numeric, 1) AS avg_resonance
         FROM dreams d LEFT JOIN dream_analysis da ON da.dream_id = d.id
         WHERE d.user_id = $1 AND d.deleted_at IS NULL`,
        [userId],
      ),
    ]);

    return { emotionHistory, symbolEvolution, resonanceHistory, dreamFrequency, totals: totals[0] };
  }

  // ── Dream Graph (mobile, access-checked) ─────────────────────────────────────

  async getDreamGraphForUser(dreamId: string, requesterId: string): Promise<Record<string, unknown>> {
    const dreamRows = await this.db.query<Array<{ user_id: string; visibility: string }>>(
      `SELECT user_id::text, visibility FROM dreams WHERE id = $1 AND deleted_at IS NULL`,
      [dreamId],
    );
    if (!dreamRows.length) return { dreamId, nodes: [], connections: [], summary: {} };
    const dream = dreamRows[0]!;
    if (dream.user_id !== requesterId && dream.visibility !== 'public') {
      return { dreamId, nodes: [], connections: [], summary: {}, accessDenied: true };
    }

    const [symbols, emotions, figures, themes, places, connections] = await Promise.all([
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT manifestation AS label, symbol_category AS category, ROUND(confidence * 100)::int AS weight FROM dream_symbols WHERE dream_id = $1 ORDER BY confidence DESC`, [dreamId]),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT emotion AS label, intensity, is_primary FROM dream_emotions WHERE dream_id = $1`, [dreamId]),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT archetype_candidate AS label, COALESCE(ROUND(archetype_confidence * 100)::int, 50) AS weight FROM dream_figures WHERE dream_id = $1 AND archetype_candidate IS NOT NULL`, [dreamId]),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT theme AS label, is_primary FROM dream_themes WHERE dream_id = $1`, [dreamId]),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT COALESCE(name, location_type) AS label, emotional_tone FROM dream_places WHERE dream_id = $1 AND (name IS NOT NULL OR location_type IS NOT NULL)`, [dreamId]),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT dm.id, ROUND((dm.match_score * 100)::numeric, 1) AS score, dm.resonance_level,
                dm.shared_symbols, dm.shared_emotions,
                CASE WHEN dm.dream_id_a = $1::uuid THEN ub.username ELSE ua.username END AS other_user,
                CASE WHEN dm.dream_id_a = $1::uuid THEN db_d.title  ELSE da.title    END AS other_title
         FROM dream_matches dm
         JOIN dreams da ON da.id = dm.dream_id_a JOIN dreams db_d ON db_d.id = dm.dream_id_b
         JOIN users ua ON ua.id = dm.user_id_a   JOIN users ub ON ub.id = dm.user_id_b
         WHERE (dm.dream_id_a = $1::uuid OR dm.dream_id_b = $1::uuid)
           AND (da.visibility = 'public' OR da.user_id = $2::uuid)
           AND (db_d.visibility = 'public' OR db_d.user_id = $2::uuid)
         ORDER BY dm.match_score DESC LIMIT 6`,
        [dreamId, requesterId],
      ),
    ]);

    const nodes: Array<Record<string, unknown>> = [
      ...symbols.map( (s, i) => ({ id: `sym_${i}`, type: 'symbol',    label: s['label'], weight: Number(s['weight']), color: '#60A5FA' })),
      ...emotions.map((e, i) => ({ id: `emo_${i}`, type: 'emotion',   label: e['label'], isPrimary: e['is_primary'],  color: '#F472B6' })),
      ...figures.map( (f, i) => ({ id: `arc_${i}`, type: 'archetype', label: f['label'], weight: Number(f['weight']), color: '#FBBF24' })),
      ...themes.map(  (t, i) => ({ id: `thm_${i}`, type: 'theme',     label: t['label'], isPrimary: t['is_primary'],  color: '#A78BFA' })),
      ...places.map(  (p, i) => ({ id: `plc_${i}`, type: 'place',     label: p['label'], tone: p['emotional_tone'],   color: '#34D399' })),
    ];

    return {
      dreamId, nodes, connections,
      summary: { symbolCount: symbols.length, emotionCount: emotions.length, archetypeCount: figures.length, themeCount: themes.length, placeCount: places.length, connectionCount: connections.length },
    };
  }

  // ── Personal AI Insights ──────────────────────────────────────────────────────

  async getUserAIInsights(userId: string): Promise<Record<string, unknown>> {
    const [topEmotions, topSymbols, topArchetypes, resonanceStats, dreamStats, moodTrend] = await Promise.all([
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT de.emotion, COUNT(*)::int AS count,
                ROUND(AVG(CASE de.intensity WHEN 'low' THEN 1 WHEN 'moderate' THEN 2 WHEN 'high' THEN 3 WHEN 'intense' THEN 4 WHEN 'overwhelming' THEN 5 END)::numeric, 1) AS avg_intensity
         FROM dream_emotions de JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL
         WHERE d.user_id = $1 GROUP BY de.emotion ORDER BY count DESC LIMIT 5`, [userId]),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT ds.manifestation, COUNT(*)::int AS count
         FROM dream_symbols ds JOIN dreams d ON d.id = ds.dream_id AND d.deleted_at IS NULL
         WHERE d.user_id = $1 GROUP BY ds.manifestation ORDER BY count DESC LIMIT 5`, [userId]),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT df.archetype_candidate AS archetype, COUNT(*)::int AS count
         FROM dream_figures df JOIN dreams d ON d.id = df.dream_id AND d.deleted_at IS NULL
         WHERE d.user_id = $1 AND df.archetype_candidate IS NOT NULL
         GROUP BY df.archetype_candidate ORDER BY count DESC LIMIT 3`, [userId]),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT COUNT(*)::int AS total, ROUND(AVG(match_score * 100)::numeric, 1) AS avg_score, MAX(match_score * 100)::int AS peak_score
         FROM dream_matches WHERE user_id_a = $1 OR user_id_b = $1`, [userId]),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT COUNT(*)::int AS total_dreams, ROUND(AVG(da.dream_score)::numeric, 1) AS avg_dream_score, ROUND(AVG(da.resonance_score)::numeric, 1) AS avg_resonance
         FROM dreams d LEFT JOIN dream_analysis da ON da.dream_id = d.id WHERE d.user_id = $1 AND d.deleted_at IS NULL`, [userId]),
      this.db.query<Array<Record<string, unknown>>>(
        `WITH cur AS (SELECT de.emotion, COUNT(*)::int AS cnt FROM dream_emotions de JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL WHERE d.user_id = $1 AND d.created_at > NOW() - INTERVAL '4 weeks' GROUP BY de.emotion ORDER BY cnt DESC LIMIT 1),
              prior AS (SELECT de.emotion, COUNT(*)::int AS cnt FROM dream_emotions de JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL WHERE d.user_id = $1 AND d.created_at BETWEEN NOW() - INTERVAL '8 weeks' AND NOW() - INTERVAL '4 weeks' GROUP BY de.emotion ORDER BY cnt DESC LIMIT 1)
         SELECT c.emotion AS current_mood, p.emotion AS prior_mood FROM cur c, prior p`, [userId]),
    ]);

    const rs = resonanceStats[0] as Record<string, unknown> | undefined;
    const ds = dreamStats[0]     as Record<string, unknown> | undefined;
    const mt = moodTrend[0]      as Record<string, unknown> | undefined;

    const insights: Array<{ type: string; title: string; body: string; color: string }> = [];
    const te = topEmotions[0] as Record<string, unknown> | undefined;
    const ts = topSymbols[0]  as Record<string, unknown> | undefined;
    const ta = topArchetypes[0] as Record<string, unknown> | undefined;

    if (te) insights.push({ type: 'emotion',   title: 'Baskın Duygu',        body: `Bilinçaltın en sık "${String(te['emotion'])}" duygusunu işliyor — ${String(te['count'])} rüyada, ortalama yoğunluk ${String(te['avg_intensity'])}/5.`,                                       color: '#F472B6' });
    if (ts) insights.push({ type: 'symbol',    title: 'Tekrarlayan Sembol',   body: `"${String(ts['manifestation'])}" sembolü ${String(ts['count'])} rüyanda ortaya çıktı. Bu sembol bilinçaltında önemli bir yer tutuyor.`,                                                          color: '#60A5FA' });
    if (ta) insights.push({ type: 'archetype', title: 'Aktif Arketip',        body: `"${String(ta['archetype'])}" ${String(ta['count'])} rüyanda belirdi. Bu Jung arketipinin aktif bir mesajı olabilir.`,                                                                              color: '#FBBF24' });
    if (rs && Number(rs['total']) > 0) insights.push({ type: 'resonance', title: 'Rezonans Kapasitesi', body: `${String(rs['total'])} kişiyle bilinçaltı bağlantısı kuruldu. Ortalama uyum: ${String(rs['avg_score'])}%. Zirve: ${String(rs['peak_score'])}%.`,                       color: '#A78BFA' });
    if (mt?.['current_mood']) {
      const shifted = mt['current_mood'] !== mt['prior_mood'];
      insights.push({ type: 'trend', title: 'Duygu Akışı', body: shifted ? `Baskın mod "${String(mt['prior_mood'])}"dan "${String(mt['current_mood'])}"ya döndü — aktif bir dönüşüm var.` : `"${String(mt['current_mood'])}" modu son 8 haftadır tutarlı — güçlü bir duygusal temel.`, color: '#34D399' });
    }

    return {
      insights, topEmotions, topSymbols, topArchetypes,
      resonanceStats: { total: parseInt(String(rs?.['total'] ?? '0')), avgScore: parseFloat(String(rs?.['avg_score'] ?? '0')), peakScore: parseInt(String(rs?.['peak_score'] ?? '0')) },
      dreamStats:     { totalDreams: parseInt(String(ds?.['total_dreams'] ?? '0')), avgDreamScore: parseFloat(String(ds?.['avg_dream_score'] ?? '0')), avgResonance: parseFloat(String(ds?.['avg_resonance'] ?? '0')) },
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Recent Platform Events (mobile, anonymized) ───────────────────────────────

  async getRecentPlatformEvents(limit = 20): Promise<Array<Record<string, unknown>>> {
    const [dreams, matches] = await Promise.all([
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT 'NEW_DREAM' AS event_type, d.id, d.category, d.created_at AS occurred_at,
                LEFT(u.username, 1) || REPEAT('*', LENGTH(u.username) - 1) AS anon_user
         FROM dreams d JOIN users u ON u.id = d.user_id
         WHERE d.deleted_at IS NULL AND d.visibility = 'public' AND d.created_at > NOW() - INTERVAL '24 hours'
         ORDER BY d.created_at DESC LIMIT 10`,
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT 'RESONANCE_EVENT' AS event_type, dm.id,
                ROUND((dm.match_score * 100)::numeric, 0) AS score_pct,
                dm.resonance_level, dm.shared_emotions[1] AS top_emotion,
                dm.shared_symbols[1] AS top_symbol, dm.created_at AS occurred_at
         FROM dream_matches dm
         WHERE dm.match_score >= 0.60 AND dm.created_at > NOW() - INTERVAL '24 hours'
         ORDER BY dm.match_score DESC LIMIT 10`,
      ),
    ]);

    const merged: Array<Record<string, unknown>> = [...dreams, ...matches];
    return merged
      .sort((a, b) => new Date(String(b['occurred_at'])).getTime() - new Date(String(a['occurred_at'])).getTime())
      .slice(0, limit);
  }

  // ── Smart Notifications ───────────────────────────────────────────────────────

  async getSmartNotifications(userId: string): Promise<Array<Record<string, unknown>>> {
    const username = await this.getUsernameById(userId);

    const [highMatches, seenPatterns, resonanceLevelRows, moodAlert] = await Promise.all([
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT 'RESONANCE_ALERT' AS type, dm.id,
                ROUND((dm.match_score * 100)::numeric, 1) AS score,
                dm.resonance_level,
                CASE WHEN dm.user_id_a = $1::uuid THEN ub.username ELSE ua.username END AS other_user,
                dm.shared_emotions[1] AS top_emotion,
                dm.shared_symbols[1]  AS top_symbol,
                dm.created_at AS occurred_at
         FROM dream_matches dm
         JOIN users ua ON ua.id = dm.user_id_a JOIN users ub ON ub.id = dm.user_id_b
         WHERE (dm.user_id_a = $1::uuid OR dm.user_id_b = $1::uuid)
           AND dm.match_score >= 0.60 AND dm.created_at > NOW() - INTERVAL '48 hours'
         ORDER BY dm.match_score DESC LIMIT 3`,
        [userId],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT 'SYMBOL_EVENT' AS type, sid.id, sid.pattern_type, sid.pattern_value,
                sid.user_count, sid.confidence_score, sid.last_seen_at AS occurred_at
         FROM seen_in_dreams sid
         WHERE $1 = ANY(sid.sample_usernames) AND sid.last_seen_at > NOW() - INTERVAL '7 days'
         ORDER BY sid.user_count DESC LIMIT 2`,
        [username],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT resonance_level, collective_alignment FROM user_resonance_scores WHERE user_id = $1`,
        [userId],
      ),
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT de.emotion, COUNT(*) AS cnt FROM dream_emotions de
         JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL
         WHERE d.created_at > NOW() - INTERVAL '24 hours'
         GROUP BY de.emotion ORDER BY cnt DESC LIMIT 1`,
      ),
    ]);

    const notifs: Array<Record<string, unknown>> = [];

    for (const m of highMatches) {
      notifs.push({
        id: String(m['id']), type: 'RESONANCE_ALERT',
        priority: Number(m['score']) >= 80 ? 'high' : 'medium',
        title: 'Güçlü Rezonans Tespit Edildi',
        body: `@${String(m['other_user'])} ile ${String(m['score'])}% bilinçaltı uyumu — ${String(m['resonance_level'])} seviye`,
        data: m, occurred_at: m['occurred_at'],
      });
    }
    for (const p of seenPatterns) {
      notifs.push({
        id: String(p['id']), type: 'SYMBOL_EVENT',
        priority: 'medium',
        title: 'Ortak Sembol Tespit Edildi',
        body: `"${String(p['pattern_value'])}" ${String(p['user_count'])} rüyacının bilinçaltında görüldü.`,
        data: p, occurred_at: p['occurred_at'],
      });
    }

    const rl = resonanceLevelRows[0] as Record<string, unknown> | undefined;
    if (rl && (String(rl['resonance_level']) === 'cosmic' || String(rl['resonance_level']) === 'deep')) {
      notifs.push({
        id: `level_${userId}`, type: 'CONNECTION_EVENT',
        priority: 'low',
        title: `Rezonans Seviyesi: ${String(rl['resonance_level']).toUpperCase()}`,
        body: `Kolektif uyumun ${Math.round(Number(rl['collective_alignment']))}% — platformun en bağlantılı rüyacıları arasındasın.`,
        data: rl, occurred_at: new Date().toISOString(),
      });
    }

    const ma = moodAlert[0] as Record<string, unknown> | undefined;
    if (ma) {
      notifs.push({
        id: `mood_${Date.now()}`, type: 'COLLECTIVE_MOOD',
        priority: 'low',
        title: `Platform Modu: ${String(ma['emotion']).toUpperCase()}`,
        body: `Bugün ${String(ma['cnt'])} rüyacı "${String(ma['emotion'])}" duygusunu taşıyor.`,
        data: ma, occurred_at: new Date().toISOString(),
      });
    }

    const order = { high: 0, medium: 1, low: 2 };
    return notifs.sort((a, b) => (order[String(a['priority']) as keyof typeof order] ?? 3) - (order[String(b['priority']) as keyof typeof order] ?? 3));
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private async getUsernameById(userId: string): Promise<string> {
    const rows = await this.db.query<Array<{ username: string }>>(
      `SELECT username FROM users WHERE id = $1`,
      [userId],
    );
    return rows[0]?.username ?? '';
  }
}
