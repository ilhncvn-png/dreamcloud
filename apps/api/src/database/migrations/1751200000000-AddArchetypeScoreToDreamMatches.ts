import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArchetypeScoreToDreamMatches1751200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE dream_matches
        ADD COLUMN IF NOT EXISTS archetype_score    FLOAT       NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS shared_archetypes  TEXT[]      NOT NULL DEFAULT '{}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE dream_matches
        DROP COLUMN IF EXISTS archetype_score,
        DROP COLUMN IF EXISTS shared_archetypes
    `);
  }
}
