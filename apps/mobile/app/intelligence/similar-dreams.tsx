import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { getIntelligenceSimilarDreams } from '@/api/intelligence.api';
import type { SimilarDream } from '@/types/intelligence.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const RESONANCE_CFG: Record<string, { color: string; label: string; glyph: string }> = {
  cosmic:  { color: '#FBBF24', label: 'KOZMİK', glyph: '✦' },
  deep:    { color: '#A78BFA', label: 'DERİN',  glyph: '◉' },
  surface: { color: '#60A5FA', label: 'YÜZEY',  glyph: '◎' },
  dormant: { color: '#5A5A7A', label: 'UYUYAN', glyph: '◌' },
};

const EMOTION_COLOR: Record<string, string> = {
  fear: '#F87171', joy: '#FBBF24', peace: '#22D3EE', wonder: '#A78BFA',
  sadness: '#60A5FA', hope: '#34D399', nostalgia: '#F472B6', warmth: '#F97316',
  loneliness: '#818CF8', clarity: '#67E8F9', anxiety: '#F87171', calm: '#6EE7B7',
};

const EMOTION_TR: Record<string, string> = {
  fear: 'Korku', joy: 'Sevinç', peace: 'Huzur', wonder: 'Hayranlık',
  sadness: 'Hüzün', hope: 'Umut', nostalgia: 'Nostalji', warmth: 'Sıcaklık',
  loneliness: 'Yalnızlık', clarity: 'Netlik', anxiety: 'Kaygı', calm: 'Dinginlik',
};

function matchColor(pct: number): string {
  if (pct >= 80) return '#FBBF24';
  if (pct >= 60) return '#A78BFA';
  if (pct >= 40) return '#60A5FA';
  return '#5A5A7A';
}

function MatchRing({ pct }: { pct: number }) {
  const color = matchColor(pct);
  return (
    <View style={[ring.outer, { borderColor: color + '50', backgroundColor: color + '10' }]}>
      <View style={[ring.inner, { borderColor: color + '30', backgroundColor: color + '08' }]}>
        <Text style={[ring.pct, { color }]}>{Math.round(pct)}</Text>
        <Text style={ring.sign}>%</Text>
      </View>
    </View>
  );
}

const ring = StyleSheet.create({
  outer: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  inner: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pct:   { fontSize: 20, fontWeight: '800', lineHeight: 22 },
  sign:  { fontSize: 8, color: Colors.textMuted, fontWeight: '600', marginTop: -2 },
});

// ── Match card ────────────────────────────────────────────────────────────────

