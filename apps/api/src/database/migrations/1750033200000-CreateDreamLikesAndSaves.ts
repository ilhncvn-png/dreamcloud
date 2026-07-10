import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDreamLikesAndSaves1750033200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "dream_likes" (
        "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"    UUID        NOT NULL,
        "dream_id"   UUID        NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_dream_likes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_dream_likes_user_dream" UNIQUE ("user_id", "dream_id"),
        CONSTRAINT "FK_dream_likes_user"  FOREIGN KEY ("user_id")  REFERENCES "users"("id")  ON DELETE CASCADE,
        CONSTRAINT "FK_dream_likes_dream" FOREIGN KEY ("dream_id") REFERENCES "dreams"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "dream_saves" (
        "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"    UUID        NOT NULL,
        "dream_id"   UUID        NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_dream_saves" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_dream_saves_user_dream" UNIQUE ("user_id", "dream_id"),
        CONSTRAINT "FK_dream_saves_user"  FOREIGN KEY ("user_id")  REFERENCES "users"("id")  ON DELETE CASCADE,
        CONSTRAINT "FK_dream_saves_dream" FOREIGN KEY ("dream_id") REFERENCES "dreams"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_dream_likes_dream_id" ON "dream_likes" ("dream_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dream_saves_dream_id" ON "dream_saves" ("dream_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "dream_saves"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dream_likes"`);
  }
}
