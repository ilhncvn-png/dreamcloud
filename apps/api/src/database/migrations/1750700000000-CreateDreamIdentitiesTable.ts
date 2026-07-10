import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDreamIdentitiesTable1750700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dream_identities (
        user_id                UUID    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        primary_archetype      TEXT    NOT NULL DEFAULT 'observer',
        secondary_archetype    TEXT    NOT NULL DEFAULT 'seeker',
        primary_archetype_score   INT NOT NULL DEFAULT 0,
        secondary_archetype_score INT NOT NULL DEFAULT 0,
        personality_summary    TEXT    NOT NULL DEFAULT '',
        dominant_themes        TEXT[]  NOT NULL DEFAULT '{}',
        dominant_emotions      TEXT[]  NOT NULL DEFAULT '{}',
        dominant_symbols       TEXT[]  NOT NULL DEFAULT '{}',
        dominant_locations     TEXT[]  NOT NULL DEFAULT '{}',
        dominant_archetypes    TEXT[]  NOT NULL DEFAULT '{}',
        resonance_score        INT     NOT NULL DEFAULT 0,
        lucid_score            INT     NOT NULL DEFAULT 0,
        transformation_score   INT     NOT NULL DEFAULT 0,
        wonder_score           INT     NOT NULL DEFAULT 0,
        connection_score       INT     NOT NULL DEFAULT 0,
        dream_count            INT     NOT NULL DEFAULT 0,
        computed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dream_identities_computed_at
        ON dream_identities (computed_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS dream_identities`);
  }
}
