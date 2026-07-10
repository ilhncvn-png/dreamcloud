import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDreamOS1752000000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TYPE os_rule_type  AS ENUM ('event', 'threshold', 'scheduled') ;
      CREATE TYPE os_rule_status AS ENUM ('active', 'paused', 'disabled')   ;
      CREATE TYPE os_job_status  AS ENUM ('idle', 'running', 'failed', 'completed') ;

      CREATE TABLE IF NOT EXISTS os_automation_rules (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        TEXT NOT NULL,
        description TEXT,
        rule_type   os_rule_type  NOT NULL DEFAULT 'event',
        status      os_rule_status NOT NULL DEFAULT 'active',
        trigger_event    TEXT,
        trigger_threshold NUMERIC,
        trigger_metric   TEXT,
        trigger_cron     TEXT,
        action_type  TEXT NOT NULL,
        action_config JSONB NOT NULL DEFAULT '{}',
        last_fired_at TIMESTAMPTZ,
        fire_count    INT NOT NULL DEFAULT 0,
        created_by  UUID,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS os_scenario_rules (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        TEXT NOT NULL,
        description TEXT,
        status      os_rule_status NOT NULL DEFAULT 'active',
        if_conditions  JSONB NOT NULL DEFAULT '[]',
        then_actions   JSONB NOT NULL DEFAULT '[]',
        chain_next_id  UUID REFERENCES os_scenario_rules(id) ON DELETE SET NULL,
        last_triggered_at TIMESTAMPTZ,
        trigger_count INT NOT NULL DEFAULT 0,
        created_by  UUID,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS os_scheduler_jobs (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name         TEXT NOT NULL UNIQUE,
        description  TEXT,
        cron_expr    TEXT NOT NULL,
        job_type     TEXT NOT NULL,
        status       os_job_status NOT NULL DEFAULT 'idle',
        enabled      BOOLEAN NOT NULL DEFAULT TRUE,
        last_run_at  TIMESTAMPTZ,
        next_run_at  TIMESTAMPTZ,
        last_result  TEXT,
        run_count    INT NOT NULL DEFAULT 0,
        error_count  INT NOT NULL DEFAULT 0,
        avg_duration_ms INT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      INSERT INTO os_scheduler_jobs (name, description, cron_expr, job_type, next_run_at) VALUES
        ('hourly-resonance-scan',   'Scan for new high-resonance matches',                '0 * * * *',    'resonance',   NOW() + INTERVAL '1 hour'),
        ('daily-dream-analysis',    'Re-analyse unscored dreams from past 24h',           '0 3 * * *',    'analysis',    NOW() + INTERVAL '1 day'),
        ('daily-collective-mood',   'Compute and cache collective mood snapshot',          '0 4 * * *',    'mood',        NOW() + INTERVAL '1 day'),
        ('daily-seen-in-dreams',    'Recompute seen-in-dreams patterns',                   '0 5 * * *',    'patterns',    NOW() + INTERVAL '1 day'),
        ('weekly-resonance-scores', 'Bulk upsert user resonance score table',             '0 6 * * 1',    'scores',      NOW() + INTERVAL '7 days'),
        ('weekly-ai-report',        'Generate weekly AI intelligence digest',              '0 7 * * 1',    'report',      NOW() + INTERVAL '7 days'),
        ('weekly-platform-health',  'Capture platform health snapshot for trend tracking','0 8 * * 1',    'health',      NOW() + INTERVAL '7 days')
      ON CONFLICT (name) DO NOTHING;
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DROP TABLE IF EXISTS os_scheduler_jobs;
      DROP TABLE IF EXISTS os_scenario_rules;
      DROP TABLE IF EXISTS os_automation_rules;
      DROP TYPE  IF EXISTS os_job_status;
      DROP TYPE  IF EXISTS os_rule_status;
      DROP TYPE  IF EXISTS os_rule_type;
    `);
  }
}
