import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEnumsAndUserTables1749945600000 implements MigrationInterface {
  name = 'CreateEnumsAndUserTables1749945600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Enums (idempotent) ---
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE dream_category AS ENUM ('lucid', 'beautiful', 'nightmare', 'normal');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE dream_visibility AS ENUM ('private', 'followers', 'public');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE notification_type AS ENUM (
          'dream_match', 'like', 'comment', 'follow', 'interpretation', 'system'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE report_reason AS ENUM (
          'inappropriate', 'hate_speech', 'fake_content', 'spam', 'other'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE moderation_status AS ENUM (
          'pending', 'approved', 'rejected', 'escalated'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE oauth_provider AS ENUM ('google', 'apple');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE tag_type AS ENUM (
          'place', 'person', 'object', 'emotion', 'brand', 'other'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // --- users ---
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "email"                 VARCHAR(255)  NOT NULL,
        "password_hash"         VARCHAR(255),
        "username"              VARCHAR(50)   NOT NULL,
        "is_email_verified"     BOOLEAN       NOT NULL DEFAULT FALSE,
        "is_active"             BOOLEAN       NOT NULL DEFAULT TRUE,
        "role"                  VARCHAR(20)   NOT NULL DEFAULT 'user',
        "failed_login_attempts" INTEGER       NOT NULL DEFAULT 0,
        "locked_until"          TIMESTAMPTZ,
        "last_login_at"         TIMESTAMPTZ,
        "created_at"            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "deleted_at"            TIMESTAMPTZ,
        CONSTRAINT "UQ_users_email"    UNIQUE ("email"),
        CONSTRAINT "UQ_users_username" UNIQUE ("username")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_email"      ON "users" ("email");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_username"   ON "users" ("username");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_deleted_at" ON "users" ("deleted_at")
        WHERE "deleted_at" IS NOT NULL;
    `);

    // --- user_profiles ---
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_profiles" (
        "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"          UUID          NOT NULL,
        "display_name"     VARCHAR(100),
        "bio"              VARCHAR(200),
        "avatar_url"       VARCHAR(500),
        "location_city"    VARCHAR(100),
        "location_country" VARCHAR(100),
        "is_public"        BOOLEAN       NOT NULL DEFAULT TRUE,
        "dream_count"      INTEGER       NOT NULL DEFAULT 0,
        "follower_count"   INTEGER       NOT NULL DEFAULT 0,
        "following_count"  INTEGER       NOT NULL DEFAULT 0,
        "created_at"       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_user_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_user_profiles_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_profiles_user_id" ON "user_profiles" ("user_id");
    `);

    // --- user_settings ---
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_settings" (
        "id"                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"                   UUID             NOT NULL,
        "notify_dream_match"        BOOLEAN          NOT NULL DEFAULT TRUE,
        "notify_likes"              BOOLEAN          NOT NULL DEFAULT TRUE,
        "notify_comments"           BOOLEAN          NOT NULL DEFAULT TRUE,
        "notify_follows"            BOOLEAN          NOT NULL DEFAULT TRUE,
        "morning_reminder_enabled"  BOOLEAN          NOT NULL DEFAULT TRUE,
        "morning_reminder_time"     TIME             NOT NULL DEFAULT '08:00:00',
        "morning_reminder_timezone" VARCHAR(50)      NOT NULL DEFAULT 'Europe/Istanbul',
        "default_dream_visibility"  dream_visibility NOT NULL DEFAULT 'followers',
        "allow_dream_in_ads"        BOOLEAN          NOT NULL DEFAULT FALSE,
        "allow_data_research"       BOOLEAN          NOT NULL DEFAULT FALSE,
        "language"                  VARCHAR(10)      NOT NULL DEFAULT 'tr',
        "created_at"                TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
        "updated_at"                TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_user_settings_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_user_settings_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_settings_user_id" ON "user_settings" ("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_settings";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_profiles";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);

    await queryRunner.query(`DROP TYPE IF EXISTS tag_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS oauth_provider;`);
    await queryRunner.query(`DROP TYPE IF EXISTS moderation_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS report_reason;`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS dream_visibility;`);
    await queryRunner.query(`DROP TYPE IF EXISTS dream_category;`);
  }
}
