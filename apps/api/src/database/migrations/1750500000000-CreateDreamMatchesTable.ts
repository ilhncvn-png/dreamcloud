import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDreamMatchesTable1750500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE dream_matches (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dream_id_a   UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
        dream_id_b   UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
        user_id_a    UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
        user_id_b    UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
        match_score  FLOAT NOT NULL,
        resonance_level VARCHAR(20) NOT NULL,
        theme_score    FLOAT NOT NULL DEFAULT 0,
        emotion_score  FLOAT NOT NULL DEFAULT 0,
        symbol_score   FLOAT NOT NULL DEFAULT 0,
        location_score FLOAT NOT NULL DEFAULT 0,
        shared_themes    TEXT[] NOT NULL DEFAULT '{}',
        shared_emotions  TEXT[] NOT NULL DEFAULT '{}',
        shared_symbols   TEXT[] NOT NULL DEFAULT '{}',
        shared_locations TEXT[] NOT NULL DEFAULT '{}',
        calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_dream_matches_pair UNIQUE (dream_id_a, dream_id_b),
        CONSTRAINT ck_dream_matches_canonical CHECK (dream_id_a < dream_id_b)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_dm_dream_a   ON dream_matches (dream_id_a)`);
    await queryRunner.query(`CREATE INDEX idx_dm_dream_b   ON dream_matches (dream_id_b)`);
    await queryRunner.query(`CREATE INDEX idx_dm_user_a    ON dream_matches (user_id_a)`);
    await queryRunner.query(`CREATE INDEX idx_dm_user_b    ON dream_matches (user_id_b)`);
    await queryRunner.query(`CREATE INDEX idx_dm_score     ON dream_matches (match_score DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS dream_matches`);
  }
}
