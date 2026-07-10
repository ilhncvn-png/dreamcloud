import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetToUsers1752100000000 implements MigrationInterface {
  name = 'AddPasswordResetToUsers1752100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "password_reset_token" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "password_reset_expiry" TIMESTAMPTZ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "password_reset_expiry",
        DROP COLUMN IF EXISTS "password_reset_token";
    `);
  }
}
