import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDreamNotificationTypes1750600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Extend notification_type enum with dream-specific categories
    await queryRunner.query(
      `ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'dream_connection'`,
    );
    await queryRunner.query(`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'shared_symbol'`);
    await queryRunner.query(
      `ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'shared_location'`,
    );
    await queryRunner.query(
      `ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'high_resonance'`,
    );
    await queryRunner.query(
      `ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'signal_trending'`,
    );
    await queryRunner.query(
      `ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'dream_milestone'`,
    );

    // Link notifications to a specific match for direct navigation
    await queryRunner.query(`
      ALTER TABLE notifications
        ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES dream_matches(id) ON DELETE SET NULL
    `);

    // Per-user notification preference flags (row created lazily on first update)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        user_id           UUID    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        dream_match       BOOLEAN NOT NULL DEFAULT TRUE,
        dream_connection  BOOLEAN NOT NULL DEFAULT TRUE,
        shared_symbol     BOOLEAN NOT NULL DEFAULT TRUE,
        high_resonance    BOOLEAN NOT NULL DEFAULT TRUE,
        signal_trending   BOOLEAN NOT NULL DEFAULT TRUE,
        dream_milestone   BOOLEAN NOT NULL DEFAULT TRUE,
        social            BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notification_preferences`);
    await queryRunner.query(`ALTER TABLE notifications DROP COLUMN IF EXISTS match_id`);
    // PostgreSQL does not support removing enum values — rollback leaves them in place
  }
}
