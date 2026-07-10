import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendUserProfile1751300000000 implements MigrationInterface {
  name = 'ExtendUserProfile1751300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
        ADD COLUMN IF NOT EXISTS "preferences" JSONB NOT NULL DEFAULT '{}';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "preferences";
    `);
  }
}
