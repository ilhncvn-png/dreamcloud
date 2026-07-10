import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDreamMentions1750900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend notification_type enum
    await queryRunner.query(`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'dream_mention'`);

    // 2. Add dream_mention preference flag to existing table
    await queryRunner.query(`
      ALTER TABLE notification_preferences
        ADD COLUMN IF NOT EXISTS dream_mention BOOLEAN NOT NULL DEFAULT TRUE
    `);

    // 3. Create dream_mentions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dream_mentions (
        id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        dream_id            UUID         NOT NULL REFERENCES dreams(id)  ON DELETE CASCADE,
        dreamer_user_id     UUID         NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
        mentioned_user_id   UUID         NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
        matched_name        VARCHAR(255) NOT NULL,
        confidence_score    SMALLINT     NOT NULL DEFAULT 80,
        created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_dream_mentioned_user UNIQUE (dream_id, mentioned_user_id)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_dream_mentions_dreamer   ON dream_mentions (dreamer_user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_dream_mentions_mentioned ON dream_mentions (mentioned_user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_dream_mentions_dream     ON dream_mentions (dream_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS dream_mentions`);
    await queryRunner.query(
      `ALTER TABLE notification_preferences DROP COLUMN IF EXISTS dream_mention`,
    );
    // PostgreSQL does not support removing enum values
  }
}
