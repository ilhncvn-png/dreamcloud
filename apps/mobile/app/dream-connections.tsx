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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '@/components/Avatar';
import { getMyConnections, getConnectionDetail } from '@/api/connections.api';
import { getMyProfile } from '@/api/users.api';
import { Colors } from '@/constants/colors';
import type {
  DreamConnection,
  DreamConnectionLevel,
  DreamConnectionDetail,
  ConnectionTimeline,
} from '@/types/connection.types';

const { width: W } = Dimensions.get('window');
const LINE_W   = Math.max(60, W - 188);
const DOT_POS  = [LINE_W * 0.18, LINE_W * 0.48, LINE_W * 0.78] as const;

// ── Level config ──────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<DreamConnectionLevel, {
  label: string; color: string; glyph: string; desc: string; fill: number;
}> = {
  signal:    { label: 'Sinyal',    color: '#60A5FA', glyph: '◌', desc: 'İlk titreşim', fill: 0.20 },
  resonance: { label: 'Rezonans', color: '#A78BFA', glyph: '◎', desc: 'Ruhsal bir bağ', fill: 0.42 },
  strong:    { label: 'Güçlü',    color: '#6C63FF', glyph: '◉', desc: 'Derin enerji uyumu', fill: 0.64 },
  deep:      { label: 'Derin',    color: '#F472B6', glyph: '✦', desc: 'Bilinçaltı köprüsü', fill: 0.82 },
  mirror:    { label: 'Ayna',     color: '#FBBF24', glyph: '◈', desc: 'Rüya aynası', fill: 0.97 },
};

// ── Connection category derivation ────────────────────────────────────────────

type ConnectionCategory =
  | 'mutual_dream'
  | 'shared_symbol'
  | 'shared_place'
  | 'shared_emotion'
  | 'recurring_person'
  | 'collective_dream';

const CATEGORY_META: Record<ConnectionCategory, { label: string; icon: string; color: string }> = {
  mutual_dream:      { label: 'Karşılıklı Rüya', icon: 'swap-horizontal-outline', color: '#A78BFA' },
  shared_symbol:     { label: 'Ortak Sembol',     icon: 'star-outline',            color: '#F59E0B' },
  shared_place:      { label: 'Ortak Mekan',      icon: 'location-outline',        color: '#34D399' },
  shared_emotion:    { label: 'Ortak Duygu',      icon: 'heart-outline',           color: '#F472B6' },
  recurring_person:  { label: 'Tekrarlayan Bağ',  icon: 'repeat-outline',          color: '#60A5FA' },
  collective_dream:  { label: 'Kolektif Rüya',    icon: 'globe-outline',           color: '#C084FC' },
};

function deriveCategories(conn: DreamConnection): ConnectionCategory[] {
  const cats: ConnectionCategory[] = [];
  if (conn.iDreamedAboutThem > 0 && conn.theyDreamedAboutMe > 0) cats.push('mutual_dream');
  if (conn.iDreamedAboutThem > 1 || conn.theyDreamedAboutMe > 1)  cats.push('recurring_person');
  if (conn.level === 'deep' || conn.level === 'mirror')            cats.push('collective_dream');
  if (conn.mutualDreams >= 3)                                      cats.push('shared_symbol');
  return cats;
}

// ── Animated level badge ──────────────────────────────────────────────────────

