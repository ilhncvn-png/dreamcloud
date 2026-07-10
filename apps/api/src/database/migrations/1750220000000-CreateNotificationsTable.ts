import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTable1750220000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'save' value to notification_type enum if it doesn't exist
    await queryRunner.query(`
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'save';
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        actor_id      UUID        REFERENCES users(id) ON DELETE SET NULL,
        type          notification_type NOT NULL,
        dream_id      UUID        REFERENCES dreams(id) ON DELETE CASCADE,
        comment_id    UUID        REFERENCES dream_comments(id) ON DELETE CASCADE,
        title         TEXT        NOT NULL,
        body          TEXT        NOT NULL,
        is_read       BOOLEAN     NOT NULL DEFAULT FALSE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
        ON notifications (recipient_id, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
        ON notifications (recipient_id, is_read)
        WHERE is_read = FALSE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notifications;`);
  }
}
