import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDreamComments1750140000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS dream_comments (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dream_id     UUID NOT NULL REFERENCES dreams(id)  ON DELETE CASCADE,
        user_id      UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
        content      TEXT NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at   TIMESTAMPTZ
      );
    `);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_dream_comments_dream_id ON dream_comments(dream_id) WHERE deleted_at IS NULL;`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_dream_comments_user_id  ON dream_comments(user_id);`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS dream_comments;`);
  }
}
