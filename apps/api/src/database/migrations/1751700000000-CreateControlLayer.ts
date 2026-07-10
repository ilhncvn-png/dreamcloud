import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateControlLayer1751700000000 implements MigrationInterface {
  name = 'CreateControlLayer1751700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── app_config: platform-wide toggle store ─────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_config" (
        "key"          VARCHAR(100) NOT NULL,
        "value"        JSONB        NOT NULL DEFAULT 'true',
        "label"        VARCHAR(200) NOT NULL DEFAULT '',
        "description"  TEXT         NOT NULL DEFAULT '',
        "category"     VARCHAR(50)  NOT NULL DEFAULT 'features',
        "dangerous"    BOOLEAN      NOT NULL DEFAULT false,
        "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_by"   UUID,
        CONSTRAINT "pk_app_config" PRIMARY KEY ("key")
      );
    `);

    // seed default platform toggles
    await queryRunner.query(`
      INSERT INTO "app_config" ("key","value","label","description","category","dangerous") VALUES
        ('maintenance_mode',          'false', 'Maintenance Mode',       'App enters maintenance mode — all requests return 503',        'emergency', true),
        ('registration_open',         'true',  'Registration Open',      'Allow new user account creation',                              'core',      false),
        ('dream_posting_enabled',     'true',  'Dream Posting',          'Users can create and publish new dreams',                      'core',      false),
        ('comments_enabled',          'true',  'Comments',               'Allow users to comment on dreams',                             'features',  false),
        ('likes_saves_enabled',       'true',  'Likes & Saves',          'Allow users to like and save dreams',                          'features',  false),
        ('dream_matching_enabled',    'true',  'Dream Matching',         'Enable the dream matching algorithm',                          'features',  false),
        ('dream_connections_enabled', 'true',  'Dream Connections',      'Enable dream connections feature',                             'features',  false),
        ('seen_in_dreams_enabled',    'true',  'Seen in Dreams',         'Enable seen-in-dreams notifications',                          'features',  false),
        ('ai_analysis_enabled',       'true',  'AI Analysis',            'Enable AI-powered dream analysis and intelligence',            'features',  false),
        ('public_feed_enabled',       'true',  'Public Feed',            'Show public dream feed to all users',                          'core',      false),
        ('emergency_read_only',       'false', 'Emergency Read-Only',    'Block all write operations platform-wide',                     'emergency', true)
      ON CONFLICT ("key") DO NOTHING;
    `);

    // ── feature_flags ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "feature_flags" (
        "id"                  UUID         NOT NULL DEFAULT gen_random_uuid(),
        "key"                 VARCHAR(100) NOT NULL,
        "name"                VARCHAR(200) NOT NULL,
        "description"         TEXT         NOT NULL DEFAULT '',
        "enabled"             BOOLEAN      NOT NULL DEFAULT false,
        "target_audience"     VARCHAR(100) NOT NULL DEFAULT 'all',
        "rollout_percentage"  INTEGER      NOT NULL DEFAULT 100,
        "updated_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_by"          UUID,
        CONSTRAINT "pk_feature_flags" PRIMARY KEY ("id"),
        CONSTRAINT "uq_feature_flags_key" UNIQUE ("key")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_feature_flags_key" ON "feature_flags" ("key");`,
    );

    // seed initial flags
    await queryRunner.query(`
      INSERT INTO "feature_flags" ("key","name","description","enabled","target_audience","rollout_percentage") VALUES
        ('dark_mode_v2',        'Dark Mode V2',         'Next-gen dark mode with adaptive contrast',        false, 'all',       0),
        ('dream_sharing_beta',  'Dream Sharing Beta',   'Share dreams externally via link',                 false, 'beta',      10),
        ('ai_coach',            'AI Dream Coach',       'Personalized AI dream coaching insights',          false, 'premium',   0),
        ('social_graph',        'Social Graph',         'Extended social connections and discovery',        false, 'all',       0),
        ('dream_challenges',    'Dream Challenges',     'Community dream challenge events',                 false, 'all',       0)
      ON CONFLICT ("key") DO NOTHING;
    `);

    // ── admin_notification_log ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_notification_log" (
        "id"              UUID         NOT NULL DEFAULT gen_random_uuid(),
        "type"            VARCHAR(50)  NOT NULL,
        "title"           VARCHAR(300) NOT NULL,
        "message"         TEXT         NOT NULL,
        "target_audience" VARCHAR(100) NOT NULL DEFAULT 'all',
        "sent_at"         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "sent_by"         UUID         NOT NULL,
        CONSTRAINT "pk_admin_notification_log" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_admin_notif_sent_at" ON "admin_notification_log" ("sent_at" DESC);`,
    );

    // ── moderation_rules: single-row config ────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "moderation_rules" (
        "id"                         SERIAL      PRIMARY KEY,
        "auto_hide_threshold"        INTEGER     NOT NULL DEFAULT 5,
        "report_threshold"           INTEGER     NOT NULL DEFAULT 3,
        "ban_threshold"              INTEGER     NOT NULL DEFAULT 10,
        "suspicious_user_threshold"  INTEGER     NOT NULL DEFAULT 5,
        "ai_risk_threshold"          INTEGER     NOT NULL DEFAULT 80,
        "restricted_words"           JSONB       NOT NULL DEFAULT '[]',
        "rate_limit_per_minute"      INTEGER     NOT NULL DEFAULT 30,
        "rate_limit_per_hour"        INTEGER     NOT NULL DEFAULT 200,
        "updated_at"                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_by"                 UUID
      );
    `);
    // ensure exactly one row exists
    await queryRunner.query(
      `INSERT INTO "moderation_rules" DEFAULT VALUES ON CONFLICT DO NOTHING;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "moderation_rules";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_notification_log";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "feature_flags";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "app_config";`);
  }
}
