import { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '@/components/Avatar';
import { getMyMentions, getMyMentionStats } from '@/api/mentions.api';
import { Colors } from '@/constants/colors';
import type { DreamMention, TopDreamer } from '@/types/mention.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const { width: W, height: H } = Dimensions.get('window');

type AppearanceType =
  | 'familiar_face'
  | 'strong_presence'
  | 'guide_figure'
  | 'recurring_person'
  | 'unknown_visitor'
  | 'emotional_presence';

type PrivacyLevel = 'revealed' | 'partial' | 'anonymous';

interface AppearanceCfg { label: string; color: string; glyph: string }
interface PrivacyCfg    { label: string; color: string; icon: string  }

const APPEARANCE_CONFIG: Record<AppearanceType, AppearanceCfg> = {
  familiar_face:      { label: 'Tanıdık Yüz',         color: '#FBBF24', glyph: '◉' },
  strong_presence:    { label: 'Güçlü Varlık',        color: '#A78BFA', glyph: '✦' },
  guide_figure:       { label: 'Rehber Figür',         color: '#34D399', glyph: '◈' },
  recurring_person:   { label: 'Yinelenen Kişi',       color: '#F472B6', glyph: '◎' },
  unknown_visitor:    { label: 'Bilinmeyen Ziyaretçi', color: '#60A5FA', glyph: '◌' },
  emotional_presence: { label: 'Duygusal Varlık',      color: '#C084FC', glyph: '◆' },
};

const PRIVACY_CONFIG: Record<PrivacyLevel, PrivacyCfg> = {
  revealed:  { label: 'Kimlik Görünür',    color: '#4CAF87',        icon: 'eye-outline'           },
  partial:   { label: 'Bilinmeyen Rüyacı', color: '#FBBF24',        icon: 'eye-off-outline'       },
  anonymous: { label: 'Anonim Rüyacı',     color: Colors.textMuted, icon: 'person-remove-outline' },
};

// Numeric pixel positions for star particles (avoids DimensionValue TS issues)
const STAR_POS: { l: number; t: number }[] = [
  { l: W * 0.07, t: H * 0.09 }, { l: W * 0.83, t: H * 0.07 },
  { l: W * 0.16, t: H * 0.24 }, { l: W * 0.73, t: H * 0.21 },
  { l: W * 0.04, t: H * 0.44 }, { l: W * 0.89, t: H * 0.37 },
  { l: W * 0.11, t: H * 0.61 }, { l: W * 0.79, t: H * 0.54 },
  { l: W * 0.44, t: H * 0.11 }, { l: W * 0.37, t: H * 0.72 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Bugün';
  if (days === 1) return 'Dün';
  if (days < 7)  return `${days} gün önce`;
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function derivePrivacyLevel(mention: DreamMention): PrivacyLevel {
  if (mention.confidenceScore >= 100) return 'revealed';
  if (mention.confidenceScore >= 90)  return 'partial';
  return 'anonymous';
}

function deriveAppearanceType(mention: DreamMention, count: number): AppearanceType {
  const sc = mention.confidenceScore;
  if (sc >= 100 && count >= 3) return 'familiar_face';
  if (sc >= 100)               return 'familiar_face';
  if (sc >= 90  && count >= 3) return 'recurring_person';
  if (sc >= 90)                return 'strong_presence';
  if (count >= 4)              return 'recurring_person';
  if (sc >= 80)                return 'unknown_visitor';
  return 'emotional_presence';
}

// ── ConfidenceDots ────────────────────────────────────────────────────────────

function ConfidenceDots({ score }: { score: number }) {
  const filled = score >= 100 ? 3 : score >= 90 ? 2 : 1;
  const color  = score >= 100 ? '#FBBF24' : score >= 90 ? Colors.primary : '#60A5FA';
  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
      {([0, 1, 2] as const).map(i => (
        <View
          key={i}
          style={{
            width: 5, height: 5, borderRadius: 3,
            backgroundColor: i < filled ? color : `${color}28`,
          }}
        />
      ))}
    </View>
  );
}

// ── Star particles ────────────────────────────────────────────────────────────

function StarParticles() {
  const anims = useRef(STAR_POS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 260),
          Animated.timing(a, { toValue: 0.65, duration: 2800, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0,    duration: 2800, useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((anim, i) => {
        const pos = STAR_POS[i];
        if (!pos) return null;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: pos.l as number,
              top:  pos.t as number,
              width: 2, height: 2, borderRadius: 1,
              backgroundColor: '#A78BFA',
              opacity: anim,
            }}
          />
        );
      })}
    </View>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  const moonAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(moonAnim, { toValue: 0.72, duration: 3200, useNativeDriver: true }),
        Animated.timing(moonAnim, { toValue: 1,    duration: 3200, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <View style={s.emptyContainer}>
      <StarParticles />
      <Animated.View style={{ opacity: moonAnim, alignItems: 'center' }}>
        <View style={s.emptyMoonRing}>
          <Ionicons name="moon" size={38} color={Colors.primary} />
        </View>
      </Animated.View>
      <Text style={s.emptyTitle}>Henüz kimsenin rüyasında{'\n'}görünmedin.</Text>
      <Text style={s.emptySubtitle}>Bir gün birinin bilinçaltında iz bırakabilirsin.</Text>
      <View style={s.emptyDivider} />
      <Text style={s.emptyHint}>Birisi senden bahseden bir rüya yazdığında{'\n'}bu ekranda görünecek.</Text>
    </View>
  );
}

// ── Appearance card ───────────────────────────────────────────────────────────

function AppearanceCard({ mention, appearanceCount, onPress }: {
  mention: DreamMention;
  appearanceCount: number;
  onPress: () => void;
}) {
  const privacy = derivePrivacyLevel(mention);
  const appType = deriveAppearanceType(mention, appearanceCount);
  const typeCfg = APPEARANCE_CONFIG[appType];
  const privCfg = PRIVACY_CONFIG[privacy];

  const displayName =
    privacy === 'anonymous' ? 'Anonim Rüyacı' :
    privacy === 'partial'   ? 'Bilinmeyen Rüyacı' :
    (mention.dreamerDisplayName ?? mention.dreamerUsername);

  const isGlowing = mention.confidenceScore >= 90;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1, marginBottom: 8 })}>
      <View style={[
        s.card,
        isGlowing && {
          borderColor: `${typeCfg.color}45`,
          shadowColor: typeCfg.color,
          shadowOpacity: 0.16,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
          elevation: 2,
        },
      ]}>
        {/* Left: avatar or anon placeholder */}
        <View style={s.cardLeft}>
          {privacy === 'anonymous' ? (
            <View style={[s.anonCircle, { borderColor: `${privCfg.color}35` }]}>
              <Ionicons name={privCfg.icon as any} size={20} color={privCfg.color} />
            </View>
          ) : (
            <Avatar uri={mention.dreamerAvatarUrl ?? null} name={displayName} size={46} />
          )}
        </View>

        {/* Right */}
        <View style={s.cardRight}>
          {/* Name + appearance type badge */}
          <View style={s.cardNameRow}>
            <Text style={s.cardName} numberOfLines={1}>{displayName}</Text>
            <View style={[s.typeBadge, { backgroundColor: `${typeCfg.color}18`, borderColor: `${typeCfg.color}30` }]}>
              <Text style={[s.typeBadgeText, { color: typeCfg.color }]}>{typeCfg.glyph} {typeCfg.label}</Text>
            </View>
          </View>

          {/* Privacy label row */}
          <View style={s.cardSubRow}>
            <Ionicons name={privCfg.icon as any} size={10} color={privCfg.color} />
            <Text style={[s.cardPrivacy, { color: privCfg.color }]}>{privCfg.label}</Text>
            {privacy === 'revealed' && (
              <Text style={s.cardUsername}>· @{mention.dreamerUsername}</Text>
            )}
          </View>

          {/* Dream fragment */}
          {mention.dreamTitle ? (
            <View style={s.fragmentRow}>
              <Text style={s.fragmentQuote}>"</Text>
              <Text style={s.fragmentText} numberOfLines={2}>{mention.dreamTitle}</Text>
            </View>
          ) : null}

          {/* Footer: confidence + time + repeat count */}
          <View style={s.cardFooter}>
            <ConfidenceDots score={mention.confidenceScore} />
            <Text style={s.cardTime}>{timeAgo(mention.createdAt)}</Text>
            {appearanceCount > 1 && (
              <View style={s.countPill}>
                <Text style={s.countPillText}>{appearanceCount}×</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ── Stat box ──────────────────────────────────────────────────────────────────

function StatBox({ icon, label, value, color }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string; value: string; color: string;
}) {
  return (
    <View style={[s.statBox, { borderColor: `${color}22` }]}>
      <View style={[s.statIconWrap, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <Text style={[s.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ── Network row ───────────────────────────────────────────────────────────────

function NetworkRow({ dreamer, rank }: { dreamer: TopDreamer; rank: number }) {
  const router = useRouter();
  const name   = dreamer.displayName ?? dreamer.username;
  const barW   = Math.min(100, dreamer.count * 18);
  const isTop  = rank === 1;

  return (
    <Pressable
      style={({ pressed }) => [s.networkRow, { opacity: pressed ? 0.85 : 1 }]}
      onPress={() => router.push(`/user/${dreamer.userId}`)}
    >
      <Text style={[s.networkRank, isTop && { color: '#FBBF24' }]}>#{rank}</Text>
      <Avatar uri={dreamer.avatarUrl ?? null} name={name} size={34} />
      <View style={s.networkBody}>
        <View style={s.networkTop}>
          <Text style={s.networkName} numberOfLines={1}>{name}</Text>
          <Text style={[s.networkCount, { color: isTop ? '#FBBF24' : Colors.primary }]}>{dreamer.count}×</Text>
        </View>
        <View style={s.networkBar}>
          <View
            style={[
              s.networkFill,
              { width: `${barW}%` as any, backgroundColor: isTop ? '#FBBF24' : Colors.primary },
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
}

// ── AI integration teaser ─────────────────────────────────────────────────────
// Architecture hook: feed mention data into AI pipeline to surface emotional
// patterns, recurring symbols, and archetypal roles across dreams.

function AIBanner() {
  return (
    <View style={s.aiBanner}>
      <View style={s.aiBannerIcon}>
        <Ionicons name="sparkles-outline" size={16} color="#A78BFA" />
      </View>
      <View style={s.aiBannerBody}>
        <Text style={s.aiBannerTitle}>Yakında: AI Rüya Analizi</Text>
        <Text style={s.aiBannerSub}>
          Bilinçaltlarında bıraktığın iz — duygusal temalar, semboller ve arketipler —
          yapay zeka tarafından haritalanacak.
        </Text>
      </View>
      <View style={s.aiBannerBadge}>
        <Text style={s.aiBannerBadgeText}>Beta</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MentionsScreen() {
  const router = useRouter();

  const mentionsQ = useQuery({
    queryKey: ['mentions', 'me'],
    queryFn:  () => getMyMentions(1, 50),
    staleTime: 5 * 60 * 1000,
  });

  const statsQ = useQuery({
    queryKey: ['mentions', 'stats'],
    queryFn:  getMyMentionStats,
    staleTime: 5 * 60 * 1000,
  });

  const mentions  = mentionsQ.data?.items ?? [];
  const stats     = statsQ.data;
  const isLoading = mentionsQ.isLoading || statsQ.isLoading;

  // How many times each dreamer appears in the list
  const dreamerCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of mentions) {
      map[m.dreamerUserId] = (map[m.dreamerUserId] ?? 0) + 1;
    }
    return map;
  }, [mentions]);

  // API returns DESC by createdAt — first item is newest
  const latestDate = mentions.length > 0 ? (mentions[0]?.createdAt ?? null)                   : null;
  const firstDate  = mentions.length > 0 ? (mentions[mentions.length - 1]?.createdAt ?? null) : null;

  const onRefresh = () => {
    void mentionsQ.refetch();
    void statsQ.refetch();
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Sticky header ── */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.heading}>Rüyamda Göründüm</Text>
          {stats && stats.totalMentions > 0 && (
            <Text style={s.subheading}>{stats.totalMentions} görünüm · {stats.uniqueDreamers} farklı kişi</Text>
          )}
        </View>
        {stats && stats.totalMentions > 0 ? (
          <View style={s.totalBadge}>
            <Text style={s.totalBadgeText}>{stats.totalMentions}</Text>
          </View>
        ) : (
          <View style={{ width: 32 }} />
        )}
      </View>

      {isLoading ? (
        <View style={s.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={s.loaderText}>Rüya kayıtları taranıyor…</Text>
        </View>
      ) : mentions.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={
            <RefreshControl
              refreshing={(mentionsQ.isFetching || statsQ.isFetching) && !isLoading}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          {/* ── Stats ── */}
          {stats && (
            <View style={s.statRow}>
              <StatBox
                icon="moon-outline"
                label="GÖRÜNÜM"
                value={String(stats.totalMentions)}
                color={Colors.primary}
              />
              <StatBox
                icon="people-outline"
                label="RÜYACI"
                value={String(stats.uniqueDreamers)}
                color="#A78BFA"
              />
              <StatBox
                icon="calendar-outline"
                label="İLK"
                value={firstDate ? shortDate(firstDate) : '—'}
                color="#60A5FA"
              />
              <StatBox
                icon="time-outline"
                label="SON"
                value={latestDate ? timeAgo(latestDate) : '—'}
                color="#F472B6"
              />
            </View>
          )}

          {/* ── Appearance list ── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Ionicons name="eye-outline" size={13} color={Colors.primary} />
              <Text style={[s.sectionTitle, { color: Colors.primary }]}>Görünümler</Text>
              <View style={[s.sectionBadge, { backgroundColor: `${Colors.primary}18` }]}>
                <Text style={[s.sectionBadgeText, { color: Colors.primary }]}>{mentions.length}</Text>
              </View>
            </View>
            {mentions.map(m => (
              <AppearanceCard
                key={m.id}
                mention={m}
                appearanceCount={dreamerCountMap[m.dreamerUserId] ?? 1}
                onPress={() => router.push(`/dream/${m.dreamId}`)}
              />
            ))}
          </View>

          {/* ── Dream Network ── */}
          {stats && stats.topDreamers.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Ionicons name="git-network-outline" size={13} color="#F472B6" />
                <Text style={[s.sectionTitle, { color: '#F472B6' }]}>Dream Network</Text>
              </View>
              <View style={s.networkCard}>
                {stats.topDreamers.map((d, i) => (
                  <NetworkRow key={d.userId} dreamer={d} rank={i + 1} />
                ))}
              </View>
            </View>
          )}

          {/* ── AI teaser ── */}
          <AIBanner />

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerCenter:   { flex: 1 },
  heading:        { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  subheading:     { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  totalBadge:     { backgroundColor: `${Colors.primary}20`, borderRadius: 10, borderWidth: 1, borderColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 2 },
  totalBadgeText: { fontSize: 12, fontWeight: '800', color: Colors.primary },

  loader:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { fontSize: 13, color: Colors.textMuted },

  // ── Empty state ──
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 14 },
  emptyMoonRing:  { width: 76, height: 76, borderRadius: 38, backgroundColor: `${Colors.primary}12`, borderWidth: 1, borderColor: `${Colors.primary}28`, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:     { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', lineHeight: 26 },
  emptySubtitle:  { fontSize: 13, color: Colors.primary, textAlign: 'center', lineHeight: 20, opacity: 0.80 },
  emptyDivider:   { width: 40, height: 1, backgroundColor: `${Colors.primary}28`, marginVertical: 2 },
  emptyHint:      { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },

  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

  section:          { marginBottom: 20 },
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle:     { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  sectionBadge:     { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  sectionBadgeText: { fontSize: 10, fontWeight: '800' },

  // ── 4-column stat row ──
  statRow:     { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statBox:     { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, padding: 10, alignItems: 'center', gap: 4 },
  statIconWrap:{ width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  statValue:   { fontSize: 14, fontWeight: '900', width: '100%', textAlign: 'center' },
  statLabel:   { fontSize: 8, color: Colors.textMuted, textAlign: 'center', fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },

  // ── Appearance card ──
  card:         { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 13, gap: 12 },
  cardLeft:     { flexShrink: 0 },
  cardRight:    { flex: 1, gap: 5 },
  cardNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardName:     { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  typeBadge:    { borderRadius: 6, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 1.5, flexShrink: 0 },
  typeBadgeText:{ fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  cardSubRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardPrivacy:  { fontSize: 11, fontWeight: '600' },
  cardUsername: { fontSize: 11, color: Colors.textMuted },
  fragmentRow:  { flexDirection: 'row', gap: 3, marginTop: 1 },
  fragmentQuote:{ fontSize: 16, color: `${Colors.primary}45`, lineHeight: 20, fontWeight: '900' },
  fragmentText: { fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic', flex: 1, lineHeight: 18 },
  cardFooter:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  cardTime:     { fontSize: 11, color: Colors.textMuted, flex: 1 },
  countPill:    { backgroundColor: `${Colors.primary}18`, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  countPillText:{ fontSize: 10, fontWeight: '800', color: Colors.primary },
  anonCircle:   { width: 46, height: 46, borderRadius: 23, backgroundColor: `${Colors.textMuted}12`, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Network ──
  networkCard:  { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14 },
  networkRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  networkRank:  { fontSize: 11, fontWeight: '700', color: Colors.textMuted, width: 22, textAlign: 'center' },
  networkBody:  { flex: 1, gap: 5 },
  networkTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  networkName:  { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  networkCount: { fontSize: 15, fontWeight: '900' },
  networkBar:   { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  networkFill:  { height: '100%', borderRadius: 2, opacity: 0.65 },

  // ── AI banner ──
  aiBanner:         { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#A78BFA14', borderRadius: 12, borderWidth: 1, borderColor: '#A78BFA22', padding: 14, marginBottom: 12 },
  aiBannerIcon:     { width: 34, height: 34, borderRadius: 10, backgroundColor: '#A78BFA18', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  aiBannerBody:     { flex: 1, gap: 4 },
  aiBannerTitle:    { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.72)' },
  aiBannerSub:      { fontSize: 11, color: Colors.textMuted, lineHeight: 17 },
  aiBannerBadge:    { backgroundColor: '#A78BFA22', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0 },
  aiBannerBadgeText:{ fontSize: 9, fontWeight: '800', color: '#A78BFA', letterSpacing: 0.5, textTransform: 'uppercase' },
});
