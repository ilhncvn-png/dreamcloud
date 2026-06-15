import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokensTable1749946200000 implements MigrationInterface {
  name = 'CreateRefreshTokensTable1749946200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"     UUID         NOT NULL,
        "token_hash"  VARCHAR(64)  NOT NULL,
        "expires_at"  TIMESTAMPTZ  NOT NULL,
        "revoked_at"  TIMESTAMPTZ,
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_refresh_tokens_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_refresh_tokens_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user_id"
        ON "refresh_tokens" ("user_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_token_hash"
        ON "refresh_tokens" ("token_hash");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens";`);
  }
}
