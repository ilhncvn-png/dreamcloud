import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDreamConnections1751000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dream_connections (
        id                UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id_a         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_id_b         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        connection_score  INT          NOT NULL DEFAULT 0,
        mutual_dreams     INT          NOT NULL DEFAULT 0,
        level             VARCHAR(20)  NOT NULL DEFAULT 'signal',
        first_seen_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        last_seen_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_dream_connection UNIQUE (user_id_a, user_id_b),
        CONSTRAINT chk_connection_order CHECK (user_id_a < user_id_b)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_dream_connections_a ON dream_connections (user_id_a)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_dream_connections_b ON dream_connections (user_id_b)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_dream_connections_level ON dream_connections (level)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS dream_connections`);
  }
}
