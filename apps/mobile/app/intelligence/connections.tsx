import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { getMyResonance, getMyIntelligenceConnections } from '@/api/intelligence.api';
import type { IntelConnection, ResonanceLevelIntel } from '@/types/intelligence.types';

// ── Config ────────────────────────────────────────────────────────────────────

const LEVEL_CFG: Record<ResonanceLevelIntel, {
  color: string; label: string; desc: string; icon: React.ComponentProps<typeof Ionicons>['name'];
}> = {
  cosmic:  { color: '#FBBF24', label: 'KOZMİK',  desc: 'Evrensel bilinçaltı uyumu',   icon: 'sparkles-outline'  },
  deep:    { color: '#A78BFA', label: 'DERİN',   desc: 'Derin arketip rezonansı',      icon: 'infinite-outline'  },
  surface: { color: '#60A5FA', label: 'YÜZEY',   desc: 'Ortak sembol ve temalar',      icon: 'pulse-outline'     },
  dormant: { color: '#5A5A7A', label: 'UYUYAN',  desc: 'Henüz yeterli bağ oluşmadı',  icon: 'radio-outline'     },
};

function matchColor(pct: number): string {
  if (pct >= 80) return '#FBBF24';
  if (pct >= 60) return '#A78BFA';
  if (pct >= 40) return '#60A5FA';
  return '#5A5A7A';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}s önce`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}g önce`;
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

// ── My Resonance Profile ──────────────────────────────────────────────────────

