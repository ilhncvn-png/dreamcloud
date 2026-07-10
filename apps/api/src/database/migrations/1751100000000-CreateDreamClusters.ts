import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDreamClusters1751100000000 implements MigrationInterface {
  name = 'CreateDreamClusters1751100000000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS dream_clusters (
        id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        name             VARCHAR(100) NOT NULL,
        slug             VARCHAR(100) NOT NULL,
        description      TEXT,
        primary_theme    VARCHAR(60),
        primary_symbol   VARCHAR(60),
        primary_emotion  VARCHAR(60),
        primary_archetype VARCHAR(60),
        member_count     INT         NOT NULL DEFAULT 0,
        dream_count      INT         NOT NULL DEFAULT 0,
        strength_score   NUMERIC(5,2) NOT NULL DEFAULT 0,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_cluster_slug UNIQUE (slug)
      )
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS dream_cluster_members (
        id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        cluster_id       UUID        NOT NULL REFERENCES dream_clusters(id) ON DELETE CASCADE,
        user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        membership_score NUMERIC(5,2) NOT NULL DEFAULT 0,
        matched_themes   TEXT[]      NOT NULL DEFAULT '{}',
        matched_symbols  TEXT[]      NOT NULL DEFAULT '{}',
        matched_emotions TEXT[]      NOT NULL DEFAULT '{}',
        matched_locations TEXT[]     NOT NULL DEFAULT '{}',
        matched_archetypes TEXT[]    NOT NULL DEFAULT '{}',
        joined_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_cluster_member UNIQUE (cluster_id, user_id)
      )
    `);

    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_dcm_cluster_id ON dream_cluster_members(cluster_id)`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_dcm_user_id   ON dream_cluster_members(user_id)`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_dcm_score     ON dream_cluster_members(membership_score DESC)`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS dream_cluster_members`);
    await qr.query(`DROP TABLE IF EXISTS dream_clusters`);
  }
}
