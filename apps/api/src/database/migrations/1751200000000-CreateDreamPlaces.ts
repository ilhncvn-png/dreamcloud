import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDreamPlaces1751200000000 implements MigrationInterface {
  name = 'CreateDreamPlaces1751200000000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TYPE dream_place_type AS ENUM (
        'CITY', 'COUNTRY', 'LANDMARK', 'HOTEL',
        'RESTAURANT', 'CAFE', 'STREET', 'BUILDING', 'NATURE', 'UNKNOWN'
      )
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS dream_places (
        id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        dream_id    UUID          NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
        user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name        VARCHAR(255)  NOT NULL,
        type        dream_place_type NOT NULL DEFAULT 'UNKNOWN',
        confidence  SMALLINT      NOT NULL DEFAULT 80
                                  CHECK (confidence BETWEEN 0 AND 100),
        country     VARCHAR(100),
        city        VARCHAR(100),
        latitude    NUMERIC(10,6),
        longitude   NUMERIC(10,6),
        created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_dream_place UNIQUE (dream_id, name)
      )
    `);

    await qr.query(`CREATE INDEX IF NOT EXISTS idx_dp_dream_id   ON dream_places(dream_id)`);
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_dp_user_id    ON dream_places(user_id)`);
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_dp_name       ON dream_places(lower(name))`);
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_dp_type       ON dream_places(type)`);
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_dp_created_at ON dream_places(created_at DESC)`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS dream_places`);
    await qr.query(`DROP TYPE IF EXISTS dream_place_type`);
  }
}
