import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDreamAnalysisTables1750400000000 implements MigrationInterface {
  name = 'CreateDreamAnalysisTables1750400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. analysis_status enum
    await queryRunner.query(`
      CREATE TYPE analysis_status AS ENUM (
        'pending', 'processing', 'completed', 'failed', 'skipped'
      );
    `);

    // 2. dream_analyses — control table, one row per dream
    await queryRunner.query(`
      CREATE TABLE dream_analyses (
        id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
        dream_id            UUID            NOT NULL UNIQUE REFERENCES dreams(id) ON DELETE CASCADE,
        status              analysis_status NOT NULL DEFAULT 'pending',
        model_version       VARCHAR(50),
        analyzed_at         TIMESTAMPTZ,
        failed_at           TIMESTAMPTZ,
        failure_reason      TEXT,
        raw_response        JSONB,
        primary_theme       VARCHAR(60),
        primary_emotion     VARCHAR(60),
        emotional_intensity VARCHAR(20),
        emotional_arc       JSONB,
        residual_emotion    VARCHAR(60),
        created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_dream_analyses_status   ON dream_analyses (status)
        WHERE status IN ('pending', 'failed');
    `);
    await queryRunner.query(`
      CREATE INDEX IDX_dream_analyses_dream_id ON dream_analyses (dream_id);
    `);

    // 3. dream_themes
    await queryRunner.query(`
      CREATE TABLE dream_themes (
        id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        dream_id     UUID        NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
        theme        VARCHAR(60) NOT NULL,
        theme_family VARCHAR(60),
        is_primary   BOOLEAN     NOT NULL DEFAULT FALSE,
        confidence   FLOAT       NOT NULL DEFAULT 0.8,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX IDX_dream_themes_dream_id ON dream_themes (dream_id);`);
    await queryRunner.query(`CREATE INDEX IDX_dream_themes_theme    ON dream_themes (theme);`);
    await queryRunner.query(
      `CREATE INDEX IDX_dream_themes_family   ON dream_themes (theme_family) WHERE theme_family IS NOT NULL;`,
    );

    // 4. dream_emotions
    await queryRunner.query(`
      CREATE TABLE dream_emotions (
        id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        dream_id     UUID        NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
        emotion      VARCHAR(60) NOT NULL,
        intensity    VARCHAR(20) NOT NULL DEFAULT 'moderate',
        is_primary   BOOLEAN     NOT NULL DEFAULT FALSE,
        is_residual  BOOLEAN     NOT NULL DEFAULT FALSE,
        arc_position VARCHAR(20),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IDX_dream_emotions_dream_id ON dream_emotions (dream_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IDX_dream_emotions_emotion  ON dream_emotions (emotion);`,
    );
    await queryRunner.query(
      `CREATE INDEX IDX_dream_emotions_primary  ON dream_emotions (dream_id) WHERE is_primary = TRUE;`,
    );

    // 5. dream_figures
    await queryRunner.query(`
      CREATE TABLE dream_figures (
        id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        dream_id             UUID        NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
        figure_type          VARCHAR(60) NOT NULL,
        is_known             BOOLEAN     NOT NULL DEFAULT FALSE,
        relationship_type    VARCHAR(60),
        archetype_candidate  VARCHAR(80),
        archetype_confidence FLOAT,
        quality_descriptors  TEXT[]      NOT NULL DEFAULT '{}',
        narrative_role       VARCHAR(60),
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IDX_dream_figures_dream_id  ON dream_figures (dream_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IDX_dream_figures_archetype ON dream_figures (archetype_candidate) WHERE archetype_candidate IS NOT NULL;`,
    );

    // 6. dream_locations
    await queryRunner.query(`
      CREATE TABLE dream_locations (
        id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        dream_id        UUID         NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
        location_tier   INTEGER      NOT NULL,
        name            VARCHAR(200),
        location_type   VARCHAR(80),
        archetype_type  VARCHAR(80),
        emotional_tone  VARCHAR(60),
        is_distorted    BOOLEAN      NOT NULL DEFAULT FALSE,
        geographic_hint VARCHAR(200),
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IDX_dream_locations_dream_id  ON dream_locations (dream_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IDX_dream_locations_type      ON dream_locations (location_type) WHERE location_type IS NOT NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IDX_dream_locations_archetype ON dream_locations (archetype_type) WHERE archetype_type IS NOT NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IDX_dream_locations_tier_name ON dream_locations (location_tier, name) WHERE name IS NOT NULL;`,
    );

    // 7. dream_symbols
    await queryRunner.query(`
      CREATE TABLE dream_symbols (
        id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        dream_id           UUID         NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
        symbol_category    VARCHAR(80)  NOT NULL,
        manifestation      VARCHAR(200),
        emotional_context  VARCHAR(80),
        narrative_function VARCHAR(80),
        is_universal       BOOLEAN      NOT NULL DEFAULT FALSE,
        confidence         FLOAT        NOT NULL DEFAULT 0.7,
        created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IDX_dream_symbols_dream_id  ON dream_symbols (dream_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IDX_dream_symbols_category  ON dream_symbols (symbol_category);`,
    );
    await queryRunner.query(
      `CREATE INDEX IDX_dream_symbols_universal ON dream_symbols (symbol_category) WHERE is_universal = TRUE;`,
    );

    // 8. dream_objects
    await queryRunner.query(`
      CREATE TABLE dream_objects (
        id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        dream_id           UUID         NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
        object_name        VARCHAR(200),
        object_type        VARCHAR(80),
        symbolic_category  VARCHAR(80),
        narrative_function VARCHAR(80),
        emotional_context  VARCHAR(80),
        is_impossible      BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX IDX_dream_objects_dream_id ON dream_objects (dream_id);`);
    await queryRunner.query(
      `CREATE INDEX IDX_dream_objects_category ON dream_objects (symbolic_category) WHERE symbolic_category IS NOT NULL;`,
    );

    // 9. Backfill: queue all existing non-deleted dreams for analysis
    await queryRunner.query(`
      INSERT INTO dream_analyses (dream_id, status)
      SELECT id, 'pending'
      FROM dreams
      WHERE deleted_at IS NULL
      ON CONFLICT (dream_id) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS dream_objects;`);
    await queryRunner.query(`DROP TABLE IF EXISTS dream_symbols;`);
    await queryRunner.query(`DROP TABLE IF EXISTS dream_locations;`);
    await queryRunner.query(`DROP TABLE IF EXISTS dream_figures;`);
    await queryRunner.query(`DROP TABLE IF EXISTS dream_emotions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS dream_themes;`);
    await queryRunner.query(`DROP TABLE IF EXISTS dream_analyses;`);
    await queryRunner.query(`DROP TYPE IF EXISTS analysis_status;`);
  }
}
