import { useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { getMyIdentity, recomputeIdentity } from '@/api/identity.api';
import {
  THEME_LABELS, EMOTION_LABELS, SYMBOL_CATEGORY_LABELS,
  LOCATION_LABELS, ARCHETYPE_LABELS, labelOf,
} from '@/utils/resonance-labels';
import type { DreamIdentity } from '@/types/identity.types';

// ── Score definitions ─────────────────────────────────────────────────────────

interface ScoreDef {
  key: keyof DreamIdentity;
  label: string;
  sublabel: string;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

const SCORES: ScoreDef[] = [
  {
    key: 'resonanceScore',
    label: 'Rezonans',
    sublabel: 'Kolektif bilinçaltıyla bağlantı',
    color: Colors.primary,
    icon: 'pulse-outline',
  },
  {
    key: 'lucidScore',
    label: 'Lucid',
    sublabel: 'Bilinçli rüya kontrolü',
    color: '#8B5CF6',
    icon: 'eye-outline',
  },
  {
    key: 'transformationScore',
    label: 'Dönüşüm',
    sublabel: 'Değişim ve yeniden doğuş enerjisi',
    color: '#F472B6',
    icon: 'refresh-outline',
  },
  {
    key: 'wonderScore',
    label: 'Hayranlık',
    sublabel: 'Merak ve coşku yoğunluğu',
    color: '#FBBF24',
    icon: 'sparkles-outline',
  },
  {
    key: 'connectionScore',
    label: 'Bağlantı',
    sublabel: 'Diğer rüyacılarla köprüler',
    color: '#4CAF87',
    icon: 'git-compare-outline',
  },
];

// ── Pattern label maps ────────────────────────────────────────────────────────

const PATTERN_SECTIONS = [
  { key: 'dominantThemes' as const,    label: '🌙 Temalar',    map: THEME_LABELS,           color: '#A78BFA' },
  { key: 'dominantEmotions' as const,  label: '❤️ Duygular',   map: EMOTION_LABELS,         color: '#F472B6' },
  { key: 'dominantSymbols' as const,   label: '💭 Semboller',  map: SYMBOL_CATEGORY_LABELS, color: '#60A5FA' },
  { key: 'dominantLocations' as const, label: '🏙 Mekanlar',   map: LOCATION_LABELS,        color: '#4CAF87' },
  { key: 'dominantArchetypes' as const,label: '🧠 Figürler',   map: ARCHETYPE_LABELS,       color: '#FBBF24' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreBar({ def, value }: { def: ScoreDef; value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <View style={scoreBar.row}>
      <View style={scoreBar.labelCol}>
        <View style={[scoreBar.iconBox, { backgroundColor: `${def.color}18` }]}>
          <Ionicons name={def.icon} size={14} color={def.color} />
        </View>
        <View>
          <Text style={scoreBar.name}>{def.label}</Text>
          <Text style={scoreBar.sub}>{def.sublabel}</Text>
        </View>
      </View>

      <View style={scoreBar.right}>
        <View style={scoreBar.track}>
          <View style={[scoreBar.fill, { width: `${pct}%` as any, backgroundColor: def.color }]} />
        </View>
        <Text style={[scoreBar.value, { color: def.color }]}>{pct}</Text>
      </View>
    </View>
  );
}

function PatternChips({ items, labelMap, color }: { items: string[]; labelMap: Record<string, string>; color: string }) {
  if (items.length === 0) return null;
  return (
    <View style={chip.wrap}>
      {items.map((k) => (
        <View key={k} style={[chip.tag, { borderColor: `${color}40`, backgroundColor: `${color}12` }]}>
          <Text style={[chip.text, { color }]}>{labelOf(labelMap, k)}</Text>
        </View>
      ))}
    </View>
  );
}

function ArchetypeHero({ identity }: { identity: DreamIdentity }) {
  return (
    <View style={hero.card}>
      {/* Background glow */}
      <View style={hero.glow} />

      {/* Primary archetype */}
      <View style={hero.primaryBlock}>
        <Text style={hero.emoji}>{identity.primaryArchetypeEmoji}</Text>
        <View style={hero.nameBlock}>
          <Text style={hero.englishName}>{identity.primaryArchetypeEnglish}</Text>
          <Text style={hero.turkishName}>{identity.primaryArchetypeName}</Text>
        </View>
        <View style={hero.scorePill}>
          <Text style={hero.scorePillText}>{identity.primaryArchetypeScore}p</Text>
        </View>
      </View>

      {/* Divider + secondary */}
      <View style={hero.secondaryRow}>
        <View style={hero.dividerLine} />
        <Text style={hero.secondaryLabel}>+ </Text>
        <Text style={hero.secondaryEmoji}>{identity.secondaryArchetypeEmoji}</Text>
        <Text style={hero.secondaryName}>
          {identity.secondaryArchetypeEnglish} ({identity.secondaryArchetypeName})
        </Text>
        <View style={hero.dividerLine} />
      </View>

      {/* Dream count badge */}
      <View style={hero.countBadge}>
        <Ionicons name="moon-outline" size={12} color={Colors.primary} />
        <Text style={hero.countText}>{identity.dreamCount} rüya analiz edildi</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DreamIdentityScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['dream-identity'],
    queryFn: getMyIdentity,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const recomputeMutation = useMutation({
    mutationFn: recomputeIdentity,
    onSuccess: (updated) => {
      qc.setQueryData(['dream-identity'], updated);
    },
  });

  const handleRecompute = useCallback(() => {
    recomputeMutation.mutate();
  }, [recomputeMutation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Rüya Kimliğim</Text>
          <Text style={styles.headerSub}>Dream Identity</Text>
        </View>
        <Pressable
          onPress={handleRecompute}
          disabled={recomputeMutation.isPending}
          style={({ pressed }) => ({ opacity: pressed || recomputeMutation.isPending ? 0.5 : 1 })}
        >
          {recomputeMutation.isPending ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={22} color={Colors.textSecondary} />
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loaderText}>Rüya kimliğin hesaplanıyor…</Text>
        </View>
      ) : !data ? (
        <View style={styles.loader}>
          <Ionicons name="moon-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.loaderText}>Henüz yeterli rüya verisi yok.</Text>
          <Text style={styles.loaderSub}>En az birkaç rüya paylaştıktan sonra kimliğin belirlenir.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => void refetch()}
              tintColor={Colors.primary}
            />
          }
        >
          {/* Archetype hero card */}
          <ArchetypeHero identity={data} />

          {/* Personality summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="person-outline" size={16} color={Colors.primary} />
              <Text style={styles.summaryTitle}>Kişilik Özeti</Text>
            </View>
            <Text style={styles.summaryText}>{data.personalitySummary}</Text>
          </View>

          {/* Score meters */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Rüya Skorları</Text>
            <View style={styles.divider} />
            {SCORES.map((def) => (
              <ScoreBar key={def.key} def={def} value={data[def.key] as number} />
            ))}
          </View>

          {/* Dominant patterns */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Baskın Örüntüler</Text>
            <View style={styles.divider} />
            {PATTERN_SECTIONS.map((sec) => {
              const items = data[sec.key];
              if (!items || items.length === 0) return null;
              return (
                <View key={sec.key} style={styles.patternRow}>
                  <Text style={styles.patternLabel}>{sec.label}</Text>
                  <PatternChips items={items} labelMap={sec.map} color={sec.color} />
                </View>
              );
            })}
          </View>

          {/* Last updated */}
          <Text style={styles.updatedAt}>
            Son güncelleme:{' '}
            {new Date(data.computedAt).toLocaleDateString('tr-TR', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </Text>

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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  headerSub:    { fontSize: 10, color: Colors.textMuted, letterSpacing: 0.5 },

  loader:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  loaderText: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600', textAlign: 'center' },
  loaderSub:  { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  scroll: { padding: 16, gap: 12 },

  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 10,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryTitle:  { fontSize: 13, fontWeight: '700', color: Colors.primary },
  summaryText:   { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },

  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 0,
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10 },
  divider:      { height: 1, backgroundColor: Colors.border, marginBottom: 12 },

  patternRow: { marginBottom: 12, gap: 6 },
  patternLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },

  updatedAt: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 4,
  },
});

const hero = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primaryGlow,
  },
  primaryBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  emoji:     { fontSize: 44 },
  nameBlock: { flex: 1, gap: 2 },
  englishName: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  turkishName: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scorePill: {
    backgroundColor: Colors.primaryGlow,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${Colors.primary}50`,
  },
  scorePillText: { fontSize: 12, fontWeight: '800', color: Colors.primary },

  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  secondaryLabel: { fontSize: 12, color: Colors.textMuted },
  secondaryEmoji: { fontSize: 16 },
  secondaryName:  { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },

  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primaryGlow,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  countText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
});

const scoreBar = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '60',
  },
  labelCol: { width: 130, flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  sub:  { fontSize: 10, color: Colors.textMuted, lineHeight: 14 },
  right: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  fill:  { height: '100%', borderRadius: 3, opacity: 0.85 },
  value: { fontSize: 14, fontWeight: '800', minWidth: 28, textAlign: 'right' },
});

const chip = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});
