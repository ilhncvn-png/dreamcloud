import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWaitlistEntries1752200000000 implements MigrationInterface {
  name = 'CreateWaitlistEntries1752200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "waitlist_entries" (
        "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
        "email"        VARCHAR(320)  NOT NULL,
        "is_contacted" BOOLEAN       NOT NULL DEFAULT false,
        "contacted_at" TIMESTAMPTZ,
        "notes"        TEXT,
        "created_at"   TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_waitlist_entries" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_waitlist_entries_email" UNIQUE ("email")
      );
      CREATE INDEX IF NOT EXISTS "IDX_waitlist_entries_created_at" ON "waitlist_entries" ("created_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "waitlist_entries";`);
  }
}