function LevelBadge({ level }: { level: DreamConnectionLevel }) {
  const cfg    = LEVEL_CONFIG[level];
  const anim   = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1,   duration: 1400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 1400, useNativeDriver: true }),
      ]),
    ).start();
  }, [anim]);

  return (
    <View style={[badge.wrap, { borderColor: `${cfg.color}50` }]}>
      <Animated.View style={[badge.glow, { backgroundColor: cfg.color, opacity: anim }]} />
      <Text style={[badge.glyph, { color: cfg.color }]}>{cfg.glyph}</Text>
      <Text style={[badge.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ── Resonance bar ─────────────────────────────────────────────────────────────

function ResonanceBar({ level, color }: { level: DreamConnectionLevel; color: string }) {
  const fill   = LEVEL_CONFIG[level].fill;
  const width  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: fill,
      duration: 800,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [fill, width]);

  return (
    <View style={res.track}>
      <Animated.View
        style={[
          res.fill,
          {
            width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: color,
            shadowColor: color,
            shadowOpacity: 0.6,
            shadowRadius: 6,
            elevation: 4,
          },
        ]}
      />
      <Text style={[res.pct, { color }]}>{Math.round(fill * 100)}%</Text>
    </View>
  );
}

// ── Constellation bridge (detail view) ───────────────────────────────────────

function ConstellationBridge({
  myName, myUri,
  theirName, theirUri,
  color,
}: {
  myName: string; myUri?: string | null;
  theirName: string; theirUri?: string | null;
  color: string;
}) {
  const dot1 = useRef(new Animated.Value(0.15)).current;
  const dot2 = useRef(new Animated.Value(0.15)).current;
  const dot3 = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    const pulse = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 0.9, duration: 900, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.15, duration: 900, useNativeDriver: true }),
        ]),
      );
    pulse(dot1, 0).start();
    pulse(dot2, 300).start();
    pulse(dot3, 600).start();
  }, [dot1, dot2, dot3]);

  return (
    <View style={bridge.wrap}>
      {/* Left avatar */}
      <View style={bridge.userCol}>
        <View style={[bridge.ring, { borderColor: `${color}50` }]}>
          <Avatar uri={myUri ?? null} name={myName} size={56} />
        </View>
        <Text style={bridge.username} numberOfLines={1}>Sen</Text>
      </View>

      {/* Constellation line */}
      <View style={bridge.lineWrap}>
        <View style={[bridge.line, { borderColor: `${color}18` }]} />
        <Animated.View style={[bridge.dot, { backgroundColor: color, opacity: dot1, left: DOT_POS[0] }]} />
        <Animated.View style={[bridge.dot, { backgroundColor: color, opacity: dot2, left: DOT_POS[1] }]} />
        <Animated.View style={[bridge.dot, { backgroundColor: color, opacity: dot3, left: DOT_POS[2] }]} />
      </View>

      {/* Right avatar */}
      <View style={bridge.userCol}>
        <View style={[bridge.ring, { borderColor: `${color}50` }]}>
          <Avatar uri={theirUri ?? null} name={theirName} size={56} />
        </View>
        <Text style={bridge.username} numberOfLines={1}>{theirName}</Text>
      </View>
    </View>
  );
}

// ── Shared names (from timeline matchedNames) ─────────────────────────────────

