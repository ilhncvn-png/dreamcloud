import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CLUSTER_DEFINITIONS, ClusterDefinition } from './cluster-definitions';
import { DreamCluster } from './entities/dream-cluster.entity';
import { DreamClusterMember } from './entities/dream-cluster-member.entity';

const WEIGHTS = { themes: 0.35, symbols: 0.25, emotions: 0.15, locations: 0.10, archetypes: 0.15 };
const MIN_SCORE = 25;
const RECENT_DREAMS = 30;

interface UserDreamData {
  dreamId: string;
  themes: string[];
  symbols: string[];
  emotions: string[];
  locations: string[];
  archetypes: string[];
}

interface ScoreResult {
  score: number;
  matchedThemes: string[];
  matchedSymbols: string[];
  matchedEmotions: string[];
  matchedLocations: string[];
  matchedArchetypes: string[];
}

@Injectable()
export class ClustersService implements OnModuleInit {
  private readonly logger = new Logger(ClustersService.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectRepository(DreamCluster)
    private readonly clusterRepo: Repository<DreamCluster>,
    @InjectRepository(DreamClusterMember)
    private readonly memberRepo: Repository<DreamClusterMember>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seedClusters();
    } catch (err) {
      // Migrations may not have run yet in some environments; log and continue.
      this.logger.warn('seedClusters skipped on init — table may not exist yet', err);
    }
  }

  // ─── Seed predefined cluster rows ──────────────────────────────────────────

  private async seedClusters(): Promise<void> {
    for (const def of CLUSTER_DEFINITIONS) {
      const existing = await this.clusterRepo.findOne({ where: { slug: def.slug } });
      if (!existing) {
        await this.clusterRepo.save(
          this.clusterRepo.create({
            slug: def.slug,
            name: def.name,
            description: def.description,
            primaryTheme: def.primaryTheme,
            primarySymbol: def.primarySymbol,
            primaryEmotion: def.primaryEmotion,
            primaryArchetype: def.primaryArchetype,
          }),
        );
        this.logger.log(`Seeded cluster: ${def.name}`);
      }
    }
  }

  // ─── Scoring ────────────────────────────────────────────────────────────────

  private dimScore(
    dreamData: UserDreamData[],
    field: keyof Pick<UserDreamData, 'themes' | 'symbols' | 'emotions' | 'locations' | 'archetypes'>,
    criteria: string[],
  ): { score: number; matched: string[] } {
    if (dreamData.length === 0 || criteria.length === 0) return { score: 0, matched: [] };

    const matchedSet = new Set<string>();
    let dreamsWithMatch = 0;

    for (const d of dreamData) {
      const values = d[field] as string[];
      let hit = false;
      for (const v of values) {
        if (criteria.includes(v)) {
          matchedSet.add(v);
          hit = true;
        }
      }
      if (hit) dreamsWithMatch++;
    }

    const score = (dreamsWithMatch / dreamData.length) * 100;
    return { score, matched: Array.from(matchedSet) };
  }

  private scoreForCluster(dreamData: UserDreamData[], def: ClusterDefinition): ScoreResult {
    const th = this.dimScore(dreamData, 'themes',    def.criteria.themes);
    const sy = this.dimScore(dreamData, 'symbols',   def.criteria.symbols);
    const em = this.dimScore(dreamData, 'emotions',  def.criteria.emotions);
    const lo = this.dimScore(dreamData, 'locations', def.criteria.locations);
    const ar = this.dimScore(dreamData, 'archetypes',def.criteria.archetypes);

    const score =
      th.score * WEIGHTS.themes +
      sy.score * WEIGHTS.symbols +
      em.score * WEIGHTS.emotions +
      lo.score * WEIGHTS.locations +
      ar.score * WEIGHTS.archetypes;

    return {
      score: Math.round(score * 100) / 100,
      matchedThemes:     th.matched,
      matchedSymbols:    sy.matched,
      matchedEmotions:   em.matched,
      matchedLocations:  lo.matched,
      matchedArchetypes: ar.matched,
    };
  }

  // ─── Fetch user dream analysis data ─────────────────────────────────────────

  private async getUserDreamData(userId: string): Promise<UserDreamData[]> {
    const rows: {
      dream_id: string;
      themes: string[];
      symbols: string[];
      emotions: string[];
      locations: string[];
      archetypes: string[];
    }[] = await this.ds.query(
      `
      WITH recent AS (
        SELECT id FROM dreams
        WHERE user_id = $1 AND is_draft = FALSE AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $2
      )
      SELECT
        d.id AS dream_id,
        COALESCE(array_agg(DISTINCT dt.theme)              FILTER (WHERE dt.theme             IS NOT NULL), '{}') AS themes,
        COALESCE(array_agg(DISTINCT ds.symbol_category)    FILTER (WHERE ds.symbol_category   IS NOT NULL), '{}') AS symbols,
        COALESCE(array_agg(DISTINCT de.emotion)            FILTER (WHERE de.emotion            IS NOT NULL), '{}') AS emotions,
        COALESCE(array_agg(DISTINCT dl.location_type)      FILTER (WHERE dl.location_type     IS NOT NULL), '{}') AS locations,
        COALESCE(array_agg(DISTINCT df.archetype_candidate) FILTER (WHERE df.archetype_candidate IS NOT NULL AND df.archetype_candidate != 'unknown'), '{}') AS archetypes
      FROM recent r
      JOIN dreams d ON d.id = r.id
      LEFT JOIN dream_themes    dt ON dt.dream_id = d.id
      LEFT JOIN dream_symbols   ds ON ds.dream_id = d.id
      LEFT JOIN dream_emotions  de ON de.dream_id = d.id
      LEFT JOIN dream_locations dl ON dl.dream_id = d.id
      LEFT JOIN dream_figures   df ON df.dream_id = d.id
      GROUP BY d.id
      `,
      [userId, RECENT_DREAMS],
    );

    return rows.map((r) => ({
      dreamId:    r.dream_id,
      themes:     r.themes    ?? [],
      symbols:    r.symbols   ?? [],
      emotions:   r.emotions  ?? [],
      locations:  r.locations ?? [],
      archetypes: r.archetypes ?? [],
    }));
  }

  // ─── Compute memberships for a single user ──────────────────────────────────

  async recomputeUser(userId: string): Promise<void> {
    const dreamData = await this.getUserDreamData(userId);
    if (dreamData.length === 0) return;

    const clusters = await this.clusterRepo.find();
    const defMap = new Map(CLUSTER_DEFINITIONS.map((d) => [d.slug, d]));

    for (const cluster of clusters) {
      const def = defMap.get(cluster.slug);
      if (!def) continue;

      const result = this.scoreForCluster(dreamData, def);

      if (result.score >= MIN_SCORE) {
        await this.ds.query(
          `
          INSERT INTO dream_cluster_members
            (cluster_id, user_id, membership_score, matched_themes, matched_symbols,
             matched_emotions, matched_locations, matched_archetypes, joined_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          ON CONFLICT (cluster_id, user_id) DO UPDATE SET
            membership_score   = EXCLUDED.membership_score,
            matched_themes     = EXCLUDED.matched_themes,
            matched_symbols    = EXCLUDED.matched_symbols,
            matched_emotions   = EXCLUDED.matched_emotions,
            matched_locations  = EXCLUDED.matched_locations,
            matched_archetypes = EXCLUDED.matched_archetypes,
            updated_at         = NOW()
          `,
          [
            cluster.id,
            userId,
            result.score,
            result.matchedThemes,
            result.matchedSymbols,
            result.matchedEmotions,
            result.matchedLocations,
            result.matchedArchetypes,
          ],
        );
      } else {
        // Remove membership if score dropped below threshold
        await this.ds.query(
          `DELETE FROM dream_cluster_members WHERE cluster_id = $1 AND user_id = $2`,
          [cluster.id, userId],
        );
      }
    }

    await this.refreshClusterStats();
  }

  // ─── Recompute all users ─────────────────────────────────────────────────────

  async recomputeAll(): Promise<{ usersProcessed: number; membershipsCreated: number }> {
    const users: { id: string }[] = await this.ds.query(
      `SELECT DISTINCT u.id FROM users u
       JOIN dreams d ON d.user_id = u.id
       WHERE d.is_draft = FALSE AND d.deleted_at IS NULL`,
    );

    let membershipsCreated = 0;

    for (const user of users) {
      await this.recomputeUser(user.id);
    }

    const cnt: { count: string }[] = await this.ds.query(`SELECT COUNT(*) FROM dream_cluster_members`);
    membershipsCreated = parseInt(cnt[0]?.count ?? '0', 10);

    return { usersProcessed: users.length, membershipsCreated };
  }

  private async refreshClusterStats(): Promise<void> {
    await this.ds.query(`
      UPDATE dream_clusters dc SET
        member_count   = stats.mc,
        dream_count    = stats.dc,
        strength_score = COALESCE(stats.avg_score, 0),
        updated_at     = NOW()
      FROM (
        SELECT
          dcm.cluster_id,
          COUNT(DISTINCT dcm.user_id)::int      AS mc,
          COUNT(DISTINCT d.id)::int             AS dc,
          AVG(dcm.membership_score)             AS avg_score
        FROM dream_cluster_members dcm
        JOIN dreams d ON d.user_id = dcm.user_id AND d.is_draft = FALSE AND d.deleted_at IS NULL
        GROUP BY dcm.cluster_id
      ) stats
      WHERE dc.id = stats.cluster_id
    `);
  }

  // ─── Queries ─────────────────────────────────────────────────────────────────

  async getAllClusters(): Promise<DreamCluster[]> {
    return this.clusterRepo.find({ order: { memberCount: 'DESC' } });
  }

  async getMyClusters(userId: string): Promise<
    Array<{ cluster: DreamCluster; membershipScore: number; matchedThemes: string[]; matchedSymbols: string[]; matchedEmotions: string[]; matchedLocations: string[]; matchedArchetypes: string[] }>
  > {
    const rows: {
      id: string; name: string; slug: string; description: string;
      primary_theme: string; primary_emotion: string; primary_symbol: string; primary_archetype: string;
      member_count: number; dream_count: number; strength_score: number;
      created_at: Date; updated_at: Date;
      membership_score: number;
      matched_themes: string[]; matched_symbols: string[]; matched_emotions: string[];
      matched_locations: string[]; matched_archetypes: string[];
    }[] = await this.ds.query(
      `
      SELECT
        dc.id, dc.name, dc.slug, dc.description,
        dc.primary_theme, dc.primary_emotion, dc.primary_symbol, dc.primary_archetype,
        dc.member_count, dc.dream_count, dc.strength_score,
        dc.created_at, dc.updated_at,
        dcm.membership_score,
        dcm.matched_themes, dcm.matched_symbols, dcm.matched_emotions,
        dcm.matched_locations, dcm.matched_archetypes
      FROM dream_cluster_members dcm
      JOIN dream_clusters dc ON dc.id = dcm.cluster_id
      WHERE dcm.user_id = $1
      ORDER BY dcm.membership_score DESC
      `,
      [userId],
    );

    return rows.map((r) => ({
      cluster: {
        id: r.id, name: r.name, slug: r.slug, description: r.description,
        primaryTheme: r.primary_theme, primaryEmotion: r.primary_emotion,
        primarySymbol: r.primary_symbol, primaryArchetype: r.primary_archetype,
        memberCount: r.member_count, dreamCount: r.dream_count,
        strengthScore: Number(r.strength_score),
        createdAt: r.created_at, updatedAt: r.updated_at,
        members: [],
      } as DreamCluster,
      membershipScore: Number(r.membership_score),
      matchedThemes:     r.matched_themes ?? [],
      matchedSymbols:    r.matched_symbols ?? [],
      matchedEmotions:   r.matched_emotions ?? [],
      matchedLocations:  r.matched_locations ?? [],
      matchedArchetypes: r.matched_archetypes ?? [],
    }));
  }

  async getClusterById(clusterId: string, viewerUserId?: string): Promise<{
    cluster: DreamCluster;
    topMembers: Array<{ userId: string; username: string; displayName: string | null; avatarUrl: string | null; membershipScore: number }>;
    myMembership?: { membershipScore: number; matchedThemes: string[]; matchedSymbols: string[] };
  }> {
    const cluster = await this.clusterRepo.findOneOrFail({ where: { id: clusterId } });

    const topMembers: {
      user_id: string; username: string; display_name: string | null; avatar_url: string | null; membership_score: number;
    }[] = await this.ds.query(
      `
      SELECT u.id AS user_id, u.username, up.display_name, up.avatar_url,
             dcm.membership_score
      FROM dream_cluster_members dcm
      JOIN users u ON u.id = dcm.user_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE dcm.cluster_id = $1
      ORDER BY dcm.membership_score DESC
      LIMIT 20
      `,
      [clusterId],
    );

    let myMembership: { membershipScore: number; matchedThemes: string[]; matchedSymbols: string[] } | undefined;
    if (viewerUserId) {
      const me: { membership_score: number; matched_themes: string[]; matched_symbols: string[] }[] =
        await this.ds.query(
          `SELECT membership_score, matched_themes, matched_symbols
           FROM dream_cluster_members WHERE cluster_id = $1 AND user_id = $2`,
          [clusterId, viewerUserId],
        );
      if (me[0]) {
        myMembership = {
          membershipScore: Number(me[0].membership_score),
          matchedThemes:   me[0].matched_themes ?? [],
          matchedSymbols:  me[0].matched_symbols ?? [],
        };
      }
    }

    return {
      cluster,
      topMembers: topMembers.map((m) => ({
        userId: m.user_id, username: m.username, displayName: m.display_name,
        avatarUrl: m.avatar_url, membershipScore: Number(m.membership_score),
      })),
      ...(myMembership ? { myMembership } : {}),
    };
  }

  // ─── Common cluster IDs shared between two users ──────────────────────────

  async getSharedClusters(
    userIdA: string,
    userIdB: string,
  ): Promise<Array<{ cluster: DreamCluster; scoreA: number; scoreB: number }>> {
    const rows: {
      id: string; name: string; slug: string; description: string;
      primary_theme: string; primary_emotion: string; primary_symbol: string; primary_archetype: string;
      member_count: number; dream_count: number; strength_score: number;
      created_at: Date; updated_at: Date;
      score_a: number; score_b: number;
    }[] = await this.ds.query(
      `
      SELECT
        dc.id, dc.name, dc.slug, dc.description,
        dc.primary_theme, dc.primary_emotion, dc.primary_symbol, dc.primary_archetype,
        dc.member_count, dc.dream_count, dc.strength_score,
        dc.created_at, dc.updated_at,
        a.membership_score AS score_a, b.membership_score AS score_b
      FROM dream_cluster_members a
      JOIN dream_cluster_members b ON b.cluster_id = a.cluster_id AND b.user_id = $2
      JOIN dream_clusters dc ON dc.id = a.cluster_id
      WHERE a.user_id = $1
      ORDER BY (a.membership_score + b.membership_score) DESC
      `,
      [userIdA, userIdB],
    );

    return rows.map((r) => ({
      cluster: {
        id: r.id, name: r.name, slug: r.slug, description: r.description,
        primaryTheme: r.primary_theme, primaryEmotion: r.primary_emotion,
        primarySymbol: r.primary_symbol, primaryArchetype: r.primary_archetype,
        memberCount: r.member_count, dreamCount: r.dream_count,
        strengthScore: Number(r.strength_score),
        createdAt: r.created_at, updatedAt: r.updated_at,
        members: [],
      } as DreamCluster,
      scoreA: Number(r.score_a),
      scoreB: Number(r.score_b),
    }));
  }
}
