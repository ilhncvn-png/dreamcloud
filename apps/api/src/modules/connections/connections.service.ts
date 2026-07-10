import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { DreamConnectionLevel } from './entities/dream-connection.entity';

// ── Level thresholds (total mentions in both directions) ──────────────────────

function connectionLevel(mutualDreams: number): DreamConnectionLevel {
  if (mutualDreams >= 25) return 'mirror';
  if (mutualDreams >= 15) return 'deep';
  if (mutualDreams >= 8)  return 'strong';
  if (mutualDreams >= 4)  return 'resonance';
  return 'signal';
}

// Canonical pair ordering: always store smaller UUID in user_id_a
function canonical(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// ── Row types from raw SQL ────────────────────────────────────────────────────

export interface ConnectionRow {
  id: string;
  user_id_a: string;
  user_id_b: string;
  connection_score: number;
  mutual_dreams: number;
  level: DreamConnectionLevel;
  first_seen_at: string;
  last_seen_at: string;
  other_user_id: string;
  other_username: string;
  other_display_name: string | null;
  other_avatar_url: string | null;
  i_dreamed_about_them: string;
  they_dreamed_about_me: string;
}

export interface TimelineEvent {
  mentionId: string;
  dreamId: string;
  dreamTitle: string | null;
  dreamerUserId: string;
  dreamerUsername: string;
  matchedName: string;
  confidenceScore: number;
  createdAt: string;
}

export interface ConnectionDetail {
  id: string;
  otherUserId: string;
  otherUsername: string;
  otherDisplayName: string | null;
  otherAvatarUrl: string | null;
  connectionScore: number;
  mutualDreams: number;
  level: DreamConnectionLevel;
  firstSeenAt: string;
  lastSeenAt: string;
  iDreamedAboutThem: number;
  theyDreamedAboutMe: number;
  timeline: TimelineEvent[];
}

@Injectable()
export class DreamConnectionsService {
  private readonly logger = new Logger(DreamConnectionsService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ── Core upsert ───────────────────────────────────────────────────────────

  async updateConnectionForPair(userIdX: string, userIdY: string): Promise<void> {
    // Check that at least one mention exists in each direction
    const [fwd, rev] = await Promise.all([
      this.dataSource.query<[{ exists: boolean }]>(
        `SELECT EXISTS (SELECT 1 FROM dream_mentions WHERE dreamer_user_id=$1 AND mentioned_user_id=$2) AS exists`,
        [userIdX, userIdY],
      ),
      this.dataSource.query<[{ exists: boolean }]>(
        `SELECT EXISTS (SELECT 1 FROM dream_mentions WHERE dreamer_user_id=$1 AND mentioned_user_id=$2) AS exists`,
        [userIdY, userIdX],
      ),
    ]);

    // A connection requires mentions in BOTH directions
    if (!fwd[0]?.exists || !rev[0]?.exists) return;

    const [idA, idB] = canonical(userIdX, userIdY);
    await this.upsertConnection(idA, idB);
  }

  private async upsertConnection(idA: string, idB: string): Promise<void> {
    const [stats, first] = await Promise.all([
      this.dataSource.query<[{ total_count: string; total_score: string }]>(
        `SELECT COUNT(*) AS total_count, COALESCE(SUM(confidence_score), 0) AS total_score
         FROM dream_mentions
         WHERE (dreamer_user_id=$1 AND mentioned_user_id=$2)
            OR (dreamer_user_id=$2 AND mentioned_user_id=$1)`,
        [idA, idB],
      ),
      this.dataSource.query<[{ first_at: string }]>(
        `SELECT MIN(created_at) AS first_at FROM dream_mentions
         WHERE (dreamer_user_id=$1 AND mentioned_user_id=$2)
            OR (dreamer_user_id=$2 AND mentioned_user_id=$1)`,
        [idA, idB],
      ),
    ]);

    const mutualDreams    = parseInt(stats[0]?.total_count ?? '0', 10);
    const connectionScore = parseInt(stats[0]?.total_score ?? '0', 10);
    const level           = connectionLevel(mutualDreams);
    const firstSeenAt     = first[0]?.first_at ?? new Date().toISOString();

    try {
      await this.dataSource.query(
        `INSERT INTO dream_connections
           (id, user_id_a, user_id_b, connection_score, mutual_dreams, level, first_seen_at, last_seen_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (user_id_a, user_id_b) DO UPDATE SET
           connection_score = EXCLUDED.connection_score,
           mutual_dreams    = EXCLUDED.mutual_dreams,
           level            = EXCLUDED.level,
           last_seen_at     = NOW()`,
        [idA, idB, connectionScore, mutualDreams, level, firstSeenAt],
      );
    } catch (err) {
      this.logger.warn(`connection upsert failed for (${idA}, ${idB}): ${err}`);
    }
  }

  // ── Backfill from all existing mentions ───────────────────────────────────

  async recomputeAll(): Promise<number> {
    // Find all unique pairs that have mentions in both directions
    const pairs = await this.dataSource.query<Array<{ a: string; b: string }>>(
      `SELECT DISTINCT LEAST(m1.dreamer_user_id, m1.mentioned_user_id)    AS a,
                       GREATEST(m1.dreamer_user_id, m1.mentioned_user_id) AS b
       FROM dream_mentions m1
       WHERE EXISTS (
         SELECT 1 FROM dream_mentions m2
         WHERE m2.dreamer_user_id  = m1.mentioned_user_id
           AND m2.mentioned_user_id = m1.dreamer_user_id
       )`,
    );

    for (const { a, b } of pairs) {
      await this.upsertConnection(a, b);
    }

    return pairs.length;
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async getMyConnections(userId: string): Promise<ConnectionRow[]> {
    return this.dataSource.query<ConnectionRow[]>(
      `SELECT
         dc.id, dc.user_id_a, dc.user_id_b,
         dc.connection_score, dc.mutual_dreams, dc.level,
         dc.first_seen_at, dc.last_seen_at,
         u.id            AS other_user_id,
         u.username      AS other_username,
         p.display_name  AS other_display_name,
         p.avatar_url    AS other_avatar_url,
         (SELECT COUNT(*) FROM dream_mentions
          WHERE dreamer_user_id = $1 AND mentioned_user_id = u.id)::text  AS i_dreamed_about_them,
         (SELECT COUNT(*) FROM dream_mentions
          WHERE dreamer_user_id = u.id AND mentioned_user_id = $1)::text  AS they_dreamed_about_me
       FROM dream_connections dc
       JOIN users u ON u.id = CASE WHEN dc.user_id_a = $1 THEN dc.user_id_b ELSE dc.user_id_a END
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE dc.user_id_a = $1 OR dc.user_id_b = $1
       ORDER BY dc.last_seen_at DESC`,
      [userId],
    );
  }

  async getConnectionDetail(connectionId: string, userId: string): Promise<ConnectionDetail | null> {
    const rows = await this.dataSource.query<ConnectionRow[]>(
      `SELECT
         dc.id, dc.user_id_a, dc.user_id_b,
         dc.connection_score, dc.mutual_dreams, dc.level,
         dc.first_seen_at, dc.last_seen_at,
         u.id            AS other_user_id,
         u.username      AS other_username,
         p.display_name  AS other_display_name,
         p.avatar_url    AS other_avatar_url,
         (SELECT COUNT(*) FROM dream_mentions
          WHERE dreamer_user_id = $2 AND mentioned_user_id = u.id)::text  AS i_dreamed_about_them,
         (SELECT COUNT(*) FROM dream_mentions
          WHERE dreamer_user_id = u.id AND mentioned_user_id = $2)::text  AS they_dreamed_about_me
       FROM dream_connections dc
       JOIN users u ON u.id = CASE WHEN dc.user_id_a = $2 THEN dc.user_id_b ELSE dc.user_id_a END
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE dc.id = $1
         AND (dc.user_id_a = $2 OR dc.user_id_b = $2)`,
      [connectionId, userId],
    );

    const row = rows[0];
    if (!row) return null;

    // Fetch timeline: all mentions between these two users, chronological
    const timeline = await this.dataSource.query<TimelineEvent[]>(
      `SELECT
         dm.id           AS "mentionId",
         dm.dream_id     AS "dreamId",
         d.title         AS "dreamTitle",
         dm.dreamer_user_id   AS "dreamerUserId",
         u.username      AS "dreamerUsername",
         dm.matched_name AS "matchedName",
         dm.confidence_score  AS "confidenceScore",
         dm.created_at   AS "createdAt"
       FROM dream_mentions dm
       JOIN dreams d ON d.id = dm.dream_id AND d.deleted_at IS NULL
       JOIN users  u ON u.id = dm.dreamer_user_id
       WHERE (dm.dreamer_user_id  = $1 AND dm.mentioned_user_id = $2)
          OR (dm.dreamer_user_id  = $2 AND dm.mentioned_user_id = $1)
       ORDER BY dm.created_at ASC`,
      [userId, row.other_user_id],
    );

    return {
      id:                row.id,
      otherUserId:       row.other_user_id,
      otherUsername:     row.other_username,
      otherDisplayName:  row.other_display_name,
      otherAvatarUrl:    row.other_avatar_url,
      connectionScore:   row.connection_score,
      mutualDreams:      row.mutual_dreams,
      level:             row.level,
      firstSeenAt:       row.first_seen_at,
      lastSeenAt:        row.last_seen_at,
      iDreamedAboutThem: parseInt(row.i_dreamed_about_them, 10),
      theyDreamedAboutMe: parseInt(row.they_dreamed_about_me, 10),
      timeline,
    };
  }

  async getConnectionCount(userId: string): Promise<number> {
    const [{ count }] = await this.dataSource.query<[{ count: string }]>(
      `SELECT COUNT(*) FROM dream_connections WHERE user_id_a = $1 OR user_id_b = $1`,
      [userId],
    );
    return parseInt(count, 10);
  }
}
