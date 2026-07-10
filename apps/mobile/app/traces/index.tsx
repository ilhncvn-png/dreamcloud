import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getWeatherNow } from '@/api/weather.api';
import type { TraceSignal } from '@/types/weather.types';
import { Colors } from '@/constants/colors';

// ── Constants ─────────────────────────────────────────────────────────────────

const SIGNAL_COLORS: Record<string, string> = {
  emerging: '#34D399',
  dominant: '#A78BFA',
  rare:     '#FBBF24',
  fading:   '#94A3B8',
  global:   '#60A5FA',
};

const SIGNAL_LABELS: Record<string, string> = {
  emerging: 'YÜKSELİYOR',
  dominant: 'BASKIN',
  rare:     'NADİR',
  fading:   'AZALIYOR',
  global:   'KOLEKTİF',
};

const ACTIVITY_LABELS: Record<string, string> = {
  low:      'Sessiz',
  moderate: 'Aktif',
  high:     'Canlı',
  intense:  'Yoğun',
};

// ── Main screen ───────────────────────────────────────────────────────────────

export default function TracesScreen() {
  const { data: weather, isLoading } = useQuery({
    queryKey:  ['weather', 'now'],
    queryFn:   getWeatherNow,
    staleTime: 5 * 60 * 1000,
    retry:     1,
  });

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back} hitSlop={12}>
          <Ionicons name="arrow-back-outline" size={18} color={Colors.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Kolektif Sinyaller</Text>
          {weather ? (
            <Text style={s.headerSub}>
              {weather.weatherTitle}
              {'  ·  '}
              {weather.totalDreamers} rüyacı
              {'  ·  '}
              {ACTIVITY_LABELS[weather.activityLevel] ?? weather.activityLevel}
            </Text>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={s.loadingText}>Sinyaller hesaplanıyor…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary strip */}
          {weather && (
            <View style={s.summaryCard}>
              <Text style={s.summaryText}>{weather.weatherSummary}</Text>
            </View>
          )}

          {/* Signal list */}
          {weather && weather.signals.length > 0 ? (
            weather.signals.map(sig => (
              <SignalCard
                key={sig.id}
                sig={sig}
                onPress={() =>
                  router.push({
                    pathname: '/traces/[type]/[name]',
                    params: { type: sig.traceType, name: sig.traceName },
                  })
                }
              />
            ))
          ) : (
            <Text style={s.empty}>Bu gece sinyal yok.</Text>
          )}

          <Text style={s.footer}>
            Son 24 saatteki rüyalardan hesaplandı. Her sabah güncellenir.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Signal Card ───────────────────────────────────────────────────────────────

function SignalCard({
  sig,
  onPress,
}: {
  sig:     TraceSignal;
  onPress: () => void;
}) {
  const color    = SIGNAL_COLORS[sig.type] ?? Colors.primary;
  const typeText = SIGNAL_LABELS[sig.type]  ?? sig.type.toUpperCase();
  const bars     = Math.max(1, Math.min(5, Math.round(sig.strength / 20)));

  return (
    <Pressable
      style={({ pressed }) => [s.card, { borderColor: `${color}20`, opacity: pressed ? 0.82 : 1 }]}
      onPress={onPress}
    >
      <View style={[s.cardAccent, { backgroundColor: color }]} />
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <View style={[s.badge, { backgroundColor: `${color}12`, borderColor: `${color}28` }]}>
            <Text style={[s.badgeText, { color }]}>{typeText}</Text>
          </View>
          <View style={s.bars}>
            {[1, 2, 3, 4, 5].map(n => (
              <View
                key={n}
                style={[
                  s.bar,
                  {
                    backgroundColor: n <= bars ? color : `${color}18`,
                    height: n <= bars ? 10 : 6,
                  },
                ]}
              />
            ))}
          </View>
        </View>
        <Text style={s.cardHeadline}>{sig.headline}</Text>
        <Text style={s.cardBody2}>{sig.body}</Text>
      </View>
      <Ionicons name="chevron-forward" size={13} color={`${color}45`} style={s.chevron} />
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(99,91,255,0.14)',
  },
  back:       { padding: 4 },
  headerTitle:{ fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  headerSub:  { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 13, color: Colors.textMuted },

  content: { padding: 16, gap: 8, paddingBottom: 48 },

  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(99,91,255,0.12)',
    padding: 14,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13, color: Colors.textSecondary,
    lineHeight: 20, fontWeight: '400',
  },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#07051A',
    borderRadius: 14, borderWidth: 1,
    overflow: 'hidden',
  },
  cardAccent: { width: 3, alignSelf: 'stretch' },
  cardBody: {
    flex: 1, paddingHorizontal: 13, paddingVertical: 13, gap: 5,
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 2.5 },
  bar:  { width: 3, borderRadius: 2 },
  cardHeadline: {
    fontSize: 13, fontWeight: '700',
    color: Colors.textPrimary, letterSpacing: -0.1,
  },
  cardBody2: {
    fontSize: 11.5, color: Colors.textSecondary, lineHeight: 17,
  },
  chevron: { marginRight: 12 },

  empty: {
    textAlign: 'center', color: Colors.textMuted,
    marginTop: 48, fontSize: 14,
  },
  footer: {
    textAlign: 'center', fontSize: 11, color: Colors.textMuted,
    marginTop: 16, lineHeight: 17,
  },
});
