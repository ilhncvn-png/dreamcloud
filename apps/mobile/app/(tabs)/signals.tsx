import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getSignalsToday, getSignalsWeek, getSignalsMonth } from '@/api/signals.api';
import { Colors } from '@/constants/colors';
import type { DreamSignals, SignalItem, TrendDirection, SignalPeriod } from '@/types/signal.types';
import {
  THEME_LABELS, EMOTION_LABELS, SYMBOL_CATEGORY_LABELS,
  LOCATION_LABELS, ARCHETYPE_LABELS, labelOf,
} from '@/utils/resonance-labels';

// ── Config ────────────────────────────────────────────────────────────────────

const PERIODS: { key: SignalPeriod; label: string; short: string }[] = [
  { key: '24h', label: 'Son 24 Saat', short: 'Bugün'  },
  { key: '7d',  label: 'Son 7 Gün',   short: 'Hafta'  },
  { key: '30d', label: 'Son 30 Gün',  short: 'Ay'     },
];

interface SectionDef {
  key: 'themes' | 'emotions' | 'symbols' | 'locations' | 'archetypes';
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  glow: string;
  labelMap: Record<string, string>;
  sentenceFn: (label: string, count: number) => string;
}

const SECTIONS: SectionDef[] = [
  {
    key: 'themes', emoji: '🌙', title: 'En Çok Rüyalanan Temalar',
    subtitle: 'Kolektif bilinçaltının baskın temaları',
    color: '#A78BFA', glow: 'rgba(167,139,250,0.10)',
    labelMap: THEME_LABELS,
    sentenceFn: (l, n) => `${n} kişi ${l} rüyası gördü`,
  },
  {
    key: 'emotions', emoji: '❤️', title: 'En Yaygın Duygular',
    subtitle: 'Rüyalarda taşınan ortak hisler',
    color: '#F472B6', glow: 'rgba(244,114,182,0.10)',
    labelMap: EMOTION_LABELS,
    sentenceFn: (l, n) => `${n} kişi ${l} hissiyle uyandı`,
  },
  {
    key: 'symbols', emoji: '💭', title: 'En Çok Paylaşılan Semboller',
    subtitle: 'Evrensel rüya sembolleri',
    color: '#60A5FA', glow: 'rgba(96,165,250,0.10)',
    labelMap: SYMBOL_CATEGORY_LABELS,
    sentenceFn: (l, n) => `${n} rüyada ${l.toLowerCase()} sembolü görüldü`,
  },
  {
    key: 'locations', emoji: '🏙', title: 'En Çok Rüyalanan Mekanlar',
    subtitle: 'Kolektif hayal coğrafyası',
    color: '#4CAF87', glow: 'rgba(76,175,135,0.10)',
    labelMap: LOCATION_LABELS,
    sentenceFn: (l, n) => `${n} kişi ${l.toLowerCase()} ortamında rüya gördü`,
  },
  {
    key: 'archetypes', emoji: '🧠', title: 'Kolektif Arketipler',
    subtitle: 'Jung\'un evrensel figürleri',
    color: '#FBBF24', glow: 'rgba(251,191,36,0.10)',
    labelMap: ARCHETYPE_LABELS,
    sentenceFn: (l, n) => `${n} rüyada ${l} arketipi belirdi`,
  },
];

// ── Trend indicator ───────────────────────────────────────────────────────────

const TREND_CFG: Record<TrendDirection, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; label: string }> = {
  new:     { icon: 'sparkles',           color: '#A78BFA', label: 'YENİ'   },
  rising:  { icon: 'trending-up-outline', color: '#4CAF87', label: ''       },
  falling: { icon: 'trending-down-outline', color: '#FF5C5C', label: ''    },
  stable:  { icon: 'remove-outline',     color: Colors.textMuted, label: '' },
};

function TrendPill({ trend, trendPct }: { trend: TrendDirection; trendPct: number }) {
  const cfg = TREND_CFG[trend];
  const text =
    trend === 'new'     ? 'YENİ' :
    trend === 'rising'  ? `+${trendPct}%` :
    trend === 'falling' ? `${trendPct}%` :
    '';
  if (!text && trend === 'stable') return null;
  return (
    <View style={[pill.wrap, { backgroundColor: `${cfg.color}18`, borderColor: `${cfg.color}40` }]}>
      <Ionicons name={cfg.icon} size={10} color={cfg.color} />
      {text ? <Text style={[pill.text, { color: cfg.color }]}>{text}</Text> : null}
    </View>
  );
}

// ── Signal row ────────────────────────────────────────────────────────────────

