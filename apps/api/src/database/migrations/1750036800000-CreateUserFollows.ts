import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserFollows1750036800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_follows" (
        "id"           UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "follower_id"  UUID        NOT NULL,
        "following_id" UUID        NOT NULL,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_user_follows" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_follows_pair" UNIQUE ("follower_id", "following_id"),
        CONSTRAINT "CHK_user_follows_no_self" CHECK ("follower_id" <> "following_id"),
        CONSTRAINT "FK_user_follows_follower"  FOREIGN KEY ("follower_id")  REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_follows_following" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_follows_follower_id"  ON "user_follows" ("follower_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_follows_following_id" ON "user_follows" ("following_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_follows"`);
  }
}
