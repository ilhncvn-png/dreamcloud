import { useQuery } from '@tanstack/react-query';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyAIInsights, getSmartNotifications } from '@/api/intelligence.api';
import type { InsightCard, SmartNotification } from '@/types/intelligence.types';

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

const PRIORITY_COLORS = { high: '#FF3060', medium: '#FFB800', low: '#00CFFF' } as const;

const NOTIF_TYPE_LABELS: Record<string, string> = {
  RESONANCE_ALERT:  'Rezonans Uyarısı',
  SYMBOL_EVENT:     'Sembol Olayı',
  CONNECTION_EVENT: 'Bağlantı',
  COLLECTIVE_MOOD:  'Kolektif Mod',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function InsightTile({ card }: { card: InsightCard }) {
  return (
    <View style={[styles.insightCard, { borderColor: card.color + '33', backgroundColor: card.color + '0D' }]}>
      <View style={styles.insightHeader}>
        <View style={[styles.insightDot, { backgroundColor: card.color }]} />
        <Text style={[styles.insightType, { color: card.color }]}>{card.title}</Text>
      </View>
      <Text style={styles.insightBody}>{card.body}</Text>
    </View>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function TopBar({ label, count, maxCount, color }: { label: string; count: number; maxCount: number; color: string }) {
  const pct = maxCount > 0 ? Math.max(5, Math.round((count / maxCount) * 100)) : 5;
  return (
    <View style={styles.barBlock}>
      <View style={styles.barMeta}>
        <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
        <Text style={[styles.barCount, { color }]}>{count}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function NotifCard({ notif }: { notif: SmartNotification }) {
  const priorityColor = PRIORITY_COLORS[notif.priority] ?? '#5A5A7A';
  const typeLabel     = NOTIF_TYPE_LABELS[notif.type] ?? notif.type;
  const time          = new Date(notif.occurred_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={[styles.notifCard, { borderLeftColor: priorityColor }]}>
      <View style={styles.notifHeader}>
        <View style={styles.notifMeta}>
          <View style={[styles.notifBadge, { backgroundColor: priorityColor + '22' }]}>
            <Text style={[styles.notifBadgeText, { color: priorityColor }]}>{typeLabel}</Text>
          </View>
          <Text style={styles.notifTime}>{time}</Text>
        </View>
      </View>
      <Text style={styles.notifTitle}>{notif.title}</Text>
      <Text style={styles.notifBody}>{notif.body}</Text>
    </View>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AssistantScreen() {
  const {
    data: insights, isLoading: insightsLoading, isError: insightsError,
    refetch: refetchInsights, isRefetching,
  } = useQuery({
    queryKey: ['my-ai-insights'],
    queryFn: getMyAIInsights,
  });

  const { data: notifs = [] } = useQuery({
    queryKey: ['smart-notifications'],
    queryFn: getSmartNotifications,
  });

  if (insightsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>AI analizi hazırlanıyor...</Text>
      </View>
    );
  }

  if (insightsError || !insights) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>AI insights yüklenemedi.</Text>
      </View>
    );
  }

  const maxEmo  = Math.max(...insights.topEmotions.map(e => e.count), 1);
  const maxSym  = Math.max(...insights.topSymbols.map(s => s.count), 1);
  const maxArc  = Math.max(...insights.topArchetypes.map(a => a.count), 1);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchInsights} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dream Assistant</Text>
          <Text style={styles.headerSub}>Bilinçaltı analizi ve akıllı bildirimler</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <StatRow label="Toplam Rüya"    value={String(insights.dreamStats.totalDreams)}                             color="#00CFFF" />
          <StatRow label="Dream Score"   value={Number(insights.dreamStats.avgDreamScore).toFixed(1)}                 color="#A78BFA" />
          <StatRow label="Ort. Rezonans" value={Number(insights.dreamStats.avgResonance).toFixed(1)}                  color="#FBBF24" />
          <StatRow label="Bağlantılar"   value={String(insights.resonanceStats.total)}                                color="#00E87A" />
          <StatRow label="Ort. Uyum"     value={`${Number(insights.resonanceStats.avgScore).toFixed(1)}%`}            color="#60A5FA" />
          <StatRow label="Peak Uyum"     value={`${insights.resonanceStats.peakScore}%`}                              color="#FF8C00" />
        </View>

        {/* Smart notifications */}
        {notifs.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Akıllı Bildirimler</Text>
            {notifs.map(n => <NotifCard key={n.id} notif={n} />)}
          </View>
        )}

        {/* AI Insights */}
        {insights.insights.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>AI Bilinçaltı Yorumları</Text>
            <Text style={styles.cardSub}>Rüya verilerine dayalı örüntü analizi</Text>
            {insights.insights.map((card, i) => (
              <InsightTile key={`${card.type}-${i}`} card={card} />
            ))}
            <Text style={styles.generatedAt}>
              {new Date(insights.generatedAt).toLocaleString('tr-TR')} itibarıyla
            </Text>
          </View>
        )}

        {/* Top emotions */}
        {insights.topEmotions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Baskın Duygular</Text>
            {insights.topEmotions.map(e => (
              <TopBar key={e.emotion} label={e.emotion} count={e.count} maxCount={maxEmo} color="#F472B6" />
            ))}
          </View>
        )}

        {/* Top symbols */}
        {insights.topSymbols.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tekrarlayan Semboller</Text>
            {insights.topSymbols.map(s => (
              <TopBar key={s.manifestation} label={s.manifestation} count={s.count} maxCount={maxSym} color="#60A5FA" />
            ))}
          </View>
        )}

        {/* Top archetypes */}
        {insights.topArchetypes.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Aktif Arketipler</Text>
            {insights.topArchetypes.map(a => (
              <TopBar key={a.archetype} label={a.archetype} count={a.count} maxCount={maxArc} color="#FBBF24" />
            ))}
          </View>
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

  statsCard: { backgroundColor: COLORS.surface, borderRadius: 16, marginHorizontal: 16, padding: 16, gap: 0 },

  statRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statLabel: { color: COLORS.sub, fontSize: 12 },
  statValue: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },

  card:     { backgroundColor: COLORS.surface, borderRadius: 16, marginHorizontal: 16, marginTop: 12, padding: 16 },
  cardTitle:{ color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  cardSub:  { color: COLORS.muted, fontSize: 11, marginBottom: 12 },

  insightCard:   { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 10 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  insightDot:    { width: 7, height: 7, borderRadius: 3.5 },
  insightType:   { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  insightBody:   { color: COLORS.text, fontSize: 13, lineHeight: 19 },

  generatedAt: { color: COLORS.muted, fontSize: 10, textAlign: 'right', marginTop: 10 },

  notifCard:      { borderLeftWidth: 3, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, marginTop: 10 },
  notifHeader:    { marginBottom: 6 },
  notifMeta:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifBadge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  notifBadgeText: { fontSize: 10, fontWeight: '700' },
  notifTime:      { color: COLORS.muted, fontSize: 10 },
  notifTitle:     { color: COLORS.text, fontSize: 12, fontWeight: '700', marginBottom: 3 },
  notifBody:      { color: COLORS.sub, fontSize: 12, lineHeight: 17 },

  barBlock:  { marginTop: 10 },
  barMeta:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  barLabel:  { color: COLORS.text, fontSize: 12, textTransform: 'capitalize', flex: 1 },
  barCount:  { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  barTrack:  { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  barFill:   { height: 4, borderRadius: 2 },
});
