import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { getIntelligenceNotifications } from '@/api/intelligence.api';
import type { IntelligenceNotification, IntelNotifType } from '@/types/intelligence.types';

// ── Constants ─────────────────────────────────────────────────────────────────

type FilterKey = 'ALL' | 'DREAM_MATCH' | 'SEEN_IN_DREAMS' | 'AI_EVENT';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL',           label: 'Tümü'    },
  { key: 'DREAM_MATCH',   label: 'Eşleşme' },
  { key: 'SEEN_IN_DREAMS',label: 'Sembol'  },
  { key: 'AI_EVENT',      label: 'Olay'    },
];

const RESONANCE_CFG: Record<string, { color: string; label: string }> = {
  cosmic:  { color: '#FBBF24', label: 'KOZMİK' },
  deep:    { color: '#A78BFA', label: 'DERİN'  },
  surface: { color: '#60A5FA', label: 'YÜZEY'  },
  dormant: { color: '#5A5A7A', label: 'UYUYAN' },
};

const PATTERN_CFG: Record<string, { color: string; icon: string; label: string }> = {
  symbol:   { color: '#FBBF24', icon: '◈', label: 'SEMBOL'   },
  figure:   { color: '#CC80FF', icon: '◉', label: 'FİGÜR'    },
  location: { color: '#60A5FA', icon: '⊕', label: 'MEKAN'    },
};

const SEVERITY_CFG: Record<string, { color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  critical: { color: '#FF5C5C', icon: 'alert-circle-outline'  },
  warning:  { color: '#F97316', icon: 'warning-outline'       },
  info:     { color: '#60A5FA', icon: 'information-circle-outline' },
};

