import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDreamsTable1749946800000 implements MigrationInterface {
  name = 'CreateDreamsTable1749946800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dreams" (
        "id"               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"          UUID         NOT NULL,
        "title"            VARCHAR(120),
        "content"          TEXT         NOT NULL,
        "category"         dream_category  NOT NULL DEFAULT 'normal',
        "visibility"       dream_visibility NOT NULL DEFAULT 'followers',
        "is_draft"         BOOLEAN      NOT NULL DEFAULT FALSE,
        "tags"             TEXT[]       NOT NULL DEFAULT '{}',
        "like_count"       INTEGER      NOT NULL DEFAULT 0,
        "comment_count"    INTEGER      NOT NULL DEFAULT 0,
        "match_count"      INTEGER      NOT NULL DEFAULT 0,
        "save_count"       INTEGER      NOT NULL DEFAULT 0,
        "is_moderated"     BOOLEAN      NOT NULL DEFAULT FALSE,
        "moderation_score" FLOAT,
        "is_hidden"        BOOLEAN      NOT NULL DEFAULT FALSE,
        "dreamed_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "deleted_at"       TIMESTAMPTZ,
        CONSTRAINT "FK_dreams_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dreams_feed"
        ON "dreams" ("created_at" DESC, "visibility", "is_hidden", "deleted_at")
        WHERE visibility = 'public' AND is_hidden = FALSE AND deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dreams_user_id"
        ON "dreams" ("user_id", "created_at" DESC)
        WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dreams_content_fts"
        ON "dreams" USING GIN(
          to_tsvector('simple', coalesce(title, '') || ' ' || content)
        );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dreams_tags"
        ON "dreams" USING GIN("tags");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "dreams";`);
  }
}