function SharedNamesSection({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <View style={sn.wrap}>
      <Text style={sn.label}>PAYLAŞILAN REFERANSLAR</Text>
      <View style={sn.row}>
        {names.map((n, i) => (
          <View key={`${n}-${i}`} style={sn.chip}>
            <Text style={sn.chipText}>{n}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Category badges row ───────────────────────────────────────────────────────

function CategoryBadges({ categories }: { categories: ConnectionCategory[] }) {
  if (categories.length === 0) return null;
  return (
    <View style={catB.wrap}>
      {categories.map(cat => {
        const m = CATEGORY_META[cat];
        return (
          <View key={cat} style={[catB.pill, { backgroundColor: `${m.color}14`, borderColor: `${m.color}28` }]}>
            <Ionicons name={m.icon as any} size={10} color={m.color} />
            <Text style={[catB.text, { color: m.color }]}>{m.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Timeline item ─────────────────────────────────────────────────────────────

function TimelineItem({
  event, myUserId, otherUsername,
}: {
  event: ConnectionTimeline; myUserId: string; otherUsername: string;
}) {
  const router = useRouter();
  const isMe   = event.dreamerUserId === myUserId;
  const color  = isMe ? '#60A5FA' : '#F472B6';
  const date   = new Date(event.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Pressable
      style={({ pressed }) => [tl.row, { opacity: pressed ? 0.80 : 1 }]}
      onPress={() => router.push(`/dream/${event.dreamId}`)}
    >
      <View style={[tl.dotCircle, { borderColor: `${color}60`, backgroundColor: `${color}14` }]}>
        <View style={[tl.dot, { backgroundColor: color }]} />
      </View>
      <View style={tl.body}>
        <Text style={tl.who}>
          <Text style={[tl.whoName, { color }]}>
            {isMe ? 'Sen' : `@${otherUsername}`}
          </Text>
          {isMe
            ? ` @${otherUsername} adını rüyanda gördün`
            : ' seni rüyasında gördü'}
        </Text>
        {event.dreamTitle ? (
          <Text style={tl.dreamTitle} numberOfLines={1}>"{event.dreamTitle}"</Text>
        ) : null}
        <View style={tl.meta}>
          <Text style={tl.date}>{date}</Text>
          {event.confidenceScore > 0 && (
            <View style={[tl.confBadge, { backgroundColor: `${color}14` }]}>
              <Text style={[tl.confText, { color }]}>{event.confidenceScore}</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.15)" />
    </Pressable>
  );
}

// ── Stats bar (list header) ───────────────────────────────────────────────────

function StatsBar({ connections }: { connections: DreamConnection[] }) {
  const total   = connections.length;
  const strongest = connections.reduce(
    (best, c) => LEVEL_CONFIG[c.level].fill > LEVEL_CONFIG[best.level].fill ? c : best,
    connections[0]!,
  );
  const totalDreams = connections.reduce((s, c) => s + c.mutualDreams, 0);
  const maxScore    = connections.reduce((m, c) => Math.max(m, c.connectionScore), 0);

  const strongCfg = LEVEL_CONFIG[strongest.level];

  return (
    <View style={sb.wrap}>
      <View style={sb.item}>
        <Text style={sb.val}>{total}</Text>
        <Text style={sb.lbl}>bağlantı</Text>
      </View>
      <View style={sb.divider} />
      <View style={sb.item}>
        <Text style={[sb.val, { color: strongCfg.color }]}>{strongCfg.label}</Text>
        <Text style={sb.lbl}>en güçlü</Text>
      </View>
      <View style={sb.divider} />
      <View style={sb.item}>
        <Text style={sb.val}>{totalDreams}</Text>
        <Text style={sb.lbl}>ortak rüya</Text>
      </View>
      <View style={sb.divider} />
      <View style={sb.item}>
        <Text style={sb.val}>{maxScore}</Text>
        <Text style={sb.lbl}>maks skor</Text>
      </View>
    </View>
  );
}

// ── Connection card ───────────────────────────────────────────────────────────

function ConnectionCard({ conn, onPress }: { conn: DreamConnection; onPress: () => void }) {
  const name       = conn.otherDisplayName ?? conn.otherUsername;
  const cfg        = LEVEL_CONFIG[conn.level];
  const since      = new Date(conn.firstSeenAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  const categories = deriveCategories(conn);

  return (
    <Pressable
      style={({ pressed }) => [card.wrap, { borderColor: `${cfg.color}28`, opacity: pressed ? 0.84 : 1 }]}
      onPress={onPress}
    >
      {/* Top: avatar + info */}
      <View style={card.top}>
        <View style={[card.avatarRing, { borderColor: `${cfg.color}45` }]}>
          <Avatar uri={conn.otherAvatarUrl} name={name} size={48} />
        </View>

        <View style={card.info}>
          <View style={card.nameRow}>
            <Text style={card.name} numberOfLines={1}>{name}</Text>
            <LevelBadge level={conn.level} />
          </View>
          <Text style={card.username}>@{conn.otherUsername}</Text>

          {/* Resonance bar */}
          <View style={card.barWrap}>
            <Text style={[card.barLabel, { color: cfg.color }]}>Rezonans</Text>
            <ResonanceBar level={conn.level} color={cfg.color} />
          </View>
        </View>

        <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.18)" />
      </View>

      {/* Stats row */}
      <View style={card.statsRow}>
        <View style={card.statChip}>
          <Ionicons name="sync-outline" size={10} color={cfg.color} />
          <Text style={[card.statNum, { color: cfg.color }]}>{conn.mutualDreams}</Text>
          <Text style={card.statLbl}>rüya</Text>
        </View>
        <View style={card.statChip}>
          <Ionicons name="eye-outline" size={10} color="#F472B6" />
          <Text style={[card.statNum, { color: '#F472B6' }]}>{conn.theyDreamedAboutMe}×</Text>
          <Text style={card.statLbl}>beni gördü</Text>
        </View>
        <View style={card.statChip}>
          <Ionicons name="moon-outline" size={10} color="#60A5FA" />
          <Text style={[card.statNum, { color: '#60A5FA' }]}>{conn.iDreamedAboutThem}×</Text>
          <Text style={card.statLbl}>ben gördüm</Text>
        </View>
        <View style={[card.sinceChip]}>
          <Text style={card.sinceText}>{since}'den beri</Text>
        </View>
      </View>

      {/* Category badges */}
      <CategoryBadges categories={categories} />
    </Pressable>
  );
}

// ── Detail view ───────────────────────────────────────────────────────────────

function ConnectionDetailView({ id, myUserId }: { id: string; myUserId: string | undefined }) {
  const router = useRouter();

  const { data: detail, isLoading: detLoading } = useQuery({
    queryKey: ['connections', 'detail', id],
    queryFn:  () => getConnectionDetail(id),
    staleTime: 5 * 60 * 1000,
  });

  const { data: me } = useQuery({
    queryKey: ['users', 'me'],
    queryFn:  getMyProfile,
    staleTime: 10 * 60 * 1000,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (detail) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [detail, fadeAnim]);

  if (detLoading || !detail) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loaderText}>Bağlantı analiz ediliyor…</Text>
      </View>
    );
  }

  const cfg        = LEVEL_CONFIG[detail.level];
  const name       = detail.otherDisplayName ?? detail.otherUsername;
  const myName     = me?.displayName ?? me?.username ?? 'Sen';
  const myUri      = me?.avatarUrl ?? null;
  const categories = deriveCategories(detail);

  // Unique matched names from timeline (shared references)
  const sharedNames = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const ev of detail.timeline) {
      const n = ev.matchedName?.trim();
      if (n && !seen.has(n)) { seen.add(n); out.push(n); }
    }
    return out.slice(0, 8);
  }, [detail.timeline]);

  return (
    <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.detailScroll}
      style={{ opacity: fadeAnim }}
    >
      {/* ── Constellation bridge ── */}
      <View style={[det.heroCard, { borderColor: `${cfg.color}25` }]}>
        <ConstellationBridge
          myName={myName}
          myUri={myUri}
          theirName={name}
          theirUri={detail.otherAvatarUrl}
          color={cfg.color}
        />

        {/* Level + description */}
        <View style={det.levelRow}>
          <LevelBadge level={detail.level} />
          <Text style={[det.levelDesc, { color: cfg.color }]}>{cfg.desc}</Text>
        </View>

        {/* Resonance score ring */}
        <View style={det.scoreWrap}>
          <View style={[det.scoreRing, { borderColor: `${cfg.color}40` }]}>
            <View style={[det.scoreRingInner, { backgroundColor: `${cfg.color}10` }]}>
              <Text style={[det.scoreNum, { color: cfg.color }]}>{detail.connectionScore}</Text>
              <Text style={det.scoreLabel}>Dream Resonance</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Stats grid ── */}
      <View style={det.statsGrid}>
        <StatBox label="Toplam Rüya"    value={`${detail.mutualDreams}`}       color={cfg.color}  icon="sync-outline" />
        <StatBox label="Beni Gördü"     value={`${detail.theyDreamedAboutMe}×`} color="#F472B6"   icon="eye-outline" />
        <StatBox label="Ben Gördüm"     value={`${detail.iDreamedAboutThem}×`}  color="#60A5FA"   icon="moon-outline" />
        <StatBox label="Bağlantı Skoru" value={`${detail.connectionScore}`}     color="#A78BFA"   icon="flash-outline" />
      </View>

      {/* ── Connection dates ── */}
      <View style={det.datesCard}>
        <View style={det.dateRow}>
          <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
          <Text style={det.dateLabel}>İlk Bağlantı</Text>
          <Text style={det.dateVal}>
            {new Date(detail.firstSeenAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <View style={[det.dateRow, { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 }]}>
          <Ionicons name="refresh-outline" size={12} color={Colors.textMuted} />
          <Text style={det.dateLabel}>Son Görüşme</Text>
          <Text style={det.dateVal}>
            {new Date(detail.lastSeenAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>
      </View>

      {/* ── Connection categories ── */}
      {categories.length > 0 && (
        <View style={det.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="layers-outline" size={13} color="#A78BFA" />
            <Text style={[styles.sectionTitle, { color: '#A78BFA' }]}>Bağlantı Türleri</Text>
          </View>
          <CategoryBadges categories={categories} />
        </View>
      )}

      {/* ── Shared references ── */}
      {sharedNames.length > 0 && (
        <View style={det.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="link-outline" size={13} color={cfg.color} />
            <Text style={[styles.sectionTitle, { color: cfg.color }]}>Paylaşılan Referanslar</Text>
          </View>
          <SharedNamesSection names={sharedNames} />
        </View>
      )}

      {/* ── Timeline ── */}
      {detail.timeline.length > 0 && (
        <View style={det.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="git-branch-outline" size={13} color="#A78BFA" />
            <Text style={[styles.sectionTitle, { color: '#A78BFA' }]}>Rüya Zaman Çizelgesi</Text>
          </View>
          <View style={tl.container}>
            <View style={[tl.line, { backgroundColor: `${cfg.color}30` }]} />
            {detail.timeline.map(ev => (
              <TimelineItem
                key={ev.mentionId}
                event={ev}
                myUserId={myUserId ?? ''}
                otherUsername={detail.otherUsername}
              />
            ))}
          </View>
        </View>
      )}

      {/* ── Profile link ── */}
      <Pressable
        style={({ pressed }) => [det.profileBtn, { opacity: pressed ? 0.80 : 1, borderColor: `${cfg.color}35`, backgroundColor: `${cfg.color}0A` }]}
        onPress={() => router.push(`/user/${detail.otherUserId}`)}
      >
        <Avatar uri={detail.otherAvatarUrl ?? null} name={name} size={24} />
        <Text style={[det.profileBtnText, { color: cfg.color }]}>@{detail.otherUsername} profilini gör</Text>
        <Ionicons name="arrow-forward" size={13} color={cfg.color} />
      </Pressable>

      <View style={{ height: 48 }} />
    </Animated.ScrollView>
  );
}

function StatBox({
  label, value, color, icon,
}: {
  label: string; value: string; color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={[det.statBox, { borderColor: `${color}28` }]}>
      <Ionicons name={icon} size={15} color={color} />
      <Text style={[det.statBoxVal, { color }]}>{value}</Text>
      <Text style={det.statBoxLabel}>{label}</Text>
    </View>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  const anim = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.80, duration: 2800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.50, duration: 2800, useNativeDriver: true }),
      ]),
    ).start();
  }, [anim]);

  return (
    <View style={em.wrap}>
      {/* Constellation stars */}
      <View style={em.stars} pointerEvents="none">
        {STAR_POSITIONS.map((p, i) => (
          <Animated.View key={i} style={[em.star, { left: p.l as number, top: p.t as number, opacity: anim }]} />
        ))}
      </View>

      <Ionicons name="moon-outline" size={56} color="rgba(167,139,250,0.40)" />
      <Text style={em.title}>Henüz rüya bağlantısı yok</Text>
      <Text style={em.body}>
        Sen birini, o da seni rüyasında gördüğünde{'\n'}bir Dream Connection oluşur.
      </Text>
      <View style={em.hint}>
        <Ionicons name="information-circle-outline" size={13} color={Colors.textMuted} />
        <Text style={em.hintText}>
          Rüyalarında gördüğün kişileri etiketle ve birinin seni görmesini bekle.
        </Text>
      </View>
    </View>
  );
}

const H = Dimensions.get('window').height;
const STAR_POSITIONS: { l: number; t: number }[] = [
  { l: W * 0.08, t: H * 0.10 }, { l: W * 0.22, t: H * 0.06 }, { l: W * 0.55, t: H * 0.08 },
  { l: W * 0.78, t: H * 0.14 }, { l: W * 0.88, t: H * 0.06 }, { l: W * 0.05, t: H * 0.30 },
  { l: W * 0.92, t: H * 0.28 }, { l: W * 0.15, t: H * 0.62 }, { l: W * 0.80, t: H * 0.58 },
  { l: W * 0.45, t: H * 0.70 }, { l: W * 0.70, t: H * 0.78 }, { l: W * 0.28, t: H * 0.82 },
];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DreamConnectionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const showDetail = !!params.id;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['connections', 'me'],
    queryFn:  getMyConnections,
    staleTime: 5 * 60 * 1000,
    enabled:  !showDetail,
  });

  const { data: me } = useQuery({
    queryKey: ['users', 'me'],
    queryFn:  getMyProfile,
    staleTime: 10 * 60 * 1000,
  });

  const connections = data?.items ?? [];
  const myUserId    = me?.id ?? '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Sticky header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.heading}>
            {showDetail ? 'Bağlantı Detayı' : 'Dream Connections'}
          </Text>
          {!showDetail && !isLoading && connections.length > 0 && (
            <Text style={styles.subheading}>{connections.length} karşılıklı rüya bağlantısı</Text>
          )}
        </View>
        {!showDetail && connections.length > 0 && (
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>{connections.length}</Text>
          </View>
        )}
      </View>

      {/* ── Content ── */}
      {showDetail ? (
        <ConnectionDetailView id={params.id!} myUserId={myUserId === '' ? undefined : myUserId} />
      ) : isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loaderText}>Rüya bağlantıları analiz ediliyor…</Text>
        </View>
      ) : connections.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => void refetch()}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {/* Stats bar */}
          <StatsBar connections={connections} />

          {/* Cards */}
          {connections.map(c => (
            <ConnectionCard
              key={c.id}
              conn={c}
              onPress={() => router.push({ pathname: '/dream-connections', params: { id: c.id } })}
            />
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter:{ flex: 1 },
  heading:     { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  subheading:  { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  totalBadge:  { backgroundColor: `${Colors.primary}20`, borderRadius: 10, borderWidth: 1, borderColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 2 },
  totalBadgeText: { fontSize: 12, fontWeight: '800', color: Colors.primary },

  loader:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText:  { fontSize: 13, color: Colors.textMuted },

  scroll:      { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  detailScroll:{ paddingHorizontal: 16, paddingTop: 8 },

  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
});

const badge = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3, position: 'relative', overflow: 'hidden' },
  glow:  { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.08 },
  glyph: { fontSize: 9 },
  text:  { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
});

const res = StyleSheet.create({
  track: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'visible', flexDirection: 'row', alignItems: 'center' },
  fill:  { height: '100%', borderRadius: 2 },
  pct:   { fontSize: 10, fontWeight: '800', marginLeft: 6 },
});

const bridge = StyleSheet.create({
  wrap:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 16 },
  userCol:  { alignItems: 'center', gap: 6, width: 72 },
  ring:     { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  username: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.55)', maxWidth: 68 },
  lineWrap:  { flex: 1, height: 2, position: 'relative', marginHorizontal: 6 },
  line:      { position: 'absolute', left: 0, right: 0, top: 0, borderTopWidth: 1, borderStyle: 'dashed' },
  dot:       { position: 'absolute', width: 6, height: 6, borderRadius: 3, top: -2 },
});

const em = StyleSheet.create({
  wrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, position: 'relative', gap: 14 },
  stars:    { position: 'absolute', inset: 0 },
  star:     { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#A78BFA' },
  title:    { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  body:     { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  hint:     { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 8, paddingHorizontal: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  hintText: { flex: 1, fontSize: 11.5, color: Colors.textMuted, lineHeight: 17 },
});

const sb = StyleSheet.create({
  wrap:    { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, paddingVertical: 14, marginBottom: 14 },
  item:    { flex: 1, alignItems: 'center', gap: 2 },
  val:     { fontSize: 16, fontWeight: '900', color: Colors.textPrimary },
  lbl:     { fontSize: 9.5, color: Colors.textMuted, fontWeight: '600' },
  divider: { width: 1, backgroundColor: Colors.border },
});

const card = StyleSheet.create({
  wrap:      { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, padding: 14, gap: 12, marginBottom: 10 },
  top:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarRing:{ borderRadius: 30, borderWidth: 1.5, padding: 2 },
  info:      { flex: 1, gap: 4 },
  nameRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name:      { flex: 1, fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  username:  { fontSize: 11, color: Colors.textMuted },
  barWrap:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel:  { fontSize: 9.5, fontWeight: '700', width: 50 },
  statsRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  statChip:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statNum:   { fontSize: 12, fontWeight: '800' },
  statLbl:   { fontSize: 9, color: Colors.textMuted, fontWeight: '500' },
  sinceChip: { marginLeft: 'auto' },
  sinceText: { fontSize: 9.5, color: Colors.textMuted },
});

const det = StyleSheet.create({
  heroCard:    { backgroundColor: Colors.surface, borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 10, alignItems: 'center', gap: 12 },
  levelRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelDesc:   { fontSize: 12, fontWeight: '600', fontStyle: 'italic' },

  scoreWrap:   { alignItems: 'center' },
  scoreRing:   { width: 96, height: 96, borderRadius: 48, borderWidth: 2, padding: 6, alignItems: 'center', justifyContent: 'center' },
  scoreRingInner: { flex: 1, borderRadius: 40, alignItems: 'center', justifyContent: 'center', width: '100%' },
  scoreNum:    { fontSize: 24, fontWeight: '900' },
  scoreLabel:  { fontSize: 8, color: Colors.textMuted, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  statsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  statBox:     { width: (W - 32 - 8) / 2 - 16, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: 'center', gap: 4 },
  statBoxVal:  { fontSize: 22, fontWeight: '900' },
  statBoxLabel:{ fontSize: 10, color: Colors.textMuted, textAlign: 'center' },

  datesCard:   { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 10, marginBottom: 10 },
  dateRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateLabel:   { flex: 1, fontSize: 12, color: Colors.textSecondary },
  dateVal:     { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },

  sectionCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 10 },

  profileBtn:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 13, borderWidth: 1, marginTop: 4 },
  profileBtnText:{ flex: 1, fontSize: 13, fontWeight: '700' },
});

const tl = StyleSheet.create({
  container: { position: 'relative', paddingLeft: 24 },
  line:      { position: 'absolute', left: 10, top: 10, bottom: 10, width: 1 },
  row:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  dotCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0, position: 'absolute', left: 1 },
  dot:       { width: 6, height: 6, borderRadius: 3 },
  body:      { flex: 1, gap: 3 },
  who:       { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  whoName:   { fontWeight: '700' },
  dreamTitle:{ fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },
  meta:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  date:      { fontSize: 10, color: Colors.textMuted },
  confBadge: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  confText:  { fontSize: 10, fontWeight: '800', color: Colors.textMuted },
});

const sn = StyleSheet.create({
  wrap:  { gap: 10 },
  label: { fontSize: 9, fontWeight: '900', letterSpacing: 2, color: Colors.textMuted },
  row:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(167,139,250,0.12)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#A78BFA' },
});

const catB = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  text: { fontSize: 10, fontWeight: '700' },
});
