import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupportTickets1751600000000 implements MigrationInterface {
  name = 'CreateSupportTickets1751600000000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        subject          VARCHAR(255) NOT NULL,
        description      TEXT,
        status           VARCHAR(20)  NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'escalated')),
        priority         VARCHAR(20)  NOT NULL DEFAULT 'medium'
                         CHECK (priority IN ('critical', 'high', 'medium', 'low')),
        category         VARCHAR(50),
        reporter_user_id UUID         REFERENCES users(id) ON DELETE SET NULL,
        reporter_email   VARCHAR(255),
        reporter_name    VARCHAR(255),
        assigned_to      UUID         REFERENCES users(id) ON DELETE SET NULL,
        resolution_notes TEXT,
        internal_notes   TEXT,
        resolved_at      TIMESTAMPTZ,
        closed_at        TIMESTAMPTZ,
        escalated_at     TIMESTAMPTZ,
        created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_support_tickets_status      ON support_tickets(status)`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_support_tickets_priority     ON support_tickets(priority)`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to  ON support_tickets(assigned_to)`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at   ON support_tickets(created_at DESC)`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS support_tickets`);
  }
}
