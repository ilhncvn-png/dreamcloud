import { useQuery } from '@tanstack/react-query';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyDreamTimeline } from '@/api/intelligence.api';
import type { TimelineEmotion, TimelineResonance, TimelineFrequency } from '@/types/intelligence.types';

// ── Colors ────────────────────────────────────────────────────────────────────

const COLORS = {
  bg:      '#0F0F23',
  surface: '#1A1A35',
  primary: '#6C63FF',
  text:    '#FFFFFF',
  sub:     '#9B9BB4',
  muted:   '#5A5A7A',
  border:  'rgba(255,255,255,0.06)',
};

const EMOTION_COLORS: Record<string, string> = {
  joy: '#00E87A', sadness: '#60A5FA', fear: '#FF3060', anger: '#FF8C00',
  anxiety: '#FFB800', love: '#FF4D8F', confusion: '#A78BFA', peace: '#00CFFF',
  excitement: '#FFB800', grief: '#7B8FFF',
};
function emotionColor(e: string) { return EMOTION_COLORS[e.toLowerCase()] ?? '#5A5A7A'; }

function resonanceColor(lvl: string) {
  if (lvl === 'cosmic')  return '#FBBF24';
  if (lvl === 'deep')    return '#A78BFA';
  if (lvl === 'surface') return '#60A5FA';
  return '#5A5A7A';
}

function weekLabel(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleString('tr-TR', { month: 'short' })}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function EmotionRow({ row, max }: { row: TimelineEmotion; max: number }) {
  const pct = max > 0 ? (row.count / max) : 0;
  const color = emotionColor(row.emotion);
  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, { color }]} numberOfLines={1}>{row.emotion}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.max(4, Math.round(pct * 100))}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barCount}>{row.count}</Text>
    </View>
  );
}

function ResonanceDot({ r }: { r: TimelineResonance }) {
  const color = resonanceColor(r.resonance_level);
  const size  = Math.max(8, Math.min(20, Math.round(r.score_pct / 5)));
  return (
    <View style={[styles.resonanceDot, { width: size, height: size, borderRadius: size / 2, backgroundColor: color + 'CC' }]} />
  );
}

