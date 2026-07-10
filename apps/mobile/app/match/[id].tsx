import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '@/components/Avatar';
import { getMatchById } from '@/api/matches.api';
import { Colors } from '@/constants/colors';
import type { MatchDetail, MatchDreamSnippet, ResonanceLevel } from '@/types/match.types';
import {
  THEME_LABELS, EMOTION_LABELS, SYMBOL_LABELS, LOCATION_LABELS, ARCHETYPE_LABELS,
  labelOf,
  themeExplanation, emotionExplanation, symbolExplanation, locationExplanation, archetypeExplanation,
  buildConnectionNarrative,
  RESONANCE_HUMAN_LABELS, RESONANCE_COLORS, RESONANCE_DESCRIPTIONS,
} from '@/utils/resonance-labels';

// ── Dimension config ──────────────────────────────────────────────────────────

interface DimensionDef {
  key: 'themes' | 'emotions' | 'symbols' | 'locations' | 'archetypes';
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  color: string;
  glow: string;
  labelMap: Record<string, string>;
  explain: (items: string[]) => string;
}

const DIMENSIONS: DimensionDef[] = [
  { key: 'emotions',  icon: 'heart-outline',   title: 'Ortak Duygular',   color: '#F472B6', glow: 'rgba(244,114,182,0.12)', labelMap: EMOTION_LABELS,   explain: emotionExplanation   },
  { key: 'themes',    icon: 'grid-outline',     title: 'Ortak Temalar',    color: '#A78BFA', glow: 'rgba(167,139,250,0.12)', labelMap: THEME_LABELS,     explain: themeExplanation     },
  { key: 'symbols',   icon: 'eye-outline',      title: 'Ortak Semboller',  color: '#60A5FA', glow: 'rgba(96,165,250,0.12)',  labelMap: SYMBOL_LABELS,    explain: symbolExplanation    },
  { key: 'archetypes',icon: 'infinite-outline', title: 'Ortak Arketipler', color: '#FBBF24', glow: 'rgba(251,191,36,0.12)',  labelMap: ARCHETYPE_LABELS, explain: archetypeExplanation },
  { key: 'locations', icon: 'location-outline', title: 'Ortak Mekanlar',   color: '#4CAF87', glow: 'rgba(76,175,135,0.12)',  labelMap: LOCATION_LABELS,  explain: locationExplanation  },
];

const PRIMARY_DIMS   = DIMENSIONS.slice(0, 2); // emotions + themes: always visible
const SECONDARY_DIMS = DIMENSIONS.slice(2);    // symbols, archetypes, locations: expandable

// ── Sub-components ────────────────────────────────────────────────────────────

function DreamCard({ dream, accent }: { dream: MatchDreamSnippet; accent: string }) {
  const name    = dream.displayName ?? dream.username;
  const label   = dream.isYou ? 'Senin Rüyan' : 'Yankılanan Rüya';
  const snippet = dream.content.slice(0, 160).trim();

  return (
    <View style={[card.container, { borderColor: `${accent}40` }]}>
      <View style={[card.labelRow, { backgroundColor: `${accent}18` }]}>
        <View style={[card.dot, { backgroundColor: accent }]} />
        <Text style={[card.labelText, { color: accent }]}>{label}</Text>
      </View>
      <View style={card.userRow}>
        <Avatar uri={dream.avatarUrl} name={name} size={32} />
        <View>
          <Text style={card.name}>{name}</Text>
          <Text style={card.username}>@{dream.username}</Text>
        </View>
      </View>
      {dream.title ? <Text style={card.title}>{dream.title}</Text> : null}
      <Text style={card.excerpt}>{snippet}…</Text>
    </View>
  );
}

