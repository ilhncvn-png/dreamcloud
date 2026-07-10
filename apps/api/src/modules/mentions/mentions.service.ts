import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DreamConnectionsService } from '../connections/connections.service';
import { DreamNotificationService } from '../notifications/dream-notification.service';
import { DreamMention } from './entities/dream-mention.entity';

// ── Turkish-aware text matching ───────────────────────────────────────────────

function normalizeTr(s: string): string {
  return s
    .replace(/[çÇ]/g, 'c').replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o').replace(/[ıİ]/g, 'i')
    .toLowerCase();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesWord(text: string, name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 3) return false;
  const normText = normalizeTr(text);
  const normName = escapeRegex(normalizeTr(trimmed));
  return new RegExp(`(?:^|[^a-z])${normName}(?:[^a-z]|$)`).test(normText);
}

// ── Row shapes from raw SQL ───────────────────────────────────────────────────

interface UserRow {
  id: string;
  username: string;
  display_name: string | null;
}

export interface MentionRow {
  id: string;
  dream_id: string;
  dreamer_user_id: string;
  mentioned_user_id: string;
  matched_name: string;
  confidence_score: number;
  created_at: string;
  dream_title: string | null;
  dreamer_username: string;
  dreamer_display_name: string | null;
  dreamer_avatar_url: string | null;
}

export interface TopDreamer {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  count: number;
}

export interface MentionStats {
  totalMentions: number;
  uniqueDreamers: number;
  topDreamers: TopDreamer[];
}

@Injectable()
export class DreamMentionsService {
  private readonly logger = new Logger(DreamMentionsService.name);

  constructor(
    @InjectRepository(DreamMention)
    private readonly mentionRepo: Repository<DreamMention>,

    @InjectDataSource()
    private readonly dataSource: DataSource,

    private readonly dreamNotif: DreamNotificationService,
    private readonly connections: DreamConnectionsService,
  ) {}

  // ── Core detection ─────────────────────────────────────────────────────────

