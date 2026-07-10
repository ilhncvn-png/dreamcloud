import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface CreateAutomationRuleDto {
  name: string;
  description?: string;
  rule_type: 'event' | 'threshold' | 'scheduled';
  trigger_event?: string;
  trigger_threshold?: number;
  trigger_metric?: string;
  trigger_cron?: string;
  action_type: string;
  action_config?: Record<string, unknown>;
}

export interface CreateScenarioDto {
  name: string;
  description?: string;
  if_conditions: Array<{ field: string; operator: string; value: unknown }>;
  then_actions:  Array<{ type: string; config: Record<string, unknown> }>;
  chain_next_id?: string;
}

@Injectable()
export class OsEngineService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  // ── Automation Rules ────────────────────────────────────────────────────────

  async getAutomationRules(): Promise<Array<Record<string, unknown>>> {
    return this.db.query<Array<Record<string, unknown>>>(
      `SELECT id, name, description, rule_type, status,
              trigger_event, trigger_threshold, trigger_metric, trigger_cron,
              action_type, action_config, last_fired_at, fire_count, created_at
       FROM os_automation_rules ORDER BY created_at DESC`,
    );
  }

  async createAutomationRule(dto: CreateAutomationRuleDto, createdBy: string): Promise<Record<string, unknown>> {
    const rows = await this.db.query<Array<Record<string, unknown>>>(
      `INSERT INTO os_automation_rules
         (name, description, rule_type, trigger_event, trigger_threshold, trigger_metric,
          trigger_cron, action_type, action_config, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::uuid)
       RETURNING *`,
      [
        dto.name,
        dto.description ?? null,
        dto.rule_type,
        dto.trigger_event ?? null,
        dto.trigger_threshold ?? null,
        dto.trigger_metric ?? null,
        dto.trigger_cron ?? null,
        dto.action_type,
        JSON.stringify(dto.action_config ?? {}),
        createdBy,
      ],
    );
    return rows[0]!;
  }

  async toggleAutomationRule(id: string): Promise<Record<string, unknown>> {
    const rows = await this.db.query<Array<Record<string, unknown>>>(
      `UPDATE os_automation_rules
       SET status = CASE WHEN status = 'active' THEN 'paused' ELSE 'active' END,
           updated_at = NOW()
       WHERE id = $1 RETURNING id, name, status`,
      [id],
    );
    return rows[0] ?? {};
  }

  async deleteAutomationRule(id: string): Promise<{ deleted: boolean }> {
    await this.db.query(`DELETE FROM os_automation_rules WHERE id = $1`, [id]);
    return { deleted: true };
  }

  // ── Scenario Engine ─────────────────────────────────────────────────────────

  async getScenarios(): Promise<Array<Record<string, unknown>>> {
    return this.db.query<Array<Record<string, unknown>>>(
      `SELECT s.id, s.name, s.description, s.status,
              s.if_conditions, s.then_actions, s.chain_next_id,
              s.last_triggered_at, s.trigger_count,
              cn.name AS chain_next_name, s.created_at
       FROM os_scenario_rules s
       LEFT JOIN os_scenario_rules cn ON cn.id = s.chain_next_id
       ORDER BY s.created_at DESC`,
    );
  }

  async createScenario(dto: CreateScenarioDto, createdBy: string): Promise<Record<string, unknown>> {
    const rows = await this.db.query<Array<Record<string, unknown>>>(
      `INSERT INTO os_scenario_rules
         (name, description, if_conditions, then_actions, chain_next_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6::uuid)
       RETURNING *`,
      [
        dto.name,
        dto.description ?? null,
        JSON.stringify(dto.if_conditions),
        JSON.stringify(dto.then_actions),
        dto.chain_next_id ?? null,
        createdBy,
      ],
    );
    return rows[0]!;
  }

  async toggleScenario(id: string): Promise<Record<string, unknown>> {
    const rows = await this.db.query<Array<Record<string, unknown>>>(
      `UPDATE os_scenario_rules
       SET status = CASE WHEN status = 'active' THEN 'paused' ELSE 'active' END,
           updated_at = NOW()
       WHERE id = $1 RETURNING id, name, status`,
      [id],
    );
    return rows[0] ?? {};
  }

  async deleteScenario(id: string): Promise<{ deleted: boolean }> {
    await this.db.query(`DELETE FROM os_scenario_rules WHERE id = $1`, [id]);
    return { deleted: true };
  }

  // ── Alert Center ────────────────────────────────────────────────────────────

  async getAlerts(hours = 48): Promise<Record<string, unknown>> {
    const [critical, warnings, intelligence, system] = await Promise.all([
      // CRITICAL: high-severity ai_events
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT 'CRITICAL' AS alert_level, id, category, message, detail,
                severity, created_at AS occurred_at
         FROM ai_events
         WHERE severity IN ('critical', 'high')
           AND created_at > NOW() - ($1 || ' hours')::INTERVAL
         ORDER BY created_at DESC LIMIT 20`,
        [String(hours)],
      ),
      // WARNING: admin_notification_queue
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT 'WARNING' AS alert_level, id, type AS category, title AS message,
                message AS detail, severity, created_at AS occurred_at, read_at
         FROM admin_notification_queue
         WHERE severity IN ('warning', 'medium')
           AND created_at > NOW() - ($1 || ' hours')::INTERVAL
         ORDER BY created_at DESC LIMIT 20`,
        [String(hours)],
      ),
      // INTELLIGENCE: medium ai_events + high-match dream activity
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT 'INTELLIGENCE' AS alert_level, id, category, message, detail,
                severity, created_at AS occurred_at
         FROM ai_events
         WHERE severity = 'medium'
           AND created_at > NOW() - ($1 || ' hours')::INTERVAL
         ORDER BY created_at DESC LIMIT 15`,
        [String(hours)],
      ),
      // SYSTEM: platform_health_snapshots anomalies + low/info notifications
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT 'SYSTEM' AS alert_level, id, type AS category, title AS message,
                message AS detail, severity, created_at AS occurred_at
         FROM admin_notification_queue
         WHERE severity IN ('low', 'info')
           AND created_at > NOW() - ($1 || ' hours')::INTERVAL
         ORDER BY created_at DESC LIMIT 15`,
        [String(hours)],
      ),
    ]);

    const counts = {
      critical:     critical.length,
      warnings:     warnings.length,
      intelligence: intelligence.length,
      system:       system.length,
      total:        critical.length + warnings.length + intelligence.length + system.length,
    };

    return { critical, warnings, intelligence, system, counts, fetchedAt: new Date().toISOString() };
  }

  // ── AI Observer ─────────────────────────────────────────────────────────────

  async getAIObserverData(days = 30): Promise<Record<string, unknown>> {
    const [moodTrend, trendDetection, anomalies, collectiveChanges, resonanceTrend] = await Promise.all([
      // Long-term mood analysis: weekly dominant emotion over N weeks
      this.db.query<Array<Record<string, unknown>>>(
        `WITH weeks AS (
           SELECT DATE_TRUNC('week', d.created_at) AS week,
                  de.emotion, COUNT(*)::int AS cnt
           FROM dream_emotions de
           JOIN dreams d ON d.id = de.dream_id AND d.deleted_at IS NULL
           WHERE d.created_at > NOW() - ($1 || ' days')::INTERVAL
           GROUP BY week, de.emotion
         ),
         ranked AS (
           SELECT week, emotion, cnt,
                  ROW_NUMBER() OVER (PARTITION BY week ORDER BY cnt DESC) AS rn
           FROM weeks
         )
         SELECT week::date, emotion, cnt FROM ranked WHERE rn = 1 ORDER BY week ASC`,
        [String(days)],
      ),
      // Trend detection: symbol emergence rate, top 5 growing symbols
      this.db.query<Array<Record<string, unknown>>>(
        `WITH cur  AS (SELECT ds.manifestation, COUNT(*)::int AS cnt FROM dream_symbols ds JOIN dreams d ON d.id=ds.dream_id AND d.deleted_at IS NULL WHERE d.created_at > NOW() - INTERVAL '7 days'  GROUP BY ds.manifestation),
              prior AS (SELECT ds.manifestation, COUNT(*)::int AS cnt FROM dream_symbols ds JOIN dreams d ON d.id=ds.dream_id AND d.deleted_at IS NULL WHERE d.created_at BETWEEN NOW()-INTERVAL '14 days' AND NOW()-INTERVAL '7 days' GROUP BY ds.manifestation)
         SELECT c.manifestation, c.cnt AS current_count, COALESCE(p.cnt,0) AS prior_count,
                (c.cnt - COALESCE(p.cnt,0)) AS growth
         FROM cur c LEFT JOIN prior p USING(manifestation)
         WHERE c.cnt >= 3
         ORDER BY growth DESC LIMIT 8`,
      ),
      // Anomaly detection: days with abnormally high/low dream activity
      this.db.query<Array<Record<string, unknown>>>(
        `WITH daily AS (
           SELECT DATE_TRUNC('day', created_at)::date AS day, COUNT(*)::int AS cnt
           FROM dreams WHERE deleted_at IS NULL AND created_at > NOW() - ($1 || ' days')::INTERVAL
           GROUP BY day
         ),
         stats AS (SELECT AVG(cnt) AS avg, STDDEV(cnt) AS sd FROM daily)
         SELECT d.day, d.cnt,
                ROUND(d.cnt - s.avg, 1)                              AS deviation,
                CASE WHEN d.cnt > s.avg + 2*s.sd THEN 'spike'
                     WHEN d.cnt < s.avg - 2*s.sd THEN 'drop'
                     ELSE 'normal' END                               AS anomaly_type
         FROM daily d, stats s
         WHERE d.cnt > s.avg + 2*s.sd OR d.cnt < s.avg - 2*s.sd
         ORDER BY d.day DESC LIMIT 10`,
        [String(days)],
      ),
      // Collective changes: emotion shift this week vs last
      this.db.query<Array<Record<string, unknown>>>(
        `WITH cur  AS (SELECT de.emotion, COUNT(*)::int AS cnt FROM dream_emotions de JOIN dreams d ON d.id=de.dream_id AND d.deleted_at IS NULL WHERE d.created_at > NOW()-INTERVAL '7 days'  GROUP BY de.emotion),
              prior AS (SELECT de.emotion, COUNT(*)::int AS cnt FROM dream_emotions de JOIN dreams d ON d.id=de.dream_id AND d.deleted_at IS NULL WHERE d.created_at BETWEEN NOW()-INTERVAL '14 days' AND NOW()-INTERVAL '7 days' GROUP BY de.emotion)
         SELECT c.emotion, c.cnt AS current, COALESCE(p.cnt,0) AS prior,
                (c.cnt - COALESCE(p.cnt,0)) AS delta,
                ROUND(((c.cnt - COALESCE(p.cnt,0))::numeric / NULLIF(COALESCE(p.cnt,0),0))*100, 1) AS pct_change
         FROM cur c LEFT JOIN prior p USING(emotion)
         ORDER BY ABS(c.cnt - COALESCE(p.cnt,0)) DESC LIMIT 8`,
      ),
      // Resonance trend: weekly avg match score
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT DATE_TRUNC('week', created_at)::date AS week,
                COUNT(*)::int                         AS matches,
                ROUND(AVG(match_score)::numeric,1) AS avg_score,
                COUNT(CASE WHEN resonance_level='cosmic' THEN 1 END)::int AS cosmic_count
         FROM dream_matches
         WHERE created_at > NOW() - ($1 || ' days')::INTERVAL
         GROUP BY week ORDER BY week ASC`,
        [String(days)],
      ),
    ]);

    return { moodTrend, trendDetection, anomalies, collectiveChanges, resonanceTrend, analyzedAt: new Date().toISOString() };
  }

  // ── Scheduler ───────────────────────────────────────────────────────────────

  async getSchedulerJobs(): Promise<Array<Record<string, unknown>>> {
    return this.db.query<Array<Record<string, unknown>>>(
      `SELECT id, name, description, cron_expr, job_type, status, enabled,
              last_run_at, next_run_at, last_result, run_count, error_count, avg_duration_ms
       FROM os_scheduler_jobs ORDER BY name ASC`,
    );
  }

  async triggerJob(jobName: string): Promise<Record<string, unknown>> {
    const start = Date.now();
    await this.db.query(
      `UPDATE os_scheduler_jobs
       SET status = 'running', last_run_at = NOW(), run_count = run_count + 1, updated_at = NOW()
       WHERE name = $1`,
      [jobName],
    );
    let result = 'ok';
    try {
      result = await this.runJobLogic(jobName);
    } catch (err) {
      await this.db.query(
        `UPDATE os_scheduler_jobs SET status='failed', error_count=error_count+1,
          last_result=$2, avg_duration_ms=$3, updated_at=NOW() WHERE name=$1`,
        [jobName, (err as Error).message, Date.now() - start],
      );
      return { ok: false, job: jobName, error: (err as Error).message };
    }
    const duration = Date.now() - start;
    await this.db.query(
      `UPDATE os_scheduler_jobs
       SET status='completed', last_result=$2, avg_duration_ms=$3,
           next_run_at = NOW() + INTERVAL '1 hour', updated_at=NOW()
       WHERE name=$1`,
      [jobName, result, duration],
    );
    return { ok: true, job: jobName, result, durationMs: duration };
  }

  async toggleSchedulerJob(id: string): Promise<Record<string, unknown>> {
    const rows = await this.db.query<Array<Record<string, unknown>>>(
      `UPDATE os_scheduler_jobs SET enabled = NOT enabled, updated_at = NOW()
       WHERE id = $1 RETURNING id, name, enabled`,
      [id],
    );
    return rows[0] ?? {};
  }

  // ── Private: job logic stubs ─────────────────────────────────────────────────

  private async runJobLogic(jobName: string): Promise<string> {
    switch (jobName) {
      case 'hourly-resonance-scan': {
        const r = await this.db.query<Array<{ count: string }>>(
          `SELECT COUNT(*)::text AS count FROM dream_matches WHERE created_at > NOW() - INTERVAL '1 hour'`,
        );
        return `scanned ${r[0]?.count ?? 0} recent matches`;
      }
      case 'daily-dream-analysis': {
        const r = await this.db.query<Array<{ count: string }>>(
          `SELECT COUNT(*)::text AS count FROM dreams WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '24 hours'`,
        );
        return `checked ${r[0]?.count ?? 0} dreams`;
      }
      case 'daily-collective-mood': {
        const r = await this.db.query<Array<{ emotion: string; cnt: string }>>(
          `SELECT de.emotion, COUNT(*)::text AS cnt FROM dream_emotions de
           JOIN dreams d ON d.id=de.dream_id AND d.deleted_at IS NULL
           WHERE d.created_at > NOW()-INTERVAL '7 days'
           GROUP BY de.emotion ORDER BY cnt DESC LIMIT 1`,
        );
        return `dominant mood: ${r[0]?.emotion ?? 'n/a'}`;
      }
      case 'daily-seen-in-dreams': {
        const r = await this.db.query<Array<{ count: string }>>(
          `SELECT COUNT(*)::text AS count FROM seen_in_dreams`,
        );
        return `patterns: ${r[0]?.count ?? 0}`;
      }
      case 'weekly-resonance-scores': {
        const r = await this.db.query<Array<{ count: string }>>(
          `SELECT COUNT(*)::text AS count FROM user_resonance_scores`,
        );
        return `score rows: ${r[0]?.count ?? 0}`;
      }
      case 'weekly-ai-report':
        return 'digest generated';
      case 'weekly-platform-health': {
        const r = await this.db.query<Array<{ count: string }>>(
          `SELECT COUNT(*)::text AS count FROM platform_health_snapshots`,
        );
        return `snapshots: ${r[0]?.count ?? 0}`;
      }
      default:
        return 'no-op';
    }
  }
}