function DimensionCard({ dim, items }: { dim: DimensionDef; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={[dimCard.container, { borderColor: `${dim.color}30`, backgroundColor: dim.glow }]}>
      <View style={dimCard.header}>
        <View style={[dimCard.iconBox, { backgroundColor: `${dim.color}20`, borderColor: `${dim.color}40` }]}>
          <Ionicons name={dim.icon} size={18} color={dim.color} />
        </View>
        <Text style={[dimCard.title, { color: dim.color }]}>{dim.title}</Text>
      </View>
      <Text style={dimCard.explanation}>{dim.explain(items)}</Text>
      <View style={dimCard.tags}>
        {items.map((item) => (
          <View key={item} style={[dimCard.tag, { borderColor: `${dim.color}50`, backgroundColor: `${dim.color}12` }]}>
            <Text style={[dimCard.tagText, { color: dim.color }]}>{labelOf(dim.labelMap, item)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function BridgeVisualization({ match }: { match: MatchDetail }) {
  const hasAny = match.sharedThemes.length > 0 || match.sharedEmotions.length > 0 || match.sharedSymbols.length > 0;
  if (!hasAny) return null;

  const allShared = [
    ...match.sharedEmotions.map((e) => ({ label: labelOf(EMOTION_LABELS, e), color: '#F472B6' })),
    ...match.sharedThemes.map((t) => ({ label: labelOf(THEME_LABELS, t),    color: '#A78BFA' })),
    ...match.sharedSymbols.map((s) => ({ label: labelOf(SYMBOL_LABELS, s),  color: '#60A5FA' })),
    ...match.sharedLocations.map((l) => ({ label: labelOf(LOCATION_LABELS, l), color: '#4CAF87' })),
  ];

  return (
    <View style={bridge.container}>
      <View style={bridge.lineLeft} />
      <View style={bridge.center}>
        <Text style={bridge.title}>Buluşma Noktaları</Text>
        <View style={bridge.chips}>
          {allShared.map((item, i) => (
            <View key={i} style={[bridge.chip, { borderColor: `${item.color}60`, backgroundColor: `${item.color}15` }]}>
              <Text style={[bridge.chipText, { color: item.color }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={bridge.lineRight} />
    </View>
  );
}

// ── Richer connection narrative using actual dream content ────────────────────

function _truncateWord(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 5 ? cut.slice(0, lastSpace) : cut).trim();
}

function buildRichNarrative(
  myDream: MatchDreamSnippet,
  matchingDream: MatchDreamSnippet,
  match: MatchDetail,
): string {
  const sharedEmotion = match.sharedEmotions[0];
  const sharedTheme   = match.sharedThemes[0];
  const sharedSymbol  = match.sharedSymbols[0];

  const emotLabel   = sharedEmotion ? (EMOTION_LABELS[sharedEmotion]  ?? sharedEmotion)  : null;
  const themeLabel  = sharedTheme   ? (THEME_LABELS[sharedTheme]      ?? sharedTheme)    : null;
  const symbolLabel = sharedSymbol  ? (SYMBOL_LABELS[sharedSymbol]    ?? sharedSymbol)   : null;

  const myExcerpt    = _truncateWord(myDream.content, 60);
  const theirExcerpt = _truncateWord(matchingDream.content, 60);

  const parts: string[] = [];

  if (emotLabel && themeLabel) {
    parts.push(`Her iki rüya da ${emotLabel.toLowerCase()} duygusunu ve ${themeLabel.toLowerCase()} enerjisini paylaşıyor.`);
  } else if (emotLabel) {
    parts.push(`Her iki rüya da ${emotLabel.toLowerCase()} taşıyor.`);
  } else if (themeLabel) {
    parts.push(`Her iki rüya da ${themeLabel.toLowerCase()} enerjisini paylaşıyor.`);
  }

  if (myExcerpt && theirExcerpt) {
    parts.push(`Birinde "${myExcerpt}…" ile açılan yolculuk, diğerinde "${theirExcerpt}…" olarak başlıyor.`);
  }

  if (symbolLabel) {
    parts.push(`Her iki rüyada da "${symbolLabel}" beliriyor.`);
  }

  return parts.length > 0
    ? parts.join(' ')
    : 'Bu rüyalar bilinçaltı düzeyinde bağlantılı.';
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['match', id],
    queryFn:  () => getMatchById(id),
    enabled:  !!id,
    staleTime: 5 * 60 * 1000,
  });

  const handleUserPress  = useCallback(() => data && router.push(`/user/${data.matchingDream.userId}`), [data, router]);
  const handleDreamPress = useCallback(() => data && router.push(`/dream/${data.matchingDream.id}`),  [data, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={goBack}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Bilinçaltı Bağlantısı</Text>
        <View style={{ width: 34 }} />
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loaderText}>Bağlantı izleri aranıyor…</Text>
        </View>
      ) : isError || !data ? (
        <View style={styles.loader}>
          <Ionicons name="alert-circle-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.loaderText}>Eşleşme bulunamadı</Text>
        </View>
      ) : (
        <MatchBody
          data={data}
          detailsExpanded={detailsExpanded}
          onExpandDetails={() => setDetailsExpanded(true)}
          onDreamPress={handleDreamPress}
          onUserPress={handleUserPress}
        />
      )}
    </SafeAreaView>
  );
}

function MatchBody({
  data,
  detailsExpanded,
  onExpandDetails,
  onDreamPress,
  onUserPress,
}: {
  data: MatchDetail;
  detailsExpanded: boolean;
  onExpandDetails: () => void;
  onDreamPress: () => void;
  onUserPress: () => void;
}) {
  const level      = data.resonanceLevel as ResonanceLevel;
  const levelColor = RESONANCE_COLORS[level] ?? Colors.primary;
  const levelName  = RESONANCE_HUMAN_LABELS[level] ?? level;
  const levelDesc  = RESONANCE_DESCRIPTIONS[level] ?? '';

  const narrative = buildRichNarrative(data.myDream, data.matchingDream, data);

  const getItems = (key: DimensionDef['key']): string[] => {
    if (key === 'themes')     return data.sharedThemes;
    if (key === 'emotions')   return data.sharedEmotions;
    if (key === 'symbols')    return data.sharedSymbols;
    if (key === 'archetypes') return data.sharedArchetypes ?? [];
    if (key === 'locations')  return data.sharedLocations;
    return [];
  };

  const hasSecondary = SECONDARY_DIMS.some(d => getItems(d.key).length > 0);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {/* ── Hero: resonance level + description ── */}
      <View style={styles.hero}>
        <View style={[styles.resonancePill, { backgroundColor: `${levelColor}15`, borderColor: `${levelColor}35` }]}>
          <Ionicons name="sparkles-outline" size={13} color={levelColor} />
          <Text style={[styles.resonanceName, { color: levelColor }]}>{levelName}</Text>
        </View>
        <Text style={styles.resonanceDesc}>{levelDesc}</Text>
      </View>

      {/* ── Dream pair ── */}
      <DreamCard dream={data.myDream} accent="#6C63FF" />
      <BridgeVisualization match={data} />
      <DreamCard dream={data.matchingDream} accent="#F472B6" />

      {/* ── Why connected ── */}
      <Text style={styles.sectionTitle}>Bu rüyalar neden buluştu?</Text>
      <Text style={styles.narrativeText}>{narrative}</Text>

      {/* Primary dimensions: emotions + themes always shown */}
      {PRIMARY_DIMS.map((dim) => (
        <DimensionCard key={dim.key} dim={dim} items={getItems(dim.key)} />
      ))}

      {/* Secondary dimensions: mystery expand layer */}
      {hasSecondary && (
        detailsExpanded ? (
          SECONDARY_DIMS.map((dim) => (
            <DimensionCard key={dim.key} dim={dim} items={getItems(dim.key)} />
          ))
        ) : (
          <Pressable
            style={({ pressed }) => [styles.expandBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={onExpandDetails}
          >
            <Ionicons name="chevron-down-outline" size={14} color={Colors.primary} />
            <Text style={styles.expandText}>Daha fazla bağlantıyı keşfet</Text>
          </Pressable>
        )
      )}

      {/* ── CTA buttons ── */}
      <View style={styles.ctaSection}>
        <Pressable
          style={({ pressed }) => [styles.ctaPrimary, { opacity: pressed ? 0.85 : 1 }]}
          onPress={onDreamPress}
        >
          <Ionicons name="moon-outline" size={16} color="#fff" />
          <Text style={styles.ctaPrimaryText}>Yankılanan Rüyayı Oku</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.ctaSecondary, { opacity: pressed ? 0.85 : 1 }]}
          onPress={onUserPress}
        >
          <Ionicons name="person-outline" size={16} color={Colors.primary} />
          <Text style={styles.ctaSecondaryText}>
            @{data.matchingDream.username} Profilini Gör
          </Text>
        </Pressable>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },

  loader:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { fontSize: 14, color: Colors.textMuted },

  scroll: { padding: 20, gap: 0 },

  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
    marginBottom: 4,
  },
  resonancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resonanceName: { fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  resonanceDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 8,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 10,
    marginTop: 20,
  },
  narrativeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 14,
    fontStyle: 'italic',
  },

  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: `${Colors.primary}08`,
  },
  expandText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  ctaSection: { gap: 10, marginTop: 24 },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  ctaPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    backgroundColor: Colors.primaryGlow,
  },
  ctaSecondaryText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
});

// Dream card styles
const card = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 0,
    backgroundColor: Colors.surface,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dot:       { width: 7, height: 7, borderRadius: 4 },
  labelText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  userRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingBottom: 0 },
  name:      { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  username:  { fontSize: 12, color: Colors.textMuted },
  title:     { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 12, marginTop: 8 },
  excerpt:   { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, padding: 12, paddingTop: 6 },
});

// Dimension card styles
const dimCard = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  header:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title:       { fontSize: 14, fontWeight: '700' },
  explanation: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20, fontStyle: 'italic' },
  tags:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { fontSize: 12, fontWeight: '600' },
});

// Bridge visualization styles
const bridge = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  lineLeft:  { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  lineRight: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  center: {
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 5,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: { fontSize: 11, fontWeight: '600' },
});
