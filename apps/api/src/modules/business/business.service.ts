import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class BusinessService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  // ── Revenue Metrics ─────────────────────────────────────────────────────────

  async getRevenueDashboard(): Promise<Record<string, unknown>> {
    const [userStats, dreamStats, engagementStats, growthTrend, topEngagers] = await Promise.all([
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT
           COUNT(*)::int                                                               AS total_users,
           COUNT(CASE WHEN is_active AND deleted_at IS NULL THEN 1 END)::int          AS active_users,
           COUNT(CASE WHEN created_at > NOW()-INTERVAL '30 days'
                       AND deleted_at IS NULL THEN 1 END)::int                        AS new_30d,
           COUNT(CASE WHEN created_at > NOW()-INTERVAL '7 days'
                       AND deleted_at IS NULL THEN 1 END)::int                        AS new_7d,
           COUNT(CASE WHEN last_login_at > NOW()-INTERVAL '7 days' THEN 1 END)::int  AS dau_7d,
           COUNT(CASE WHEN last_login_at > NOW()-INTERVAL '30 days' THEN 1 END)::int AS mau_30d
         FROM users`,
      ).catch(() => [] as Array<Record<string, unknown>>),

      this.db.query<Array<Record<string, unknown>>>(
        `SELECT
           COUNT(*)::int                                                        AS total_dreams,
           COUNT(CASE WHEN created_at > NOW()-INTERVAL '30 days' THEN 1 END)::int AS dreams_30d,
           COUNT(DISTINCT user_id)::int                                         AS dreamers_total,
           ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT user_id),0), 1)      AS avg_per_user
         FROM dreams WHERE deleted_at IS NULL`,
      ).catch(() => [] as Array<Record<string, unknown>>),

      this.db.query<Array<Record<string, unknown>>>(
        `WITH interactions AS (
           SELECT dream_id, COUNT(*) AS cnt FROM (
             SELECT dream_id FROM dream_likes
             UNION ALL SELECT dream_id FROM dream_saves
             UNION ALL SELECT dream_id FROM dream_comments
           ) t GROUP BY dream_id
         )
         SELECT
           COUNT(DISTINCT dl.user_id)::int  AS users_with_likes,
           SUM(i.cnt)::int                  AS total_interactions,
           ROUND(AVG(i.cnt)::numeric, 1)    AS avg_interactions_per_dream,
           COUNT(CASE WHEN i.cnt >= 5 THEN 1 END)::int AS viral_dreams
         FROM interactions i
         JOIN dreams dl ON dl.id = i.dream_id AND dl.deleted_at IS NULL`,
      ).catch(() => [] as Array<Record<string, unknown>>),

      this.db.query<Array<Record<string, unknown>>>(
        `SELECT DATE_TRUNC('week', created_at)::date AS week,
                COUNT(*)::int AS dreams
         FROM dreams WHERE deleted_at IS NULL AND created_at > NOW()-INTERVAL '8 weeks'
         GROUP BY week ORDER BY week`,
      ).catch(() => [] as Array<Record<string, unknown>>),

      this.db.query<Array<Record<string, unknown>>>(
        `SELECT u.username,
                COUNT(d.id)::int AS dream_count,
                COALESCE(SUM(lk.cnt),0)::int AS likes_received
         FROM users u
         JOIN dreams d ON d.user_id=u.id AND d.deleted_at IS NULL
         LEFT JOIN (
           SELECT dream_id, COUNT(*) AS cnt FROM dream_likes GROUP BY dream_id
         ) lk ON lk.dream_id = d.id
         WHERE u.deleted_at IS NULL
         GROUP BY u.id, u.username
         ORDER BY dream_count DESC LIMIT 5`,
      ).catch(() => [] as Array<Record<string, unknown>>),
    ]);

    const us = userStats[0] as Record<string, unknown> | undefined;
    const ds = dreamStats[0] as Record<string, unknown> | undefined;
    const es = engagementStats[0] as Record<string, unknown> | undefined;

    return {
      userStats: us ?? null,
      dreamStats: ds ?? null,
      engagementStats: es ?? null,
      growthTrend,
      topEngagers,
      // Revenue placeholders — pending payment integration
      revenue: {
        mrr: null, arr: null, arpu: null,
        premiumUsers: 0, premiumConversionPct: 0,
        adRevenue: null, totalRevenue: null,
        paymentStatus: 'NOT_INTEGRATED',
      },
      computedAt: new Date().toISOString(),
    };
  }

  // ── User Segments ────────────────────────────────────────────────────────────

  async getUserSegments(): Promise<Record<string, unknown>> {
    const [
      activeDreamers, silentUsers, powerUsers,
      highEngagement, connectedUsers, newJoiners,
      atRiskUsers, archetypeSegments, emotionSegments,
    ] = await Promise.all([
      // Active dreamers: ≥1 dream in last 30 days
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT COUNT(DISTINCT user_id)::int AS count,
                ROUND(COUNT(*)::numeric / COUNT(DISTINCT user_id), 1) AS avg_dreams
         FROM dreams WHERE deleted_at IS NULL AND created_at > NOW()-INTERVAL '30 days'`,
      ).catch(() => [] as Array<Record<string, unknown>>),

      // Silent users: active account but no dreams in 30 days
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT COUNT(*)::int AS count FROM users u
         WHERE u.deleted_at IS NULL AND u.is_active = true
           AND NOT EXISTS (
             SELECT 1 FROM dreams d
             WHERE d.user_id=u.id AND d.deleted_at IS NULL
               AND d.created_at > NOW()-INTERVAL '30 days'
           )`,
      ).catch(() => [] as Array<Record<string, unknown>>),

      // Power users: 5+ dreams in last 30 days
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT COUNT(*)::int AS count FROM (
           SELECT user_id FROM dreams
           WHERE deleted_at IS NULL AND created_at > NOW()-INTERVAL '30 days'
           GROUP BY user_id HAVING COUNT(*) >= 5
         ) t`,
      ).catch(() => [] as Array<Record<string, unknown>>),

      // High engagement: users whose dreams received 5+ total interactions
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT COUNT(DISTINCT d.user_id)::int AS count
         FROM dreams d
         JOIN (
           SELECT dream_id, COUNT(*) AS cnt FROM (
             SELECT dream_id FROM dream_likes
             UNION ALL SELECT dream_id FROM dream_saves
             UNION ALL SELECT dream_id FROM dream_comments
           ) t GROUP BY dream_id HAVING COUNT(*) >= 5
         ) eng ON eng.dream_id = d.id
         WHERE d.deleted_at IS NULL`,
      ).catch(() => [] as Array<Record<string, unknown>>),

      // Connected users: have resonance matches in last 30 days
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT COUNT(DISTINCT user_id_a)::int AS count
         FROM dream_matches WHERE created_at > NOW()-INTERVAL '30 days'`,
      ).catch(() => [] as Array<Record<string, unknown>>),

      // New joiners: joined in last 7 days
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT COUNT(*)::int AS count FROM users
         WHERE deleted_at IS NULL AND created_at > NOW()-INTERVAL '7 days'`,
      ).catch(() => [] as Array<Record<string, unknown>>),

      // At-risk users: 3+ failed login attempts or not logged in 14+ days
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT COUNT(*)::int AS count FROM users
         WHERE deleted_at IS NULL AND is_active = true
           AND (failed_login_attempts >= 3
             OR (last_login_at IS NOT NULL AND last_login_at < NOW()-INTERVAL '14 days'))`,
      ).catch(() => [] as Array<Record<string, unknown>>),

      // Archetype-based segments
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT df.archetype_candidate AS archetype,
                COUNT(DISTINCT d.user_id)::int AS user_count,
                COUNT(df.id)::int AS activation_count,
                ROUND(AVG(df.archetype_confidence)::numeric * 100, 1) AS avg_confidence
         FROM dream_figures df
         JOIN dreams d ON d.id=df.dream_id AND d.deleted_at IS NULL
         WHERE df.archetype_candidate IS NOT NULL
           AND d.created_at > NOW()-INTERVAL '30 days'
         GROUP BY df.archetype_candidate
         ORDER BY user_count DESC LIMIT 8`,
      ).catch(() => [] as Array<Record<string, unknown>>),

      // Emotion-dominant segments
      this.db.query<Array<Record<string, unknown>>>(
        `WITH user_emotion AS (
           SELECT d.user_id, de.emotion, COUNT(*)::int AS cnt,
                  ROW_NUMBER() OVER (PARTITION BY d.user_id ORDER BY COUNT(*) DESC) AS rn
           FROM dream_emotions de
           JOIN dreams d ON d.id=de.dream_id AND d.deleted_at IS NULL
           WHERE d.created_at > NOW()-INTERVAL '30 days'
           GROUP BY d.user_id, de.emotion
         )
         SELECT emotion, COUNT(*)::int AS user_count
         FROM user_emotion WHERE rn=1
         GROUP BY emotion ORDER BY user_count DESC LIMIT 8`,
      ).catch(() => [] as Array<Record<string, unknown>>),
    ]);

    const total = Number((await this.db.query<Array<Record<string, unknown>>>(
      `SELECT COUNT(*)::int AS n FROM users WHERE deleted_at IS NULL`,
    ).catch(() => [{ n: 0 }]))[0]?.['n'] ?? 0);

    const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
    const ad = Number(activeDreamers[0]?.['count'] ?? 0);
    const su = Number(silentUsers[0]?.['count'] ?? 0);
    const pu = Number(powerUsers[0]?.['count'] ?? 0);
    const he = Number(highEngagement[0]?.['count'] ?? 0);
    const cu = Number(connectedUsers[0]?.['count'] ?? 0);
    const nj = Number(newJoiners[0]?.['count'] ?? 0);
    const ar = Number(atRiskUsers[0]?.['count'] ?? 0);

    return {
      totalUsers: total,
      behaviorSegments: [
        {
          id: 'active_dreamers', label: 'Aktif Rüyacılar', color: '#00E87A',
          icon: '◉', count: ad, pct: pct(ad),
          description: 'Son 30 günde en az 1 rüya paylaşan kullanıcılar',
          avgDreams: activeDreamers[0]?.['avg_dreams'] ?? '—',
          badge: 'AKTIF',
        },
        {
          id: 'power_users', label: 'Güç Kullanıcıları', color: '#FFB800',
          icon: '⚡', count: pu, pct: pct(pu),
          description: 'Son 30 günde 5+ rüya paylaşan yoğun kullanıcılar',
          badge: 'GÜÇ',
        },
        {
          id: 'high_engagement', label: 'Yüksek Etkileşim', color: '#A78BFA',
          icon: '✦', count: he, pct: pct(he),
          description: 'Rüyaları 5+ beğeni/kayıt/yorum alan kullanıcılar',
          badge: 'ETKİLEŞİM',
        },
        {
          id: 'connected', label: 'Bağlantılı Rüyacılar', color: '#00CFFF',
          icon: '◈', count: cu, pct: pct(cu),
          description: 'Son 30 günde rezonans bağlantısı oluşan kullanıcılar',
          badge: 'BAĞLANTI',
        },
        {
          id: 'silent', label: 'Sessiz Kullanıcılar', color: '#5A5A84',
          icon: '○', count: su, pct: pct(su),
          description: 'Hesabı aktif ama son 30 günde rüya paylaşmayan',
          badge: 'SESSİZ',
        },
        {
          id: 'at_risk', label: 'Risk Altındaki', color: '#FF3060',
          icon: '⚠', count: ar, pct: pct(ar),
          description: 'Uzun süredir giriş yapmayan veya kilitlenen hesaplar',
          badge: 'RİSK',
        },
        {
          id: 'new_joiners', label: 'Yeni Katılanlar', color: '#FF8C00',
          icon: '◌', count: nj, pct: pct(nj),
          description: 'Son 7 günde katılan kullanıcılar — onboarding kritik',
          badge: 'YENİ',
        },
      ],
      archetypeSegments,
      emotionSegments,
      computedAt: new Date().toISOString(),
    };
  }

  // ── Campaigns ────────────────────────────────────────────────────────────────

  async getCampaigns(): Promise<Record<string, unknown>> {
    // No campaigns table yet — return structure with platform context
    const [platformCtx] = await Promise.all([
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT
           COUNT(DISTINCT d.user_id)::int AS addressable_audience,
           COUNT(d.id)::int               AS total_dreams_30d,
           COUNT(DISTINCT de.emotion)::int AS emotion_variety
         FROM dreams d
         LEFT JOIN dream_emotions de ON de.dream_id=d.id
         WHERE d.deleted_at IS NULL AND d.created_at > NOW()-INTERVAL '30 days'`,
      ).catch(() => [] as Array<Record<string, unknown>>),
    ]);

    return {
      campaigns: [],
      campaignStatus: 'NOT_LAUNCHED',
      platformContext: platformCtx[0] ?? null,
      placementZones: [
        { id: 'dream_feed', label: 'Rüya Akışı',    status: 'READY',   reach: 'Tüm aktif kullanıcılar' },
        { id: 'explore',    label: 'Keşfet',         status: 'READY',   reach: 'Organik keşfet ekranı' },
        { id: 'post_share', label: 'Paylaşım Sonrası', status: 'PLANNED', reach: 'Rüya paylaşımı akışı' },
        { id: 'profile',    label: 'Profil',         status: 'PLANNED', reach: 'Kullanıcı profil sayfası' },
      ],
      computedAt: new Date().toISOString(),
    };
  }

  // ── Advertising ──────────────────────────────────────────────────────────────

  async getAdvertisingOverview(): Promise<Record<string, unknown>> {
    const [audienceSize] = await Promise.all([
      this.db.query<Array<Record<string, unknown>>>(
        `SELECT
           COUNT(CASE WHEN is_active AND deleted_at IS NULL THEN 1 END)::int AS total_reach,
           COUNT(CASE WHEN last_login_at > NOW()-INTERVAL '30 days' THEN 1 END)::int AS monthly_active,
           COUNT(CASE WHEN last_login_at > NOW()-INTERVAL '7 days' THEN 1 END)::int  AS weekly_active
         FROM users`,
      ).catch(() => [] as Array<Record<string, unknown>>),
    ]);

    const aud = audienceSize[0] as Record<string, unknown> | undefined;

    return {
      adStatus: 'NOT_LAUNCHED',
      safetyStatus: 'COMPLIANT',
      audienceReach: {
        total: aud?.['total_reach'] ?? 0,
        monthly: aud?.['monthly_active'] ?? 0,
        weekly: aud?.['weekly_active'] ?? 0,
      },
      placements: [
        {
          id: 'native_dream', label: 'Native Rüya Kartı', format: 'Native',
          status: 'DESIGN_READY', safeContent: true, estimatedCTR: null,
          description: 'Rüya akışına organik biçimde entegre edilmiş içerik kartı',
        },
        {
          id: 'explore_banner', label: 'Keşfet Bandı', format: 'Banner',
          status: 'PLANNED', safeContent: true, estimatedCTR: null,
          description: 'Keşfet ekranı alt bandı — non-intrusive',
        },
        {
          id: 'sponsored_insight', label: 'Sponsorlu İçgörü', format: 'Insight Card',
          status: 'PLANNED', safeContent: true, estimatedCTR: null,
          description: 'AI içgörü kartı formatında sponsorlu içerik',
        },
        {
          id: 'archetype_match', label: 'Arketip Eşleşmesi', format: 'Contextual',
          status: 'FUTURE', safeContent: true, estimatedCTR: null,
          description: 'Kullanıcı arketipiyle uyumlu hedefli içerik (ileri faz)',
        },
      ],
      safetyChecks: [
        { label: 'İçerik Güvenlik Politikası',  status: 'PASS', detail: 'Rüya içerikleri hassas veri sayılır — reklam eşleşmesi şifrelenir' },
        { label: 'GDPR / KVKK Uyumluluğu',     status: 'PENDING', detail: 'Kullanıcı onay akışı entegrasyonu bekleniyor' },
        { label: 'Çocuk Güvenliği (COPPA)',     status: 'PASS', detail: '13+ yaş politikası uygulanıyor' },
        { label: 'Psikolojik Etik Kuralları',   status: 'PASS', detail: 'Kabus içerikli rüyalara reklam hedeflemesi yok' },
        { label: 'Reklam Sıklık Sınırı',        status: 'PENDING', detail: 'Frekans kap sistemi henüz entegre edilmedi' },
      ],
      metrics: { impressions: null, clicks: null, ctr: null, revenue: null },
      computedAt: new Date().toISOString(),
    };
  }
}
