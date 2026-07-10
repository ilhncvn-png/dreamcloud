import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { getCollectiveMood } from '@/api/intelligence.api';
import type { PlatformMood } from '@/types/intelligence.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const MOOD_CFG: Record<PlatformMood, {
  color: string; label: string; desc: string; icon: React.ComponentProps<typeof Ionicons>['name'];
}> = {
  UNIFIED:    { color: '#4CAF87', label: 'BİRLEŞİK',   desc: 'Platform yüksek kolektif uyum içinde.',   icon: 'infinite-outline'    },
  RESONANT:   { color: '#6C63FF', label: 'REZONANT',   desc: 'Güçlü bilinçaltı bağları aktif.',         icon: 'pulse-outline'       },
  FRAGMENTED: { color: '#F97316', label: 'PARÇALI',    desc: 'Farklı bilinçaltı akımları ayrışıyor.',   icon: 'git-branch-outline'  },
  DISPERSED:  { color: '#5A5A7A', label: 'DAĞINIK',    desc: 'Kolektif enerji düşük seviyede.',         icon: 'radio-outline'       },
};

const EMOTION_COLOR: Record<string, string> = {
  fear: '#F87171', joy: '#FBBF24', peace: '#22D3EE', wonder: '#A78BFA',
  sadness: '#60A5FA', hope: '#34D399', nostalgia: '#F472B6', warmth: '#F97316',
  loneliness: '#818CF8', clarity: '#67E8F9', anxiety: '#F87171', calm: '#6EE7B7',
  awe: '#7C3AED', grief: '#3B82F6', longing: '#93C5FD', love: '#FB7185',
  anger: '#EF4444', excitement: '#34D399', serenity: '#06B6D4',
};

const EMOTION_TR: Record<string, string> = {
  fear: 'Korku', joy: 'Sevinç', peace: 'Huzur', wonder: 'Hayranlık',
  sadness: 'Hüzün', hope: 'Umut', nostalgia: 'Nostalji', warmth: 'Sıcaklık',
  loneliness: 'Yalnızlık', clarity: 'Netlik', anxiety: 'Kaygı', calm: 'Dinginlik',
  awe: 'Huşu', grief: 'Yas', longing: 'Özlem', love: 'Aşk',
  anger: 'Öfke', excitement: 'Heyecan', serenity: 'Sükunet',
};

function emotionColor(e: string | null) { return EMOTION_COLOR[e ?? ''] ?? Colors.primary; }
function emotionLabel(e: string | null) { return EMOTION_TR[e ?? ''] ?? (e ?? '—'); }

// ── Sub-components ────────────────────────────────────────────────────────────

function MoodBanner({ mood }: { mood: PlatformMood }) {
  const cfg = MOOD_CFG[mood];
  return (
    <View style={[mb.wrap, { borderColor: cfg.color + '40', backgroundColor: cfg.color + '0E' }]}>
      <View style={[mb.iconWrap, { backgroundColor: cfg.color + '20', borderColor: cfg.color + '40' }]}>
        <Ionicons name={cfg.icon} size={28} color={cfg.color} />
      </View>
      <View style={mb.text}>
        <Text style={mb.sublabel}>Platform Modu</Text>
        <Text style={[mb.label, { color: cfg.color }]}>{cfg.label}</Text>
        <Text style={mb.desc}>{cfg.desc}</Text>
      </View>
    </View>
  );
}

const mb = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
  iconWrap:{ width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  text:    { flex: 1, gap: 3 },
  sublabel:{ fontSize: 9, color: Colors.textMuted, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  label:   { fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  desc:    { fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
});

function DominantEmotionCard({ emotion, count }: { emotion: string | null; count: number }) {
  const color = emotionColor(emotion);
  const label = emotionLabel(emotion);
  return (
    <View style={[dec.wrap, { borderColor: color + '40', backgroundColor: color + '08' }]}>
      <Text style={dec.superLabel}>Baskın Duygu</Text>
      <Text style={[dec.label, { color }]}>{label.toUpperCase()}</Text>
      <Text style={dec.count}>{count} rüyada</Text>
      <View style={[dec.pulse, { backgroundColor: color + '25', borderColor: color + '40' }]} />
    </View>
  );
}

const dec = StyleSheet.create({
  wrap:       { padding: 20, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 6, position: 'relative', overflow: 'hidden' },
  superLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' },
  label:      { fontSize: 28, fontWeight: '900', letterSpacing: 3 },
  count:      { fontSize: 12, color: Colors.textMuted },
  pulse:      { position: 'absolute', width: 200, height: 200, borderRadius: 100, bottom: -100, borderWidth: 1, opacity: 0.3 },
});

function StatBox({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <View style={[sb.wrap, { borderColor: color + '30' }]}>
      <Text style={[sb.value, { color }]}>{value}</Text>
      <Text style={sb.label}>{label}</Text>
    </View>
  );
}

const sb = StyleSheet.create({
  wrap:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, backgroundColor: Colors.surface, gap: 4 },
  value: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 10, color: Colors.textMuted, fontWeight: '500', textAlign: 'center', lineHeight: 13 },
});

