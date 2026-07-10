import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class WorldModelService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  // ── Dream Weather Engine ─────────────────────────────────────────────────────

  async getDreamWeatherEngine(days = 7): Promise<Record<string, unknown>> {
    const [climate, pressure, forecast, intensityDist] = await Promise.all([
      // Emotional climate: top emotions + distribution over window
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT de.emotion,
                COUNT(*)::int                                              AS count,
                ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) AS pct,
                ROUND(AVG(CASE de.intensity
                  WHEN 'low'          THEN 1
                  WHEN 'moderate'     THEN 2
                  WHEN 'high'         THEN 3
                  WHEN 'intense'      THEN 4
                  WHEN 'overwhelming' THEN 5
                  END)::numeric, 2)                                        AS avg_intensity
         FROM dream_emotions de
         JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL
         WHERE d.created_at > NOW() - ($1 || ' days')::INTERVAL
         GROUP BY de.emotion
         ORDER BY count DESC LIMIT 10`,
        [String(days)],
      ).catch(() => [] as Array<Record<string, unknown>>),
      // Emotional pressure: ratio of high-intensity negative emotions
      this.db.query<Array<Record<string, unknown>>>(
        `WITH window_emo AS (
           SELECT de.emotion, de.intensity
           FROM dream_emotions de
           JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL
           WHERE d.created_at > NOW() - ($1 || ' days')::INTERVAL
         )
         SELECT
           COUNT(*)::int                                                                   AS total_signals,
           COUNT(CASE WHEN emotion IN ('fear','anger','anxiety','grief','sadness') THEN 1 END)::int AS negative_count,
           COUNT(CASE WHEN intensity IN ('intense','overwhelming')                 THEN 1 END)::int AS high_intensity_count,
           ROUND(COUNT(CASE WHEN emotion IN ('fear','anger','anxiety','grief','sadness') THEN 1 END)::numeric
                 / NULLIF(COUNT(*), 0) * 100, 1)                                          AS pressure_pct,
           ROUND(COUNT(CASE WHEN emotion IN ('joy','love','peace','excitement') THEN 1 END)::numeric
                 / NULLIF(COUNT(*), 0) * 100, 1)                                          AS positivity_pct
         FROM window_emo`,
        [String(days)],
      ).catch(() => [] as Array<Record<string, unknown>>),
      // Mood forecast: last 4 weeks weekly dominant emotion → derive next
      this.db.query<Array<Record<string, unknown>>>(
        `WITH weekly AS (
           SELECT DATE_TRUNC('week', d.created_at) AS week,
                  de.emotion, COUNT(*)::int AS cnt
           FROM dream_emotions de
           JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL
           WHERE d.created_at > NOW() - INTERVAL '4 weeks'
           GROUP BY week, de.emotion
         ),
         ranked AS (
           SELECT week, emotion, cnt,
                  ROW_NUMBER() OVER (PARTITION BY week ORDER BY cnt DESC) AS rn
           FROM weekly
         )
         SELECT week::date, emotion, cnt FROM ranked WHERE rn = 1 ORDER BY week ASC`,
      ).catch(() => [] as Array<Record<string, unknown>>),
      // Intensity distribution
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT de.intensity,
                COUNT(*)::int                                              AS count,
                ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) AS pct
         FROM dream_emotions de
         JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL
         WHERE d.created_at > NOW() - ($1 || ' days')::INTERVAL
         GROUP BY de.intensity ORDER BY count DESC`,
        [String(days)],
      ).catch(() => [] as Array<Record<string, unknown>>),
    ]);

    const p = pressure[0] as Record<string, unknown> | undefined;
    const pressureScore = p ? Number(p['pressure_pct'] ?? 0) : 0;
    const positivityScore = p ? Number(p['positivity_pct'] ?? 0) : 0;
    const climateState =
      pressureScore >= 50 ? 'TURBULENT' :
      pressureScore >= 35 ? 'TENSE'     :
      positivityScore >= 60 ? 'RADIANT'  :
      positivityScore >= 40 ? 'BALANCED' : 'NEUTRAL';

    return {
      climate,
      pressure: p ?? null,
      pressureScore,
      positivityScore,
      climateState,
      forecast,
      intensityDist,
      analyzedAt: new Date().toISOString(),
    };
  }

  // ── Symbol Economy ───────────────────────────────────────────────────────────

  async getSymbolEconomy(): Promise<Record<string, unknown>> {
    const [rising, falling, emerging, consistent, totals] = await Promise.all([
      // Rising: highest growth this week vs last
      this.db.query<Array<Record<string, unknown>>>(
        `WITH cur  AS (SELECT ds.manifestation, COUNT(*)::int AS cnt FROM dream_symbols ds JOIN dreams d ON d.id=ds.dream_id AND d.deleted_at IS NULL WHERE d.created_at > NOW()-INTERVAL '7 days'  GROUP BY ds.manifestation HAVING COUNT(*) >= 2),
              prior AS (SELECT ds.manifestation, COUNT(*)::int AS cnt FROM dream_symbols ds JOIN dreams d ON d.id=ds.dream_id AND d.deleted_at IS NULL WHERE d.created_at BETWEEN NOW()-INTERVAL '14 days' AND NOW()-INTERVAL '7 days' GROUP BY ds.manifestation)
         SELECT c.manifestation, c.cnt AS current_count, COALESCE(p.cnt,0) AS prior_count,
                (c.cnt - COALESCE(p.cnt,0))                                                  AS delta,
                ROUND(CASE WHEN COALESCE(p.cnt,0)=0 THEN 100
                      ELSE ((c.cnt - p.cnt)::numeric / p.cnt * 100) END, 1)                  AS growth_pct,
                'rising' AS trend
         FROM cur c LEFT JOIN prior p USING(manifestation)
         WHERE c.cnt > COALESCE(p.cnt,0)
         ORDER BY delta DESC, c.cnt DESC LIMIT 8`,
      ).catch(() => [] as Array<Record<string, unknown>>),
      // Falling: declining symbols
      this.db.query<Array<Record<string, unknown>>>(
        `WITH cur  AS (SELECT ds.manifestation, COUNT(*)::int AS cnt FROM dream_symbols ds JOIN dreams d ON d.id=ds.dream_id AND d.deleted_at IS NULL WHERE d.created_at > NOW()-INTERVAL '7 days'  GROUP BY ds.manifestation),
              prior AS (SELECT ds.manifestation, COUNT(*)::int AS cnt FROM dream_symbols ds JOIN dreams d ON d.id=ds.dream_id AND d.deleted_at IS NULL WHERE d.created_at BETWEEN NOW()-INTERVAL '14 days' AND NOW()-INTERVAL '7 days' GROUP BY ds.manifestation HAVING COUNT(*) >= 2)
         SELECT p.manifestation, COALESCE(c.cnt,0) AS current_count, p.cnt AS prior_count,
                (COALESCE(c.cnt,0) - p.cnt)          AS delta,
                ROUND(((COALESCE(c.cnt,0) - p.cnt)::numeric / p.cnt * 100), 1) AS growth_pct,
                'falling' AS trend
         FROM prior p LEFT JOIN cur c USING(manifestation)
         WHERE COALESCE(c.cnt,0) < p.cnt
         ORDER BY delta ASC LIMIT 8`,
      ).catch(() => [] as Array<Record<string, unknown>>),
      // Emerging: first appearance this week (not in prior month)
      this.db.query<Array<Record<string, unknown>>>(
        `WITH this_week AS (
           SELECT DISTINCT ds.manifestation
           FROM dream_symbols ds JOIN dreams d ON d.id=ds.dream_id AND d.deleted_at IS NULL
           WHERE d.created_at > NOW()-INTERVAL '7 days'
         ),
         last_month AS (
           SELECT DISTINCT ds.manifestation
           FROM dream_symbols ds JOIN dreams d ON d.id=ds.dream_id AND d.deleted_at IS NULL
           WHERE d.created_at BETWEEN NOW()-INTERVAL '30 days' AND NOW()-INTERVAL '7 days'
         ),
         new_syms AS (
           SELECT tw.manifestation FROM this_week tw
           WHERE NOT EXISTS (SELECT 1 FROM last_month lm WHERE lm.manifestation = tw.manifestation)
         )
         SELECT ns.manifestation,
                COUNT(ds.id)::int AS count,
                ROUND(AVG(ds.confidence)::numeric*100, 0)::int AS avg_confidence
         FROM new_syms ns
         JOIN dream_symbols ds ON ds.manifestation = ns.manifestation
         JOIN dreams d ON d.id = ds.dream_id AND d.deleted_at IS NULL
           AND d.created_at > NOW()-INTERVAL '7 days'
         GROUP BY ns.manifestation
         HAVING COUNT(ds.id) >= 2
         ORDER BY count DESC LIMIT 8`,
      ).catch(() => [] as Array<Record<string, unknown>>),
      // Consistent: stable symbols (present in both windows, similar counts)
      this.db.query<Array<Record<string, unknown>>>(
        `WITH cur  AS (SELECT ds.manifestation, COUNT(*)::int AS cnt FROM dream_symbols ds JOIN dreams d ON d.id=ds.dream_id AND d.deleted_at IS NULL WHERE d.created_at > NOW()-INTERVAL '7 days'  GROUP BY ds.manifestation HAVING COUNT(*) >= 3),
              prior AS (SELECT ds.manifestation, COUNT(*)::int AS cnt FROM dream_symbols ds JOIN dreams d ON d.id=ds.dream_id AND d.deleted_at IS NULL WHERE d.created_at BETWEEN NOW()-INTERVAL '14 days' AND NOW()-INTERVAL '7 days' GROUP BY ds.manifestation HAVING COUNT(*) >= 3)
         SELECT c.manifestation, c.cnt AS current_count, p.cnt AS prior_count,
                ABS(c.cnt - p.cnt)::int AS abs_delta
         FROM cur c JOIN prior p USING(manifestation)
         WHERE ABS(c.cnt - p.cnt) <= GREATEST(1, ROUND(p.cnt * 0.2))
         ORDER BY c.cnt DESC LIMIT 6`,
      ).catch(() => [] as Array<Record<string, unknown>>),
      // Totals
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT COUNT(DISTINCT manifestation)::int AS unique_symbols,
                COUNT(*)::int                      AS total_appearances,
                ROUND(AVG(confidence)::numeric*100, 1) AS avg_confidence
         FROM dream_symbols ds
         JOIN dreams d ON d.id=ds.dream_id AND d.deleted_at IS NULL
         WHERE d.created_at > NOW()-INTERVAL '7 days'`,
      ).catch(() => [] as Array<Record<string, unknown>>),
    ]);

    return { rising, falling, emerging, consistent, totals: totals[0] ?? null, fetchedAt: new Date().toISOString() };
  }

  // ── Archetype Dynamics ───────────────────────────────────────────────────────

  async getArchetypeDynamics(weeks = 8): Promise<Record<string, unknown>> {
    const [dominant, weeklyTrend, activationChanges, archetypeEmotionMap] = await Promise.all([
      // Dominant archetypes overall
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT df.archetype_candidate AS archetype,
                COUNT(*)::int                                              AS activations,
                ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) AS pct,
                ROUND(AVG(df.archetype_confidence)::numeric * 100, 1)     AS avg_confidence,
                COUNT(DISTINCT d.user_id)::int                            AS unique_dreamers
         FROM dream_figures df
         JOIN dreams d ON d.id = df.dream_id AND d.deleted_at IS NULL
         WHERE df.archetype_candidate IS NOT NULL
           AND d.created_at > NOW() - ($1 || ' weeks')::INTERVAL
         GROUP BY df.archetype_candidate
         ORDER BY activations DESC LIMIT 10`,
        [String(weeks)],
      ).catch(() => [] as Array<Record<string, unknown>>),
      // Weekly trend: top 5 archetypes by week
      this.db.query<Array<Record<string, unknown>>>(
        `WITH top5 AS (
           SELECT df.archetype_candidate AS archetype, COUNT(*) AS tot
           FROM dream_figures df JOIN dreams d ON d.id=df.dream_id AND d.deleted_at IS NULL
           WHERE df.archetype_candidate IS NOT NULL AND d.created_at > NOW() - ($1 || ' weeks')::INTERVAL
           GROUP BY df.archetype_candidate ORDER BY tot DESC LIMIT 5
         )
         SELECT DATE_TRUNC('week', d.created_at)::date AS week,
                df.archetype_candidate AS archetype, COUNT(*)::int AS count
         FROM dream_figures df
         JOIN dreams d ON d.id=df.dream_id AND d.deleted_at IS NULL
         JOIN top5 ON top5.archetype = df.archetype_candidate
         WHERE d.created_at > NOW() - ($1 || ' weeks')::INTERVAL
         GROUP BY week, df.archetype_candidate ORDER BY week ASC, count DESC`,
        [String(weeks)],
      ).catch(() => [] as Array<Record<string, unknown>>),
      // Activation changes: this week vs last
      this.db.query<Array<Record<string, unknown>>>(
        `WITH cur  AS (SELECT df.archetype_candidate AS archetype, COUNT(*)::int AS cnt FROM dream_figures df JOIN dreams d ON d.id=df.dream_id AND d.deleted_at IS NULL WHERE df.archetype_candidate IS NOT NULL AND d.created_at > NOW()-INTERVAL '7 days' GROUP BY df.archetype_candidate),
              prior AS (SELECT df.archetype_candidate AS archetype, COUNT(*)::int AS cnt FROM dream_figures df JOIN dreams d ON d.id=df.dream_id AND d.deleted_at IS NULL WHERE df.archetype_candidate IS NOT NULL AND d.created_at BETWEEN NOW()-INTERVAL '14 days' AND NOW()-INTERVAL '7 days' GROUP BY df.archetype_candidate)
         SELECT COALESCE(c.archetype, p.archetype) AS archetype,
                COALESCE(c.cnt, 0) AS current_count, COALESCE(p.cnt, 0) AS prior_count,
                (COALESCE(c.cnt,0) - COALESCE(p.cnt,0)) AS delta,
                ROUND(CASE WHEN COALESCE(p.cnt,0)=0 THEN 100
                      ELSE ((COALESCE(c.cnt,0)-COALESCE(p.cnt,0))::numeric/COALESCE(p.cnt,1)*100) END, 1) AS pct_change
         FROM cur c FULL OUTER JOIN prior p USING(archetype)
         ORDER BY ABS(COALESCE(c.cnt,0)-COALESCE(p.cnt,0)) DESC LIMIT 10`,
      ).catch(() => [] as Array<Record<string, unknown>>),
      // Archetype → dominant emotion pairing
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT df.archetype_candidate AS archetype,
                de.emotion,
                COUNT(*)::int AS co_occurrences
         FROM dream_figures df
         JOIN dreams d ON d.id=df.dream_id AND d.deleted_at IS NULL
         JOIN dream_emotions de ON de.dream_id=d.id
         WHERE df.archetype_candidate IS NOT NULL
           AND d.created_at > NOW() - ($1 || ' weeks')::INTERVAL
         GROUP BY df.archetype_candidate, de.emotion
         HAVING COUNT(*) >= 2
         ORDER BY df.archetype_candidate, co_occurrences DESC`,
        [String(weeks)],
      ).catch(() => [] as Array<Record<string, unknown>>),
    ]);

    return { dominant, weeklyTrend, activationChanges, archetypeEmotionMap, analyzedAt: new Date().toISOString() };
  }

  // ── Consciousness Index ──────────────────────────────────────────────────────

  async getConsciousnessIndex(): Promise<Record<string, unknown>> {
    const [resonanceStats, emotionCoherence, stabilityMetrics, activityMetrics, platformStats] = await Promise.all([
      // Collective awareness: from resonance activity (match_score stored as 0-100 integer)
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT COUNT(*)::int                             AS total_connections,
                ROUND(AVG(match_score)::numeric, 1)       AS avg_resonance,
                COUNT(CASE WHEN match_score >= 80 THEN 1 END)::int AS cosmic_count,
                COUNT(CASE WHEN match_score >= 60 THEN 1 END)::int AS deep_count,
                COUNT(DISTINCT user_id_a)::int + COUNT(DISTINCT user_id_b)::int AS connected_dreamers
         FROM dream_matches WHERE created_at > NOW() - INTERVAL '30 days'`,
      ).catch(() => [] as Array<Record<string, unknown>>),
      // Coherence: how concentrated emotions are (high = coherent, low = fragmented)
      this.db.query<Array<Record<string, unknown>>>(
        `WITH emotion_dist AS (
           SELECT de.emotion, COUNT(*)::numeric AS cnt, SUM(COUNT(*)) OVER () AS total
           FROM dream_emotions de JOIN dreams d ON d.id=de.dream_id AND d.deleted_at IS NULL
           WHERE d.created_at > NOW()-INTERVAL '7 days'
           GROUP BY de.emotion
         )
         SELECT ROUND(SUM(cnt/total * LN(cnt/total)) * -1 * 100 / LN(COUNT(*)), 1) AS entropy_score,
                COUNT(*)::int                  AS distinct_emotions,
                ROUND(MAX(cnt/total)*100, 1)   AS dominant_pct
         FROM emotion_dist`,
      ).catch(() => [] as Array<Record<string, unknown>>),
      // Stability: variance of dominant emotion across weeks
      this.db.query<Array<Record<string, unknown>>>(
        `WITH weekly_dom AS (
           WITH weekly AS (
             SELECT DATE_TRUNC('week', d.created_at) AS week, de.emotion, COUNT(*)::int AS cnt
             FROM dream_emotions de JOIN dreams d ON d.id=de.dream_id AND d.deleted_at IS NULL
             WHERE d.created_at > NOW()-INTERVAL '8 weeks'
             GROUP BY week, de.emotion
           ),
           ranked AS (
             SELECT week, emotion, cnt, ROW_NUMBER() OVER (PARTITION BY week ORDER BY cnt DESC) rn
             FROM weekly
           )
           SELECT emotion FROM ranked WHERE rn=1
         )
         SELECT COUNT(DISTINCT emotion)::int AS unique_dominant_emotions,
                COUNT(*)::int                AS total_weeks
         FROM weekly_dom`,
      ).catch(() => [] as Array<Record<string, unknown>>),
      // Activity metrics
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT COUNT(*)::int  AS dreams_30d,
                COUNT(DISTINCT user_id)::int AS active_dreamers_30d,
                ROUND(COUNT(*)::numeric / 30, 1) AS avg_daily_dreams
         FROM dreams WHERE deleted_at IS NULL AND created_at > NOW()-INTERVAL '30 days'`,
      ).catch(() => [] as Array<Record<string, unknown>>),
      // AI analysis coverage (table is dream_analyses)
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT COUNT(d.id)::int AS total_dreams,
                COUNT(da.id)::int AS analyzed_dreams,
                ROUND(COUNT(da.id)::numeric / NULLIF(COUNT(d.id),0)*100, 1) AS coverage_pct,
                ROUND(COUNT(CASE WHEN da.status = 'completed' THEN 1 END)::numeric / NULLIF(COUNT(d.id),0)*100, 1) AS completion_pct
         FROM dreams d LEFT JOIN dream_analyses da ON da.dream_id=d.id
         WHERE d.deleted_at IS NULL AND d.created_at > NOW()-INTERVAL '30 days'`,
      ).catch(() => [] as Array<Record<string, unknown>>),
    ]);

    const rs = resonanceStats[0] as Record<string, unknown> | undefined;
    const ec = emotionCoherence[0] as Record<string, unknown> | undefined;
    const sm = stabilityMetrics[0] as Record<string, unknown> | undefined;
    const am = activityMetrics[0] as Record<string, unknown> | undefined;
    const ps = platformStats[0]   as Record<string, unknown> | undefined;

    // Compute scores (0-100)
    const awarenessScore = Math.min(100, Math.round(
      (Number(rs?.['total_connections'] ?? 0) / 10) * 0.4 +
      Number(rs?.['avg_resonance'] ?? 0) * 0.6,
    ));
    const coherenceScore = Math.min(100, Math.round(
      100 - Number(ec?.['entropy_score'] ?? 50),
    ));
    const stabilityScore = Math.round(
      100 - ((Number(sm?.['unique_dominant_emotions'] ?? 4) - 1) / Math.max(Number(sm?.['total_weeks'] ?? 8) - 1, 1)) * 100,
    );

    const overallIndex = Math.round((awarenessScore + coherenceScore + stabilityScore) / 3);

    const indexState =
      overallIndex >= 75 ? 'AWAKENED'  :
      overallIndex >= 55 ? 'RESONANT'  :
      overallIndex >= 35 ? 'FORMING'   : 'DORMANT';

    return {
      awarenessScore, coherenceScore, stabilityScore, overallIndex, indexState,
      resonanceStats: rs ?? null,
      emotionCoherence: ec ?? null,
      stabilityMetrics: sm ?? null,
      activityMetrics: am ?? null,
      platformStats: ps ?? null,
      computedAt: new Date().toISOString(),
    };
  }

  // ── Dream Seasons ────────────────────────────────────────────────────────────

  async getDreamSeasons(): Promise<Record<string, unknown>> {
    const [monthlyEras, transitions, quarterlyProfile, currentSeason] = await Promise.all([
      // Monthly emotional eras: dominant emotion per month
      this.db.query<Array<Record<string, unknown>>>(
        `WITH monthly AS (
           SELECT DATE_TRUNC('month', d.created_at) AS month,
                  de.emotion, COUNT(*)::int AS cnt
           FROM dream_emotions de JOIN dreams d ON d.id=de.dream_id AND d.deleted_at IS NULL
           WHERE d.created_at > NOW()-INTERVAL '12 months'
           GROUP BY month, de.emotion
         ),
         ranked AS (
           SELECT month, emotion, cnt,
                  ROW_NUMBER() OVER (PARTITION BY month ORDER BY cnt DESC)    AS rn_emo,
                  SUM(cnt) OVER (PARTITION BY month)                          AS total
           FROM monthly
         )
         SELECT month::date, emotion,
                ROUND(cnt::numeric / total * 100, 1) AS dominance_pct,
                total::int AS total_signals
         FROM ranked WHERE rn_emo = 1 ORDER BY month DESC`,
      ).catch(() => [] as Array<Record<string, unknown>>),
      // Transition phases: weeks where dominant emotion changed
      this.db.query<Array<Record<string, unknown>>>(
        `WITH weekly AS (
           SELECT DATE_TRUNC('week', d.created_at) AS week,
                  de.emotion, COUNT(*)::int AS cnt
           FROM dream_emotions de JOIN dreams d ON d.id=de.dream_id AND d.deleted_at IS NULL
           WHERE d.created_at > NOW()-INTERVAL '16 weeks'
           GROUP BY week, de.emotion
         ),
         ranked AS (
           SELECT week, emotion, cnt,
                  ROW_NUMBER() OVER (PARTITION BY week ORDER BY cnt DESC) AS rn
           FROM weekly
         ),
         dom AS (SELECT week::date, emotion FROM ranked WHERE rn=1 ORDER BY week)
         SELECT d1.week, d1.emotion AS from_emotion, d2.emotion AS to_emotion,
                CASE WHEN d1.emotion <> d2.emotion THEN true ELSE false END AS is_transition
         FROM dom d1 JOIN dom d2 ON d2.week = (
           SELECT MIN(d3.week) FROM dom d3 WHERE d3.week > d1.week
         )
         WHERE d1.emotion <> d2.emotion
         ORDER BY d1.week DESC LIMIT 8`,
      ).catch(() => [] as Array<Record<string, unknown>>),
      // Quarterly archetype + emotion profile (collective "season" signature)
      this.db.query<Array<Record<string, unknown>>>(
        `WITH quarters AS (
           SELECT DATE_TRUNC('quarter', d.created_at) AS quarter,
                  de.emotion, COUNT(*)::int AS cnt
           FROM dream_emotions de JOIN dreams d ON d.id=de.dream_id AND d.deleted_at IS NULL
           WHERE d.created_at > NOW()-INTERVAL '12 months'
           GROUP BY quarter, de.emotion
         ),
         q_ranked AS (
           SELECT quarter, emotion, cnt,
                  ROW_NUMBER() OVER (PARTITION BY quarter ORDER BY cnt DESC) AS rn
           FROM quarters
         ),
         q_arch AS (
           SELECT DATE_TRUNC('quarter', d.created_at) AS quarter,
                  df.archetype_candidate AS archetype, COUNT(*) AS cnt
           FROM dream_figures df JOIN dreams d ON d.id=df.dream_id AND d.deleted_at IS NULL
           WHERE df.archetype_candidate IS NOT NULL AND d.created_at > NOW()-INTERVAL '12 months'
           GROUP BY quarter, df.archetype_candidate
         ),
         arch_ranked AS (
           SELECT quarter, archetype, ROW_NUMBER() OVER (PARTITION BY quarter ORDER BY cnt DESC) AS rn
           FROM q_arch
         )
         SELECT qr.quarter::date, qr.emotion AS season_emotion, ar.archetype AS season_archetype,
                qr.cnt AS emotion_count
         FROM q_ranked qr LEFT JOIN arch_ranked ar ON ar.quarter=qr.quarter AND ar.rn=1
         WHERE qr.rn=1 ORDER BY qr.quarter DESC`,
      ).catch(() => [] as Array<Record<string, unknown>>),
      // Current season: last 30 days profile
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT de.emotion,
                COUNT(*)::int                                              AS count,
                ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) AS pct
         FROM dream_emotions de JOIN dreams d ON d.id=de.dream_id AND d.deleted_at IS NULL
         WHERE d.created_at > NOW()-INTERVAL '30 days'
         GROUP BY de.emotion ORDER BY count DESC LIMIT 5`,
      ).catch(() => [] as Array<Record<string, unknown>>),
    ]);

    // Derive season name from quarterly profile
    const latestQuarter = quarterlyProfile[0] as Record<string, unknown> | undefined;
    const seasonName = latestQuarter
      ? `${String(latestQuarter['season_archetype'] ?? 'Unknown')} × ${String(latestQuarter['season_emotion'] ?? 'Unknown')}`
      : 'Unknown Season';

    return { monthlyEras, transitions, quarterlyProfile, currentSeason, seasonName, computedAt: new Date().toISOString() };
  }
}
