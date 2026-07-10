import { useLocalSearchParams, router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getTraceDetail } from '@/api/weather.api';
import { Colors } from '@/constants/colors';
import type { TraceSignal } from '@/types/weather.types';

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

const TYPE_LABELS: Record<string, string> = {
  theme:     'TEMA',
  emotion:   'DUYGU',
  symbol:    'SEMBOL',
  archetype: 'ARKETİP',
  location:  'MEKAN',
  figure:    'FİGÜR',
};

// ── Main screen ───────────────────────────────────────────────────────────────

export default function TraceDetailScreen() {
  const { type, name } = useLocalSearchParams<{ type: string; name: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey:  ['traceDetail', type, name],
    queryFn:   () => getTraceDetail(type!, name!),
    enabled:   !!type && !!name,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Bu sinyal bulunamadı.</Text>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  const {
    trace, signal, narrative, whyImportant,
    associatedEmotions, associatedThemes, associatedArchetypes,
    recentDreamExcerpts,
  } = data;

  const signalColor = signal ? (SIGNAL_COLORS[signal.type] ?? Colors.primary) : Colors.primary;
  const typeLabel   = TYPE_LABELS[trace.type] ?? trace.type.toUpperCase();

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Pressable style={s.backRow} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={18} color={Colors.textMuted} />
        <Text style={s.backLabel}>Rüya Havası</Text>
      </Pressable>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

      {/* Hero card */}
      <View style={[s.hero, { borderColor: `${signalColor}30` }]}>
        <View style={s.heroMeta}>
          <View style={[s.typeChip, { borderColor: `${signalColor}40`, backgroundColor: `${signalColor}12` }]}>
            <Text style={[s.typeChipText, { color: signalColor }]}>{typeLabel}</Text>
          </View>
          {signal && (
            <View style={[s.signalChip, { backgroundColor: signalColor }]}>
              <Text style={s.signalChipText}>{SIGNAL_LABELS[signal.type] ?? signal.type.toUpperCase()}</Text>
            </View>
          )}
        </View>

        <Text style={s.heroTitle}>{trace.label}</Text>

        <View style={s.statsRow}>
          <StatAtom label="Rüya"  value={trace.currentCount} />
          <StatAtom label="Bilinç" value={trace.activeUsers} />
          {trace.growthPercent !== 0 && (
            <StatAtom
              label="Değişim"
              value={`${trace.growthPercent > 0 ? '+' : ''}${trace.growthPercent}%`}
              color={trace.growthPercent > 0 ? '#34D399' : '#F87171'}
            />
          )}
        </View>
      </View>

      {/* Bu gece */}
      <Section title="BU GECE">
        <Text style={s.narrativeText}>{narrative}</Text>
      </Section>

      {/* Neden önemli */}
      <Section title="NEDEN ÖNEMLİ">
        <Text style={s.bodyText}>{whyImportant}</Text>
      </Section>

      {/* Signal detail */}
      {signal && (
        <Section title="SİNYAL">
          <Text style={s.bodyText}>{signal.body}</Text>
        </Section>
      )}

      {/* Associated emotions */}
      {associatedEmotions.length > 0 && (
        <Section title="İLİŞKİLİ DUYGULAR">
          <View style={s.chipRow}>
            {associatedEmotions.map(e => (
              <AssocChip key={e.name} label={e.label} count={e.count} color="#F472B6" />
            ))}
          </View>
        </Section>
      )}

      {/* Associated themes */}
      {associatedThemes.length > 0 && (
        <Section title="İLİŞKİLİ TEMALAR">
          <View style={s.chipRow}>
            {associatedThemes.map(t => (
              <AssocChip key={t.name} label={t.label} count={t.count} color="#A78BFA" />
            ))}
          </View>
        </Section>
      )}

      {/* Associated archetypes */}
      {associatedArchetypes.length > 0 && (
        <Section title="İLİŞKİLİ ARKETİPLER">
          <View style={s.chipRow}>
            {associatedArchetypes.map(a => (
              <AssocChip key={a.name} label={a.label} count={a.count} color="#FBBF24" />
            ))}
          </View>
        </Section>
      )}

      {/* Dream excerpts */}
      {recentDreamExcerpts.length > 0 && (
        <Section title="RÜYALARDAN">
          {recentDreamExcerpts.map((ex, i) => (
            <View key={i} style={[s.excerptCard, i > 0 && s.excerptGap]}>
              <Ionicons name="moon-outline" size={12} color={Colors.textMuted} style={s.excerptIcon} />
              <Text style={s.excerptText} numberOfLines={4}>"{ex.excerpt}…"</Text>
            </View>
          ))}
        </Section>
      )}

      {/* Phase 9 note: future geo breakdown (city/country) will live here */}

      <Text style={s.footer}>Bu sinyal, son 24 saatteki rüya aktivitesinden hesaplandı.</Text>
    </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatAtom({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <View style={s.statAtom}>
      <Text style={[s.statValue, color ? { color } : undefined]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function AssocChip({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={[s.assocChip, { borderColor: `${color}40`, backgroundColor: `${color}12` }]}>
      <Text style={[s.assocLabel, { color }]}>{label}</Text>
      <Text style={[s.assocCount, { color }]}>{count}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background, gap: 16,
  },
  errorText:   { color: Colors.textSecondary, fontSize: 14 },
  backBtn:     { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: Colors.surface },
  backBtnText: { color: Colors.textPrimary, fontSize: 14 },

  backRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
  backLabel:{ color: Colors.textMuted, fontSize: 13 },

  hero: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
    gap: 14,
  },
  heroMeta:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeChip:   { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  typeChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  signalChip:   { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  signalChipText: { fontSize: 10, fontWeight: '800', color: '#0F0F13', letterSpacing: 0.5 },
  heroTitle:  { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  statsRow:   { flexDirection: 'row', gap: 24 },
  statAtom:   { alignItems: 'center', gap: 3 },
  statValue:  { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  statLabel:  { fontSize: 11, color: Colors.textMuted, letterSpacing: 0.3 },

  section: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  sectionTitle:  { fontSize: 10, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.2 },
  narrativeText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22, fontWeight: '500' },
  bodyText:      { fontSize: 13, color: Colors.textSecondary, lineHeight: 21 },

  chipRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  assocChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5,
  },
  assocLabel: { fontSize: 12, fontWeight: '700' },
  assocCount: { fontSize: 11, fontWeight: '500', opacity: 0.7 },

  excerptCard: {
    backgroundColor: Colors.background, borderRadius: 10, padding: 12,
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
  },
  excerptGap:  { marginTop: 8 },
  excerptIcon: { marginTop: 2 },
  excerptText: {
    fontSize: 12, color: Colors.textSecondary, lineHeight: 19,
    fontStyle: 'italic', flex: 1,
  },

  footer: {
    textAlign: 'center', fontSize: 11, color: Colors.textMuted,
    marginTop: 20, lineHeight: 17,
  },
});