function FreqBar({ r, max }: { r: TimelineFrequency; max: number }) {
  const pct = max > 0 ? (r.count / max) : 0;
  const h   = Math.max(4, Math.round(pct * 80));
  return (
    <View style={styles.freqBarWrap}>
      <View style={[styles.freqBar, { height: h }]} />
      <Text style={styles.freqCount}>{r.count}</Text>
      <Text style={styles.freqLabel}>{weekLabel(r.week)}</Text>
    </View>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function TimelineScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['my-timeline'],
    queryFn: getMyDreamTimeline,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Timeline yükleniyor...</Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Timeline yüklenemedi.</Text>
      </View>
    );
  }

  // Top emotions by total count
  const emotionTotals: Record<string, number> = {};
  for (const r of data.emotionHistory) {
    emotionTotals[r.emotion] = (emotionTotals[r.emotion] ?? 0) + r.count;
  }
  const topEmotions = Object.entries(emotionTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([emotion, count]) => ({ emotion, count }));
  const maxEmo = Math.max(...topEmotions.map(e => e.count), 1);

  const maxFreq = Math.max(...data.dreamFrequency.map(r => r.count), 1);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dream Timeline</Text>
          <Text style={styles.headerSub}>Bilinçaltın zaman içindeki yolculuğu</Text>
        </View>

        {/* Totals */}
        {data.totals && (
          <View style={styles.statsRow}>
            {[
              { label: 'Toplam Rüya', val: data.totals.total_dreams.toString(),       color: '#00CFFF' },
              { label: 'Dream Score', val: Number(data.totals.avg_dream_score).toFixed(1), color: '#A78BFA' },
              { label: 'Rezonans',    val: Number(data.totals.avg_resonance).toFixed(1),   color: '#FBBF24' },
            ].map(({ label, val, color }) => (
              <View key={label} style={styles.statCard}>
                <Text style={[styles.statVal, { color }]}>{val}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Dominant emotions */}
        {topEmotions.length > 0 && (
          <SectionCard title="Baskın Duygular">
            {topEmotions.map(e => (
              <EmotionRow key={e.emotion} row={{ week: '', emotion: e.emotion, count: e.count }} max={maxEmo} />
            ))}
          </SectionCard>
        )}

        {/* Symbol evolution */}
        {data.symbolEvolution.length > 0 && (
          <SectionCard title="Sembol Evrimi">
            {[...new Set(data.symbolEvolution.map(r => r.week))].sort().slice(-6).map(week => {
              const weekSymbols = data.symbolEvolution.filter(r => r.week === week).sort((a, b) => b.count - a.count);
              return (
                <View key={week} style={styles.symbolWeekRow}>
                  <Text style={styles.symbolWeekLabel}>{weekLabel(week)}</Text>
                  <View style={styles.symbolChips}>
                    {weekSymbols.slice(0, 3).map((s, i) => (
                      <View key={s.manifestation} style={[styles.symbolChip, { opacity: 1 - i * 0.2 }]}>
                        <Text style={styles.symbolChipText}>{s.manifestation}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </SectionCard>
        )}

        {/* Resonance scatter */}
        {data.resonanceHistory.length > 0 && (
          <SectionCard title="Rezonans Geçmişi">
            <View style={styles.resonanceRow}>
              {data.resonanceHistory.slice(-30).map((r, i) => (
                <ResonanceDot key={i} r={r} />
              ))}
            </View>
            <View style={styles.legendRow}>
              {['cosmic', 'deep', 'surface', 'dormant'].map(lvl => (
                <View key={lvl} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: resonanceColor(lvl) }]} />
                  <Text style={styles.legendText}>{lvl}</Text>
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {/* Dream frequency */}
        {data.dreamFrequency.length > 0 && (
          <SectionCard title="Haftalık Rüya Frekansı">
            <View style={styles.freqRow}>
              {data.dreamFrequency.slice(-12).map((r, i) => (
                <FreqBar key={i} r={r} max={maxFreq} />
              ))}
            </View>
          </SectionCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: COLORS.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  center:        { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:   { color: COLORS.sub, fontSize: 14 },
  errorText:     { color: '#FF3060', fontSize: 14 },

  header:      { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerTitle: { color: COLORS.text, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  headerSub:   { color: COLORS.sub, fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, alignItems: 'center' },
  statVal:  { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel:{ color: COLORS.muted, fontSize: 10, marginTop: 4, textAlign: 'center' },

  card:       { backgroundColor: COLORS.surface, borderRadius: 16, marginHorizontal: 16, marginTop: 12, padding: 16 },
  cardTitle:  { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 12 },

  barRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  barLabel:  { width: 80, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  barTrack:  { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  barFill:   { height: 4, borderRadius: 2 },
  barCount:  { color: COLORS.muted, fontSize: 10, width: 24, textAlign: 'right', fontVariant: ['tabular-nums'] },

  symbolWeekRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  symbolWeekLabel:{ color: COLORS.muted, fontSize: 10, width: 44, fontVariant: ['tabular-nums'] },
  symbolChips:    { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  symbolChip:     { backgroundColor: 'rgba(167,139,250,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  symbolChipText: { color: '#A78BFA', fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },

  resonanceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  resonanceDot: {},

  legendRow:   { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:   { width: 7, height: 7, borderRadius: 3.5 },
  legendText:  { color: COLORS.muted, fontSize: 10 },

  freqRow:        { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 100 },
  freqBarWrap:    { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  freqBar:        { width: '100%', backgroundColor: 'rgba(0,207,255,0.5)', borderRadius: 3 },
  freqCount:      { color: COLORS.sub, fontSize: 9, fontVariant: ['tabular-nums'] },
  freqLabel:      { color: COLORS.muted, fontSize: 8, textAlign: 'center' },
});
