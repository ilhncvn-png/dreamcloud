import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DreamAdminExtensions1751500000000 implements MigrationInterface {
  name = 'DreamAdminExtensions1751500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add columns to dreams
    await queryRunner.query(
      `ALTER TABLE "dreams" ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT FALSE`,
    );
    await queryRunner.query(
      `ALTER TABLE "dreams" ADD COLUMN IF NOT EXISTS "featured_at" TIMESTAMPTZ`,
    );
    await queryRunner.query(`ALTER TABLE "dreams" ADD COLUMN IF NOT EXISTS "moderation_note" TEXT`);
    await queryRunner.query(
      `ALTER TABLE "dreams" ADD COLUMN IF NOT EXISTS "view_count" INTEGER NOT NULL DEFAULT 0`,
    );

    // Create dream_reports table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dream_reports" (
        "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
        "dream_id"       UUID NOT NULL,
        "reporter_id"    UUID NOT NULL,
        "reason"         VARCHAR(50) NOT NULL,
        "description"    TEXT,
        "status"         VARCHAR(20) NOT NULL DEFAULT 'pending',
        "resolved_by"    UUID,
        "resolved_at"    TIMESTAMPTZ,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_dream_reports" PRIMARY KEY ("id"),
        CONSTRAINT "fk_dream_reports_dream" FOREIGN KEY ("dream_id") REFERENCES "dreams"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_dream_reports_reporter" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_dream_report" UNIQUE ("dream_id", "reporter_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_dream_reports_dream_id" ON "dream_reports" ("dream_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_dream_reports_status" ON "dream_reports" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_dreams_is_featured" ON "dreams" ("is_featured") WHERE is_featured = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_dreams_is_hidden" ON "dreams" ("is_hidden") WHERE is_hidden = TRUE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "dream_reports"`);
    await queryRunner.query(`ALTER TABLE "dreams" DROP COLUMN IF EXISTS "is_featured"`);
    await queryRunner.query(`ALTER TABLE "dreams" DROP COLUMN IF EXISTS "featured_at"`);
    await queryRunner.query(`ALTER TABLE "dreams" DROP COLUMN IF EXISTS "moderation_note"`);
    await queryRunner.query(`ALTER TABLE "dreams" DROP COLUMN IF EXISTS "view_count"`);
  }
}