function SignalRow({
  item,
  rank,
  maxCount,
  section,
}: {
  item: SignalItem;
  rank: number;
  maxCount: number;
  section: SectionDef;
}) {
  const label    = labelOf(section.labelMap, item.name);
  const barWidth = maxCount > 0 ? (item.count / maxCount) : 0;
  const sentence = section.sentenceFn(label, item.count);

  return (
    <View style={row.container}>
      {/* Rank + dot */}
      <View style={row.rankCol}>
        <Text style={[row.rank, rank <= 3 && { color: section.color }]}>#{rank}</Text>
      </View>

      {/* Main content */}
      <View style={row.body}>
        <View style={row.topLine}>
          <Text style={row.sentence}>{sentence}</Text>
          <TrendPill trend={item.trend} trendPct={item.trendPct} />
        </View>

        {/* Progress bar */}
        <View style={row.track}>
          <View style={[
            row.fill,
            { width: `${barWidth * 100}%` as any, backgroundColor: section.color },
          ]} />
        </View>
      </View>

      {/* Count */}
      <Text style={[row.count, { color: section.color }]}>{item.count}</Text>
    </View>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function SignalSection({ section, items }: { section: SectionDef; items: SignalItem[] }) {
  if (items.length === 0) return null;
  const maxCount = items[0]?.count ?? 1;

  return (
    <View style={[sec.card, { borderColor: `${section.color}28` }]}>
      <View style={sec.header}>
        <Text style={sec.emoji}>{section.emoji}</Text>
        <View style={sec.headerText}>
          <Text style={[sec.title, { color: section.color }]}>{section.title}</Text>
          <Text style={sec.subtitle}>{section.subtitle}</Text>
        </View>
      </View>

      <View style={[sec.divider, { backgroundColor: `${section.color}20` }]} />

      {items.map((item, i) => (
        <SignalRow
          key={item.name}
          item={item}
          rank={i + 1}
          maxCount={maxCount}
          section={section}
        />
      ))}
    </View>
  );
}

// ── Hero card ─────────────────────────────────────────────────────────────────

function HeroCard({ data }: { data: DreamSignals }) {
  const hasSignals =
    data.themes.length + data.emotions.length + data.symbols.length > 0;

  return (
    <View style={hero.card}>
      <View style={hero.pulse}>
        <View style={hero.pulseOuter}>
          <View style={hero.pulseInner}>
            <Ionicons name="pulse-outline" size={28} color={Colors.primary} />
          </View>
        </View>
      </View>

      <View style={hero.textBlock}>
        <Text style={hero.dreamCount}>{data.dreamCount}</Text>
        <Text style={hero.dreamLabel}>kişi rüya gördü</Text>
        <Text style={hero.period}>{data.periodLabel}</Text>
      </View>

      {hasSignals ? (
        <View style={hero.topSignal}>
          <Text style={hero.topSignalLabel}>En güçlü sinyal</Text>
          <Text style={hero.topSignalValue}>
            {labelOf(THEME_LABELS, data.themes[0]?.name ?? '')}
          </Text>
        </View>
      ) : null}

      <Text style={hero.updated}>
        Güncellendi: {new Date(data.generatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptySignals({ period }: { period: SignalPeriod }) {
  const msg =
    period === '24h'
      ? 'Son 24 saatte henüz yeterli rüya verisi yok.\nBu zaman diliminde rüya paylaşılmamış.'
      : 'Bu dönemde sinyal bulunamadı.';
  return (
    <View style={empty.wrap}>
      <Ionicons name="moon-outline" size={48} color={Colors.textMuted} />
      <Text style={empty.title}>Sinyal Yok</Text>
      <Text style={empty.text}>{msg}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

const QUERY_FNS = {
  '24h': getSignalsToday,
  '7d':  getSignalsWeek,
  '30d': getSignalsMonth,
};

export default function SignalsScreen() {
  const [period, setPeriod] = useState<SignalPeriod>('30d');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['signals', period],
    queryFn:  QUERY_FNS[period],
    staleTime: 10 * 60 * 1000,
  });

  const hasAnyData = data && (
    data.themes.length > 0 ||
    data.emotions.length > 0 ||
    data.symbols.length > 0 ||
    data.locations.length > 0 ||
    data.archetypes.length > 0
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Rüya Sinyalleri</Text>
          <Text style={styles.subheading}>Kolektif bilinçaltının nabzı</Text>
        </View>
        <Pressable onPress={() => refetch()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Ionicons name="refresh-outline" size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodBtnText, period === p.key && styles.periodBtnTextActive]}>
              {p.short}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loaderText}>Kolektif bilinçaltı taranıyor…</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={Colors.primary}
            />
          }
        >
          {data && <HeroCard data={data} />}

          {hasAnyData ? (
            SECTIONS.map((section) => (
              <SignalSection
                key={section.key}
                section={section}
                items={(data as DreamSignals)[section.key]}
              />
            ))
          ) : (
            <EmptySignals period={period} />
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  heading:    { fontSize: 24, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.3 },
  subheading: { fontSize: 12, color: Colors.textMuted, fontWeight: '500', marginTop: 2 },

  periodRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodBtnActive: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  periodBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  periodBtnTextActive: { color: Colors.primary },

  loader:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },

  scroll: { padding: 16, gap: 0 },
});

// Hero card
const hero = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  pulse: { position: 'absolute', top: -20, right: -20 },
  pulseOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(108,99,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${Colors.primary}50`,
  },
  textBlock:     { gap: 2 },
  dreamCount:    { fontSize: 52, fontWeight: '900', color: Colors.textPrimary, lineHeight: 56 },
  dreamLabel:    { fontSize: 16, color: Colors.textSecondary, fontWeight: '600' },
  period:        { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  topSignal: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topSignalLabel: { fontSize: 12, color: Colors.textMuted },
  topSignalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'capitalize',
  },
  updated: {
    fontSize: 10,
    color: Colors.textMuted,
    position: 'absolute',
    bottom: 12,
    right: 16,
  },
});

// Section card
const sec = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 0,
  },
  header:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  emoji:      { fontSize: 22, lineHeight: 28 },
  headerText: { flex: 1, gap: 2 },
  title:      { fontSize: 15, fontWeight: '800' },
  subtitle:   { fontSize: 11, color: Colors.textMuted },
  divider:    { height: 1, marginBottom: 10 },
});

// Signal row
const row = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
  },
  rankCol: { width: 26, alignItems: 'center' },
  rank:    { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  body:    { flex: 1, gap: 5 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sentence: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500', flex: 1 },
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  fill:  { height: '100%', borderRadius: 2, opacity: 0.7 },
  count: { fontSize: 16, fontWeight: '800', minWidth: 28, textAlign: 'right' },
});

// Trend pill
const pill = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  text: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
});

// Empty
const empty = StyleSheet.create({
  wrap:  { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 10 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  text:  { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
