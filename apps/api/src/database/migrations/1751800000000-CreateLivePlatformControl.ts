import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLivePlatformControl1751800000000 implements MigrationInterface {
  name = 'CreateLivePlatformControl1751800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── dream_analysis: aggregated per-dream AI scores ─────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dream_analysis" (
        "id"                UUID        NOT NULL DEFAULT gen_random_uuid(),
        "dream_id"          UUID        NOT NULL,
        "symbol_count"      INTEGER     NOT NULL DEFAULT 0,
        "emotion_count"     INTEGER     NOT NULL DEFAULT 0,
        "figure_count"      INTEGER     NOT NULL DEFAULT 0,
        "theme_count"       INTEGER     NOT NULL DEFAULT 0,
        "primary_emotion"   VARCHAR(80),
        "primary_symbol"    VARCHAR(120),
        "primary_archetype" VARCHAR(120),
        "dream_score"       INTEGER     NOT NULL DEFAULT 0,
        "resonance_score"   INTEGER     NOT NULL DEFAULT 0,
        "processed_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_dream_analysis" PRIMARY KEY ("id"),
        CONSTRAINT "uq_dream_analysis_dream_id" UNIQUE ("dream_id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_dream_analysis_dream_id"    ON "dream_analysis" ("dream_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_dream_analysis_processed_at" ON "dream_analysis" ("processed_at" DESC);`,
    );

    // ── ai_events: generated intelligence signals ──────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_events" (
        "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
        "category"   VARCHAR(50)  NOT NULL,
        "message"    TEXT         NOT NULL,
        "detail"     TEXT,
        "severity"   VARCHAR(20)  NOT NULL DEFAULT 'info',
        "metadata"   JSONB        NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "read_at"    TIMESTAMPTZ,
        CONSTRAINT "pk_ai_events" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ai_events_created_at" ON "ai_events" ("created_at" DESC);`,
    );

    // ── admin_notification_queue ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_notification_queue" (
        "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
        "type"         VARCHAR(50)  NOT NULL,
        "title"        VARCHAR(300) NOT NULL,
        "message"      TEXT         NOT NULL,
        "severity"     VARCHAR(20)  NOT NULL DEFAULT 'info',
        "related_id"   UUID,
        "related_type" VARCHAR(50),
        "read_at"      TIMESTAMPTZ,
        "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_admin_notification_queue" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_admin_notif_queue_created_at" ON "admin_notification_queue" ("created_at" DESC);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_admin_notif_queue_read_at" ON "admin_notification_queue" ("read_at");`,
    );

    // ── platform_health_snapshots ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_health_snapshots" (
        "id"               UUID           NOT NULL DEFAULT gen_random_uuid(),
        "positivity_score" DECIMAL(5,2)   NOT NULL DEFAULT 0,
        "anxiety_score"    DECIMAL(5,2)   NOT NULL DEFAULT 0,
        "lucidity_score"   DECIMAL(5,2)   NOT NULL DEFAULT 0,
        "nightmare_ratio"  DECIMAL(5,2)   NOT NULL DEFAULT 0,
        "emotional_shift"  DECIMAL(5,2)   NOT NULL DEFAULT 0,
        "total_dreams"     INTEGER        NOT NULL DEFAULT 0,
        "snapshot_at"      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_platform_health_snapshots" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_platform_health_snapshot_at" ON "platform_health_snapshots" ("snapshot_at" DESC);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_health_snapshots";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_notification_queue";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_events";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dream_analysis";`);
  }
}
