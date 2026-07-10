import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDreamConnectionEngine1751900000000 implements MigrationInterface {
  name = 'CreateDreamConnectionEngine1751900000000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS user_resonance_scores (
        id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                UUID         UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        resonance_level        VARCHAR(20)  NOT NULL DEFAULT 'dormant',
        collective_alignment   FLOAT        NOT NULL DEFAULT 0,
        dream_uniqueness_score FLOAT        NOT NULL DEFAULT 50,
        connection_count       INT          NOT NULL DEFAULT 0,
        avg_match_score        FLOAT        NOT NULL DEFAULT 0,
        computed_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS seen_in_dreams (
        id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        pattern_type     VARCHAR(50)   NOT NULL,
        pattern_value    VARCHAR(200)  NOT NULL,
        user_count       INT           NOT NULL DEFAULT 0,
        dream_count      INT           NOT NULL DEFAULT 0,
        confidence_score FLOAT         NOT NULL DEFAULT 0,
        sample_usernames TEXT[]        NOT NULL DEFAULT '{}',
        last_seen_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        computed_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_seen_pattern UNIQUE (pattern_type, pattern_value)
      )
    `);

    await qr.query(`CREATE INDEX IF NOT EXISTS idx_urs_user_id ON user_resonance_scores(user_id)`);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_urs_level   ON user_resonance_scores(resonance_level)`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_urs_score   ON user_resonance_scores(avg_match_score DESC)`,
    );
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_sid_type    ON seen_in_dreams(pattern_type)`);
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_sid_users   ON seen_in_dreams(user_count DESC)`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS user_resonance_scores`);
    await qr.query(`DROP TABLE IF EXISTS seen_in_dreams`);
  }
}