function matchColor(score: number): string {
  if (score >= 80) return '#FBBF24';
  if (score >= 60) return '#A78BFA';
  if (score >= 40) return '#60A5FA';
  return '#5A5A7A';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Az önce';
  if (mins < 60) return `${mins}dk`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}s`;
  const days = Math.floor(hrs / 24);
  return `${days}g`;
}

// ── Feed cards ────────────────────────────────────────────────────────────────

function DreamMatchCard({ item }: { item: IntelligenceNotification }) {
  const score = item.score ?? 0;
  const color = matchColor(score);
  const rcfg  = RESONANCE_CFG[item.resonance_level ?? ''] ?? RESONANCE_CFG.surface!;

  return (
    <View style={[card.wrap, { borderColor: color + '30' }]}>
      <View style={card.row}>
        {/* Score circle */}
        <View style={[card.scoreCircle, { borderColor: color + '50', backgroundColor: color + '10' }]}>
          <Text style={[card.scoreValue, { color }]}>{Math.round(score)}</Text>
          <Text style={card.scoreSign}>%</Text>
        </View>

        <View style={card.body}>
          <View style={card.headerRow}>
            <View style={[card.typeBadge, { borderColor: color + '40', backgroundColor: color + '10' }]}>
              <Ionicons name="sparkles-outline" size={9} color={color} />
              <Text style={[card.typeText, { color }]}>RÜYA EŞLEŞMESİ</Text>
            </View>
            <Text style={card.time}>{timeAgo(item.occurred_at)}</Text>
          </View>

          <Text style={card.username}>@{item.other_username ?? '—'}</Text>
          {item.other_dream_title && (
            <Text style={card.dreamTitle} numberOfLines={2}>{item.other_dream_title}</Text>
          )}

          <View style={card.tagRow}>
            <View style={[card.tag, { borderColor: rcfg.color + '40', backgroundColor: rcfg.color + '10' }]}>
              <Text style={[card.tagText, { color: rcfg.color }]}>{rcfg.label}</Text>
            </View>
            {item.primary_symbol && (
              <View style={[card.tag, { borderColor: '#60A5FA40', backgroundColor: '#60A5FA10' }]}>
                <Text style={[card.tagText, { color: '#60A5FA' }]}>{item.primary_symbol}</Text>
              </View>
            )}
            {item.primary_shared && (
              <View style={[card.tag, { borderColor: '#F472B640', backgroundColor: '#F472B610' }]}>
                <Text style={[card.tagText, { color: '#F472B6' }]}>{item.primary_shared}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function SeenInDreamsCard({ item }: { item: IntelligenceNotification }) {
  const cfg = PATTERN_CFG[item.pattern_type ?? ''] ?? PATTERN_CFG.symbol!;

  return (
    <View style={[card.wrap, { borderColor: cfg.color + '30' }]}>
      <View style={card.row}>
        <View style={[card.iconCircle, { borderColor: cfg.color + '40', backgroundColor: cfg.color + '10' }]}>
          <Text style={[card.iconGlyph, { color: cfg.color }]}>{cfg.icon}</Text>
        </View>

        <View style={card.body}>
          <View style={card.headerRow}>
            <View style={[card.typeBadge, { borderColor: cfg.color + '40', backgroundColor: cfg.color + '10' }]}>
              <Text style={[card.typeText, { color: cfg.color }]}>{cfg.label} TESPİTİ</Text>
            </View>
            <Text style={card.time}>{timeAgo(item.occurred_at)}</Text>
          </View>

          <Text style={[card.patternValue, { color: cfg.color }]}>
            {item.pattern_value ?? '—'}
          </Text>

          <Text style={card.seenDesc}>
            {item.user_count ?? 0} rüyacının bilinçaltında görüldü
          </Text>

          {item.confidence_score !== undefined && (
            <View style={card.confRow}>
              <Text style={card.confLabel}>Güven</Text>
              <View style={card.confBar}>
                <View style={[card.confFill, { width: `${Math.round(item.confidence_score * 100)}%` as `${number}%`, backgroundColor: cfg.color }]} />
              </View>
              <Text style={[card.confPct, { color: cfg.color }]}>{Math.round(item.confidence_score * 100)}%</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function AiEventCard({ item }: { item: IntelligenceNotification }) {
  const cfg = SEVERITY_CFG[item.severity ?? ''] ?? SEVERITY_CFG.info!;

  return (
    <View style={[card.wrap, { borderColor: cfg.color + '30' }]}>
      <View style={card.row}>
        <View style={[card.iconCircle, { borderColor: cfg.color + '40', backgroundColor: cfg.color + '10' }]}>
          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        </View>

        <View style={card.body}>
          <View style={card.headerRow}>
            <View style={[card.typeBadge, { borderColor: cfg.color + '40', backgroundColor: cfg.color + '10' }]}>
              <Text style={[card.typeText, { color: cfg.color }]}>
                {(item.category ?? 'SİSTEM').toUpperCase()}
              </Text>
            </View>
            <Text style={card.time}>{timeAgo(item.occurred_at)}</Text>
          </View>

          {item.message && <Text style={card.eventMessage}>{item.message}</Text>}
          {item.detail && <Text style={card.eventDetail}>{item.detail}</Text>}
        </View>
      </View>
    </View>
  );
}

function NotifCard({ item }: { item: IntelligenceNotification }) {
  if (item.notification_type === 'DREAM_MATCH')    return <DreamMatchCard    item={item} />;
  if (item.notification_type === 'SEEN_IN_DREAMS') return <SeenInDreamsCard  item={item} />;
  if (item.notification_type === 'AI_EVENT')       return <AiEventCard       item={item} />;
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function IntelligenceFeedScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['intel-feed'],
    queryFn: () => getIntelligenceNotifications(40),
    staleTime: 2 * 60_000,
  });

  const filtered = data?.filter(
    n => filter === 'ALL' || n.notification_type === filter,
  ) ?? [];

  const renderItem = useCallback(({ item }: { item: IntelligenceNotification }) => (
    <NotifCard item={item} />
  ), []);

  const keyExtractor = useCallback((item: IntelligenceNotification) => item.id, []);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={s.headerTitle}>
          <Text style={s.titleLabel}>İNTELİGENCE AKIŞI</Text>
          <Text style={s.titleSub}>Eşleşmeler · Semboller · Olaylar</Text>
        </View>
        <Pressable onPress={() => void refetch()} hitSlop={12} style={s.refreshBtn}>
          <Ionicons name="refresh-outline" size={18} color={Colors.textMuted} />
        </Pressable>
      </View>

      {/* Filter tabs */}
      <View style={s.filters}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[s.filterBtn, active && s.filterBtnActive]}
            >
              <Text style={[s.filterText, active && s.filterTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
        {filtered.length > 0 && (
          <Text style={s.filterCount}>{filtered.length}</Text>
        )}
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={s.loadingText}>Bilinçaltı akışı yükleniyor...</Text>
        </View>
      ) : isError ? (
        <View style={s.center}>
          <Text style={{ fontSize: 32 }}>🌑</Text>
          <Text style={s.emptyTitle}>Bağlantı kurulamadı</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 36 }}>◌</Text>
          <Text style={s.emptyTitle}>Henüz etkinlik yok</Text>
          <Text style={s.emptyDesc}>Rüyalarını paylaştıkça burada bilinçaltı olayları görünmeye başlayacak.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={Colors.primary}
            />
          }
          ListFooterComponent={<View style={{ height: 40 }} />}
        />
      )}
    </SafeAreaView>
  );
}

// ── Shared card styles ────────────────────────────────────────────────────────

const card = StyleSheet.create({
  wrap:         { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, padding: 13, marginBottom: 10 },
  row:          { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  scoreCircle:  { width: 54, height: 54, borderRadius: 27, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  scoreValue:   { fontSize: 16, fontWeight: '800', lineHeight: 18 },
  scoreSign:    { fontSize: 8, color: Colors.textMuted, fontWeight: '600', lineHeight: 10 },
  iconCircle:   { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconGlyph:    { fontSize: 18, lineHeight: 22 },
  body:         { flex: 1, gap: 5 },
  headerRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  typeText:     { fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  time:         { fontSize: 10, color: Colors.textMuted, marginLeft: 'auto' },
  username:     { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  dreamTitle:   { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  tagRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  tag:          { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  tagText:      { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  patternValue: { fontSize: 15, fontWeight: '700', textTransform: 'capitalize' },
  seenDesc:     { fontSize: 11, color: Colors.textMuted },
  confRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  confLabel:    { fontSize: 9, color: Colors.textMuted, fontWeight: '600', width: 32 },
  confBar:      { flex: 1, height: 3, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  confFill:     { height: '100%', borderRadius: 2 },
  confPct:      { fontSize: 9, fontWeight: '700', width: 30, textAlign: 'right' },
  eventMessage: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600', lineHeight: 18 },
  eventDetail:  { fontSize: 11, color: Colors.textMuted, lineHeight: 16 },
});

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  header:  {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  refreshBtn:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { flex: 1, paddingHorizontal: 12 },
  titleLabel:   { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 1.5 },
  titleSub:     { fontSize: 11, color: Colors.textMuted, marginTop: 1 },

  filters: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  filterBtn:       { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  filterBtnActive: { borderColor: Colors.primary + '60', backgroundColor: Colors.primary + '14' },
  filterText:      { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  filterTextActive:{ color: Colors.primary },
  filterCount:     { marginLeft: 'auto', fontSize: 11, color: Colors.textMuted, fontWeight: '600' },

  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textMuted, fontSize: 14, marginTop: 8 },
  emptyTitle:  { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 8 },
  emptyDesc:   { color: Colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 32, lineHeight: 19 },

  list: { padding: 12 },
});
