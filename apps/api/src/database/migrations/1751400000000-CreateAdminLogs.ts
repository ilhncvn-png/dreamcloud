import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminLogs1751400000000 implements MigrationInterface {
  name = 'CreateAdminLogs1751400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_logs" (
        "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
        "admin_id"       UUID NOT NULL,
        "target_user_id" UUID,
        "action_type"    VARCHAR(100) NOT NULL,
        "old_value"      JSONB,
        "new_value"      JSONB,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_admin_logs" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_admin_logs_admin_id"      ON "admin_logs" ("admin_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_admin_logs_target_user"   ON "admin_logs" ("target_user_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_admin_logs_created_at"    ON "admin_logs" ("created_at" DESC);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_logs";`);
  }
}