function MatchCard({ item }: { item: SimilarDream }) {
  const cfg   = RESONANCE_CFG[item.resonance_level] ?? RESONANCE_CFG.surface!;
  const color = matchColor(Number(item.match_pct));

  const emotions = (item.shared_emotions ?? []).slice(0, 3);
  const symbols  = (item.shared_symbols  ?? []).slice(0, 3);
  const themes   = (item.shared_themes   ?? []).slice(0, 2);

  return (
    <View style={[mc.card, { borderColor: color + '30' }]}>
      <View style={mc.top}>
        <MatchRing pct={Number(item.match_pct)} />
        <View style={mc.info}>
          <View style={mc.levelRow}>
            <Text style={[mc.glyph, { color: cfg.color }]}>{cfg.glyph}</Text>
            <Text style={[mc.level, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Text style={mc.username}>@{item.matched_username}</Text>
          {item.matched_dream_title ? (
            <Text style={mc.title} numberOfLines={2}>{item.matched_dream_title}</Text>
          ) : null}
        </View>
      </View>

      {/* Shared element counts */}
      <View style={mc.countsRow}>
        {item.shared_symbol_count  > 0 && <CountBadge value={item.shared_symbol_count}  label="sembol" color="#60A5FA" />}
        {item.shared_emotion_count > 0 && <CountBadge value={item.shared_emotion_count} label="duygu"  color="#F472B6" />}
        {item.shared_theme_count   > 0 && <CountBadge value={item.shared_theme_count}   label="tema"   color="#A78BFA" />}
      </View>

      {/* Shared emotion chips */}
      {emotions.length > 0 && (
        <View style={mc.chipWrap}>
          <Text style={mc.chipLabel}>Ortak duygular</Text>
          <View style={mc.chips}>
            {emotions.map(e => (
              <View key={e} style={[mc.chip, { borderColor: (EMOTION_COLOR[e] ?? Colors.primary) + '40', backgroundColor: (EMOTION_COLOR[e] ?? Colors.primary) + '12' }]}>
                <Text style={[mc.chipText, { color: EMOTION_COLOR[e] ?? Colors.primary }]}>
                  {EMOTION_TR[e] ?? e}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Shared symbol chips */}
      {symbols.length > 0 && (
        <View style={mc.chipWrap}>
          <Text style={mc.chipLabel}>Ortak semboller</Text>
          <View style={mc.chips}>
            {symbols.map(sym => (
              <View key={sym} style={[mc.chip, { borderColor: '#60A5FA40', backgroundColor: '#60A5FA10' }]}>
                <Text style={[mc.chipText, { color: '#60A5FA' }]}>{sym}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Shared themes */}
      {themes.length > 0 && (
        <View style={mc.chipWrap}>
          <Text style={mc.chipLabel}>Ortak temalar</Text>
          <View style={mc.chips}>
            {themes.map(t => (
              <View key={t} style={[mc.chip, { borderColor: '#A78BFA40', backgroundColor: '#A78BFA10' }]}>
                <Text style={[mc.chipText, { color: '#A78BFA' }]}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function CountBadge({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={[cnt.wrap, { borderColor: color + '30', backgroundColor: color + '10' }]}>
      <Text style={[cnt.value, { color }]}>{value}</Text>
      <Text style={cnt.label}>{label}</Text>
    </View>
  );
}

const cnt = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'baseline', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  value: { fontSize: 14, fontWeight: '800' },
  label: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
});

const mc = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, padding: 16, gap: 12,
  },
  top:       { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  info:      { flex: 1, gap: 4 },
  levelRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  glyph:     { fontSize: 11 },
  level:     { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  username:  { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  title:     { fontSize: 14, color: Colors.textPrimary, fontWeight: '600', lineHeight: 19 },
  countsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chipWrap:  { gap: 6 },
  chipLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  chips:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  chipText:  { fontSize: 11, fontWeight: '600' },
});

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SimilarDreamsScreen() {
  const { dreamId } = useLocalSearchParams<{ dreamId: string }>();
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['intel-similar', dreamId],
    queryFn: () => getIntelligenceSimilarDreams(dreamId ?? '', 8),
    enabled: !!dreamId,
    staleTime: 5 * 60_000,
  });

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={s.headerTitle}>
          <Text style={s.titleLabel}>BENZER RÜYALAR</Text>
          <Text style={s.titleSub}>Rezonans eşleşmeleri</Text>
        </View>
        <View style={s.headerRight}>
          {data && (
            <Text style={s.countBadge}>{data.length}</Text>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={s.loadingText}>Benzer rüyalar aranıyor...</Text>
        </View>
      ) : isError ? (
        <View style={s.center}>
          <Text style={{ fontSize: 36 }}>🌊</Text>
          <Text style={s.emptyTitle}>Bağlantı kurulamadı</Text>
        </View>
      ) : !data || data.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 40 }}>◌</Text>
          <Text style={s.emptyTitle}>Henüz eşleşme yok</Text>
          <Text style={s.emptyDesc}>Bu rüyayı analiz ettikten sonra benzer rüyalar burada görünür.</Text>
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.resultLine}>
            <Text style={{ color: Colors.primary, fontWeight: '800' }}>{data.length}</Text> benzer rüya bulundu
          </Text>

          {data.map(item => (
            <MatchCard key={item.id} item={item} />
          ))}

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
  headerTitle: { flex: 1, paddingHorizontal: 12 },
  titleLabel:  { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 1.5 },
  titleSub:    { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  headerRight: { width: 36, alignItems: 'flex-end' },
  countBadge:  { fontSize: 13, fontWeight: '800', color: Colors.primary },

  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textMuted, fontSize: 14, marginTop: 8 },
  emptyTitle:  { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 8 },
  emptyDesc:   { color: Colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 32, lineHeight: 19 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  resultLine:    { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
});