function EmergingSymbolBar({
  symbol, count, growth, maxCount,
}: {
  symbol: string; count: number; growth: number; maxCount: number;
}) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 5;
  const grow = growth > 0;
  return (
    <View style={esb.row}>
      <View style={esb.left}>
        <Text style={esb.symbol}>{symbol}</Text>
        <Text style={esb.count}>{count} rüya</Text>
      </View>
      <View style={esb.barWrap}>
        <View style={[esb.bar, { width: `${pct}%` as `${number}%`, backgroundColor: grow ? '#4CAF87' : '#5A5A7A' }]} />
      </View>
      <View style={[esb.badge, { borderColor: grow ? '#4CAF8750' : '#5A5A7A50', backgroundColor: grow ? '#4CAF8710' : '#5A5A7A10' }]}>
        <Text style={[esb.badgeText, { color: grow ? '#4CAF87' : '#5A5A7A' }]}>
          {grow ? `+${growth}` : String(growth)}
        </Text>
      </View>
    </View>
  );
}

const esb = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  left:    { width: 80 },
  symbol:  { fontSize: 12, fontWeight: '600', color: Colors.textPrimary, textTransform: 'capitalize' },
  count:   { fontSize: 9, color: Colors.textMuted },
  barWrap: { flex: 1, height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  bar:     { height: '100%', borderRadius: 2 },
  badge:   { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1, minWidth: 40, alignItems: 'center' },
  badgeText: { fontSize: 10, fontWeight: '800' },
});

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CollectiveMoodScreen() {
  const router = useRouter();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['collective-mood'],
    queryFn: getCollectiveMood,
    staleTime: 3 * 60_000,
  });

  const maxCount = data
    ? Math.max(...data.emergingSymbols.map(s => s.count), 1)
    : 1;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={s.headerTitle}>
          <Text style={s.titleLabel}>KOLEKTİF MOD</Text>
          <Text style={s.titleSub}>Platform bilinçaltı nabzı</Text>
        </View>
        <Pressable onPress={() => void refetch()} hitSlop={12} style={s.refreshBtn}>
          <Ionicons name="refresh-outline" size={18} color={Colors.textMuted} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={s.loadingText}>Kolektif bilinç taranıyor...</Text>
        </View>
      ) : isError || !data ? (
        <View style={s.center}>
          <Text style={{ fontSize: 36 }}>🌑</Text>
          <Text style={s.emptyTitle}>Veri alınamadı</Text>
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}
        >
          {/* Platform mood banner */}
          <MoodBanner mood={data.platformMood} />

          {/* Dominant emotion */}
          <DominantEmotionCard emotion={data.dominantEmotion} count={data.dominantEmotionCount} />

          {/* Stats row */}
          <View style={s.statsRow}>
            <StatBox value={data.totalDreamsLast7Days}     label={'Son 7 gün\nrüya'}       color={Colors.primary}  />
            <StatBox value={data.activeUsersLast7Days}     label={'Aktif\nrüyacı'}          color="#4CAF87"         />
            <StatBox value={data.resonanceEventsLast7Days} label={'Rezonans\nolayı'}        color="#A78BFA"         />
            <StatBox value={`${Math.round(data.avgResonanceScore)}%`} label={'Ort.\nrezonans'} color="#FBBF24"     />
          </View>

          {/* Top emotions */}
          {data.topEmotions.length > 0 && (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardIcon}>❤️</Text>
                <Text style={s.cardTitle}>En Yaygın Duygular</Text>
              </View>
              {data.topEmotions.map((e, i) => (
                <View key={e.emotion} style={s.emotionRow}>
                  <Text style={s.emotionRank}>#{i + 1}</Text>
                  <View style={[s.emotionDot, { backgroundColor: emotionColor(e.emotion) }]} />
                  <Text style={s.emotionLabel}>{emotionLabel(e.emotion)}</Text>
                  <Text style={[s.emotionCount, { color: emotionColor(e.emotion) }]}>{e.count}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Emerging symbols */}
          {data.emergingSymbols.length > 0 && (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardIcon}>✦</Text>
                <Text style={s.cardTitle}>Yükselen Semboller</Text>
                <Text style={s.cardSub}>Son 7 gün</Text>
              </View>
              {data.emergingSymbols.map(sym => (
                <EmergingSymbolBar key={sym.symbol} {...sym} maxCount={maxCount} />
              ))}
            </View>
          )}

          {data.fetchedAt && (
            <Text style={s.fetchedAt}>
              Son güncelleme: {new Date(data.fetchedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  header:  {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  refreshBtn:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, paddingHorizontal: 12 },
  titleLabel:  { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 1.5 },
  titleSub:    { fontSize: 11, color: Colors.textMuted, marginTop: 1 },

  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textMuted, fontSize: 14, marginTop: 8 },
  emptyTitle:  { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 8 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },

  statsRow: { flexDirection: 'row', gap: 8 },

  card: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  cardIcon:   { fontSize: 14 },
  cardTitle:  { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.5, textTransform: 'uppercase', flex: 1 },
  cardSub:    { fontSize: 10, color: Colors.textMuted },

  emotionRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  emotionRank:  { fontSize: 10, color: Colors.textMuted, fontWeight: '600', width: 20 },
  emotionDot:   { width: 7, height: 7, borderRadius: 4 },
  emotionLabel: { flex: 1, fontSize: 13, color: Colors.textPrimary, fontWeight: '500', textTransform: 'capitalize' },
  emotionCount: { fontSize: 12, fontWeight: '700' },

  fetchedAt: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },
});