function ResonanceProfile() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-resonance'],
    queryFn: getMyResonance,
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <View style={[rp.card, rp.loading]}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  const cfg = LEVEL_CFG[data?.resonanceLevel ?? 'dormant'];

  return (
    <View style={[rp.card, { borderColor: cfg.color + '40' }]}>
      <View style={rp.topRow}>
        <View style={[rp.iconWrap, { backgroundColor: cfg.color + '18', borderColor: cfg.color + '40' }]}>
          <Ionicons name={cfg.icon} size={26} color={cfg.color} />
        </View>
        <View style={rp.textBlock}>
          <Text style={rp.subLabel}>Rezonans Seviyem</Text>
          <Text style={[rp.level, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={rp.desc}>{cfg.desc}</Text>
        </View>
        <View style={rp.scoreBox}>
          <Text style={[rp.scoreValue, { color: cfg.color }]}>
            {data ? Math.round(data.collectiveAlignment) : '—'}
          </Text>
          <Text style={rp.scoreLabel}>% uyum</Text>
        </View>
      </View>

      {/* Progress bars */}
      <View style={rp.bars}>
        <ProgressBar
          label="Kolektif Uyum"
          value={data?.collectiveAlignment ?? 0}
          color={cfg.color}
        />
        <ProgressBar
          label="Bilinçaltı Özgünlüğü"
          value={data?.dreamUniquenessScore ?? 0}
          color="#4CAF87"
        />
      </View>

      {/* Stats row */}
      <View style={rp.statsRow}>
        <Stat label="Bağlantı" value={data?.connectionCount ?? 0} color={cfg.color} />
        <View style={rp.divider} />
        <Stat
          label="Ort. Eşleşme"
          value={`${Math.round((data?.avgMatchScore ?? 0) * 100)}%`}
          color={cfg.color}
        />
        {data?.source === 'realtime' && (
          <>
            <View style={rp.divider} />
            <View style={rp.realtime}>
              <Text style={rp.realtimeText}>Anlık</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function ProgressBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <View style={pb.wrap}>
      <View style={pb.labelRow}>
        <Text style={pb.label}>{label}</Text>
        <Text style={[pb.pct, { color }]}>{Math.round(pct)}%</Text>
      </View>
      <View style={pb.track}>
        <View style={[pb.fill, { width: `${pct}%` as `${number}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <View style={st.wrap}>
      <Text style={[st.value, { color }]}>{value}</Text>
      <Text style={st.label}>{label}</Text>
    </View>
  );
}

// ── Connection Card ───────────────────────────────────────────────────────────

function ConnectionCard({ item }: { item: IntelConnection }) {
  const color   = matchColor(Number(item.match_pct));
  const cfg     = LEVEL_CFG[item.resonance_level as ResonanceLevelIntel] ?? LEVEL_CFG.surface;
  const symbols  = (item.shared_symbols  ?? []).slice(0, 3);
  const emotions = (item.shared_emotions ?? []).slice(0, 3);

  return (
    <View style={[cc.card, { borderColor: color + '28' }]}>
      <View style={cc.topRow}>
        {/* Score ring */}
        <View style={[cc.ring, { borderColor: color + '50', backgroundColor: color + '10' }]}>
          <Text style={[cc.ringValue, { color }]}>{Math.round(Number(item.match_pct))}<Text style={cc.ringSign}>%</Text></Text>
        </View>

        <View style={cc.mainInfo}>
          <View style={cc.levelRow}>
            <Text style={[cc.levelText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Text style={cc.username}>@{item.matched_username}</Text>
          {item.matched_dream_title && (
            <Text style={cc.dreamTitle} numberOfLines={1}>{item.matched_dream_title}</Text>
          )}
          {item.my_dream_title && (
            <Text style={cc.myDream} numberOfLines={1}>Senin: {item.my_dream_title}</Text>
          )}
        </View>

        <Text style={cc.time}>{timeAgo(item.created_at)}</Text>
      </View>

      {(symbols.length > 0 || emotions.length > 0) && (
        <View style={cc.chips}>
          {symbols.map(s => (
            <View key={`sym-${s}`} style={[cc.chip, { borderColor: '#60A5FA30', backgroundColor: '#60A5FA0C' }]}>
              <Text style={[cc.chipText, { color: '#60A5FA' }]}>{s}</Text>
            </View>
          ))}
          {emotions.map(e => (
            <View key={`emo-${e}`} style={[cc.chip, { borderColor: '#F472B630', backgroundColor: '#F472B60C' }]}>
              <Text style={[cc.chipText, { color: '#F472B6' }]}>{e}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ConnectionsScreen() {
  const router = useRouter();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['intel-connections'],
    queryFn: () => getMyIntelligenceConnections(30),
    staleTime: 2 * 60_000,
  });

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={s.headerTitle}>
          <Text style={s.titleLabel}>BAĞLANTILARIM</Text>
          <Text style={s.titleSub}>Rezonans ve kolektif uyum</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}
      >
        {/* My resonance profile */}
        <ResonanceProfile />

        {/* Connections list */}
        <View style={s.listHeader}>
          <Text style={s.listTitle}>Son Bağlantılar</Text>
          {data && <Text style={s.listCount}>{data.length} eşleşme</Text>}
        </View>

        {isLoading ? (
          <View style={s.center}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : isError ? (
          <View style={s.center}>
            <Text style={s.errorText}>Bağlantılar yüklenemedi</Text>
          </View>
        ) : !data || data.length === 0 ? (
          <View style={[s.center, { paddingVertical: 32 }]}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>◌</Text>
            <Text style={s.emptyTitle}>Henüz bağlantı yok</Text>
            <Text style={s.emptyDesc}>Rüyalarını paylaştıkça bilinçaltı bağlantıları oluşmaya başlayacak.</Text>
          </View>
        ) : (
          data.map(item => <ConnectionCard key={item.id} item={item} />)
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const rp = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, padding: 16, gap: 14,
  },
  loading:   { height: 120, alignItems: 'center', justifyContent: 'center' },
  topRow:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrap:  { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  textBlock: { flex: 1, gap: 2 },
  subLabel:  { fontSize: 9, color: Colors.textMuted, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  level:     { fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  desc:      { fontSize: 11, color: Colors.textMuted },
  scoreBox:  { alignItems: 'flex-end' },
  scoreValue:{ fontSize: 22, fontWeight: '900', lineHeight: 26 },
  scoreLabel:{ fontSize: 9, color: Colors.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  bars:      { gap: 10 },
  statsRow:  { flexDirection: 'row', alignItems: 'center' },
  divider:   { width: 1, height: 24, backgroundColor: Colors.border, marginHorizontal: 16 },
  realtime:  { flexDirection: 'row', alignItems: 'center' },
  realtimeText: { fontSize: 9, color: Colors.textMuted, fontWeight: '600', fontStyle: 'italic' },
});

const pb = StyleSheet.create({
  wrap:     { gap: 5 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:    { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  pct:      { fontSize: 11, fontWeight: '700' },
  track:    { height: 5, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  fill:     { height: '100%', borderRadius: 3 },
});

const st = StyleSheet.create({
  wrap:  { alignItems: 'center', flex: 1 },
  value: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 10, color: Colors.textMuted, fontWeight: '500', marginTop: 2 },
});

const cc = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, padding: 14, gap: 10,
  },
  topRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ring:      { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ringValue: { fontSize: 16, fontWeight: '800', lineHeight: 18 },
  ringSign:  { fontSize: 8, fontWeight: '600' },
  mainInfo:  { flex: 1, gap: 3 },
  levelRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  levelText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  username:  { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  dreamTitle:{ fontSize: 12, color: Colors.textPrimary, fontWeight: '600' },
  myDream:   { fontSize: 11, color: Colors.textMuted },
  time:      { fontSize: 10, color: Colors.textMuted, flexShrink: 0 },
  chips:     { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip:      { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  chipText:  { fontSize: 10, fontWeight: '600' },
});

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  header:  {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, paddingHorizontal: 12 },
  titleLabel:  { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 1.5 },
  titleSub:    { fontSize: 11, color: Colors.textMuted, marginTop: 1 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  listTitle:  { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.5 },
  listCount:  { fontSize: 12, color: Colors.textMuted },

  center:    { alignItems: 'center', paddingVertical: 24, gap: 8 },
  errorText: { fontSize: 13, color: Colors.error },
  emptyTitle:{ fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18, paddingHorizontal: 20 },
});