  async detectAndSave(
    dreamId: string,
    dreamerId: string,
    title: string | null,
    content: string,
    isUpdate = false,
  ): Promise<void> {
    const text = [title ?? '', content].join(' ');

    // Fetch all active users except the dreamer
    const users = await this.dataSource.query<UserRow[]>(
      `SELECT u.id, u.username, p.display_name
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.is_active = TRUE
         AND u.deleted_at IS NULL
         AND u.id != $1`,
      [dreamerId],
    );

    type Candidate = { mentionedUserId: string; matchedName: string; confidenceScore: number };
    const candidates: Candidate[] = [];

    for (const u of users) {
      let bestName  = '';
      let bestScore = 0;

      // Display name: multi-word = 100, single-word = 90
      if (u.display_name) {
        const dn    = u.display_name.trim();
        const score = dn.includes(' ') ? 100 : 90;
        if (matchesWord(text, dn) && score > bestScore) {
          bestName  = dn;
          bestScore = score;
        }
      }

      // Username: 80
      if (matchesWord(text, u.username) && 80 > bestScore) {
        bestName  = u.username;
        bestScore = 80;
      }

      if (bestScore > 0) candidates.push({ mentionedUserId: u.id, matchedName: bestName, confidenceScore: bestScore });
    }

    if (candidates.length === 0) return;

    // For updates: find which users were already mentioned
    const existingIds = isUpdate
      ? new Set<string>(
          (await this.mentionRepo.find({ where: { dreamId }, select: ['mentionedUserId'] }))
            .map(m => m.mentionedUserId),
        )
      : new Set<string>();

    for (const c of candidates) {
      try {
        await this.dataSource.query(
          `INSERT INTO dream_mentions
             (id, dream_id, dreamer_user_id, mentioned_user_id, matched_name, confidence_score)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
           ON CONFLICT (dream_id, mentioned_user_id)
           DO UPDATE SET matched_name      = EXCLUDED.matched_name,
                         confidence_score  = EXCLUDED.confidence_score`,
          [dreamId, dreamerId, c.mentionedUserId, c.matchedName, c.confidenceScore],
        );

        // Notify only for genuinely new mentions
        if (!existingIds.has(c.mentionedUserId)) {
          void this.dreamNotif.notifyMention({
            dreamId,
            dreamerId,
            mentionedUserId: c.mentionedUserId,
            matchedName: c.matchedName,
          });
          // Check if this creates a reciprocal connection
          void this.connections.updateConnectionForPair(dreamerId, c.mentionedUserId);
        }
      } catch (err) {
        this.logger.warn(`mention insert failed for dream=${dreamId} user=${c.mentionedUserId}: ${err}`);
      }
    }
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  async getMentionsOfMe(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: MentionRow[]; total: number }> {
    const offset = (page - 1) * limit;

    const [rows, [{ count }]] = await Promise.all([
      this.dataSource.query<MentionRow[]>(
        `SELECT
           dm.id, dm.dream_id, dm.dreamer_user_id, dm.mentioned_user_id,
           dm.matched_name, dm.confidence_score, dm.created_at,
           d.title         AS dream_title,
           u.username      AS dreamer_username,
           p.display_name  AS dreamer_display_name,
           p.avatar_url    AS dreamer_avatar_url
         FROM dream_mentions dm
         JOIN dreams d ON d.id = dm.dream_id AND d.deleted_at IS NULL
         JOIN users  u ON u.id = dm.dreamer_user_id
         LEFT JOIN user_profiles p ON p.user_id = dm.dreamer_user_id
         WHERE dm.mentioned_user_id = $1
         ORDER BY dm.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      ),
      this.dataSource.query<[{ count: string }]>(
        `SELECT COUNT(*) FROM dream_mentions dm
         JOIN dreams d ON d.id = dm.dream_id AND d.deleted_at IS NULL
         WHERE dm.mentioned_user_id = $1`,
        [userId],
      ),
    ]);

    return { items: rows, total: parseInt(count, 10) };
  }

  async getMentionsInDream(dreamId: string): Promise<MentionRow[]> {
    return this.dataSource.query<MentionRow[]>(
      `SELECT
         dm.id, dm.dream_id, dm.dreamer_user_id, dm.mentioned_user_id,
         dm.matched_name, dm.confidence_score, dm.created_at,
         d.title        AS dream_title,
         u.username     AS dreamer_username,
         p.display_name AS dreamer_display_name,
         p.avatar_url   AS dreamer_avatar_url
       FROM dream_mentions dm
       JOIN dreams d ON d.id = dm.dream_id
       JOIN users  u ON u.id = dm.dreamer_user_id
       LEFT JOIN user_profiles p ON p.user_id = dm.dreamer_user_id
       WHERE dm.dream_id = $1
       ORDER BY dm.confidence_score DESC`,
      [dreamId],
    );
  }

  async getMentionStats(userId: string): Promise<MentionStats> {
    const [totals, topRows] = await Promise.all([
      this.dataSource.query<[{ total: string; unique_dreamers: string }]>(
        `SELECT
           COUNT(*)                      AS total,
           COUNT(DISTINCT dreamer_user_id) AS unique_dreamers
         FROM dream_mentions dm
         JOIN dreams d ON d.id = dm.dream_id AND d.deleted_at IS NULL
         WHERE dm.mentioned_user_id = $1`,
        [userId],
      ),
      this.dataSource.query<Array<{
        user_id: string; username: string; display_name: string | null;
        avatar_url: string | null; mention_count: string;
      }>>(
        `SELECT
           u.id            AS user_id,
           u.username,
           p.display_name,
           p.avatar_url,
           COUNT(*)        AS mention_count
         FROM dream_mentions dm
         JOIN dreams d ON d.id = dm.dream_id AND d.deleted_at IS NULL
         JOIN users  u ON u.id = dm.dreamer_user_id
         LEFT JOIN user_profiles p ON p.user_id = dm.dreamer_user_id
         WHERE dm.mentioned_user_id = $1
         GROUP BY u.id, u.username, p.display_name, p.avatar_url
         ORDER BY mention_count DESC
         LIMIT 10`,
        [userId],
      ),
    ]);

    return {
      totalMentions:   parseInt(totals[0]?.total ?? '0', 10),
      uniqueDreamers:  parseInt(totals[0]?.unique_dreamers ?? '0', 10),
      topDreamers: topRows.map(r => ({
        userId:      r.user_id,
        username:    r.username,
        displayName: r.display_name,
        avatarUrl:   r.avatar_url,
        count:       parseInt(r.mention_count, 10),
      })),
    };
  }

  // Scan existing dreams on demand (for seeding/backfill)
  async backfillDream(dreamId: string, dreamerId: string, title: string | null, content: string): Promise<void> {
    await this.detectAndSave(dreamId, dreamerId, title, content, false);
  }
}
