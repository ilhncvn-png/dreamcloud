import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import {
  getCuratedPlaces,
  getPlaceIntelligence,
  getTrendingAll,
} from '@/api/places.api';
import type { DreamPlaceType, PlaceIntelligence, TrendingPlace } from '@/types/place.types';

// ─── Type helpers ─────────────────────────────────────────────────────────────

const TYPE_ICON: Record<DreamPlaceType, React.ComponentProps<typeof Ionicons>['name']> = {
  CITY:       'business-outline',
  COUNTRY:    'flag-outline',
  LANDMARK:   'diamond-outline',
  HOTEL:      'bed-outline',
  RESTAURANT: 'restaurant-outline',
  CAFE:       'cafe-outline',
  STREET:     'navigate-outline',
  BUILDING:   'home-outline',
  NATURE:     'leaf-outline',
  UNKNOWN:    'location-outline',
};

const TYPE_LABEL: Record<DreamPlaceType, string> = {
  CITY:       'Şehir',
  COUNTRY:    'Ülke',
  LANDMARK:   'Simge Yapı',
  HOTEL:      'Otel',
  RESTAURANT: 'Restoran',
  CAFE:       'Kafe',
  STREET:     'Sokak',
  BUILDING:   'Bina',
  NATURE:     'Doğa',
  UNKNOWN:    'Yer',
};

const TYPE_COLOR: Record<DreamPlaceType, string> = {
  CITY:       '#60A5FA',
  COUNTRY:    '#34D399',
  LANDMARK:   '#FBBF24',
  HOTEL:      '#A78BFA',
  RESTAURANT: '#F87171',
  CAFE:       '#FB923C',
  STREET:     '#94A3B8',
  BUILDING:   '#C084FC',
  NATURE:     '#4CAF87',
  UNKNOWN:    Colors.textMuted,
};

function placeColor(type: DreamPlaceType): string {
  return TYPE_COLOR[type] ?? Colors.textMuted;
}

// ─── Place card ───────────────────────────────────────────────────────────────

function PlaceCard({
  place,
  rank,
  onPress,
}: {
  place: TrendingPlace;
  rank?: number;
  onPress: () => void;
}) {
  const color = placeColor(place.type as DreamPlaceType);
  const icon  = TYPE_ICON[place.type as DreamPlaceType] ?? 'location-outline';

  return (
    <Pressable
      style={({ pressed }) => [styles.placeCard, { opacity: pressed ? 0.85 : 1, borderColor: `${color}30` }]}
      onPress={onPress}
    >
      {rank !== undefined && (
        <Text style={[styles.cardRank, { color }]}>#{rank}</Text>
      )}
      <View style={[styles.cardIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{place.name}</Text>
        <Text style={styles.cardMeta}>
          {TYPE_LABEL[place.type as DreamPlaceType]}
          {place.country ? ` · ${place.country}` : ''}
        </Text>
      </View>
      <View style={styles.cardStat}>
        <Text style={[styles.cardCount, { color }]}>{place.dreamCount}</Text>
        <Text style={styles.cardCountLabel}>rüya</Text>
        {place.dreamCount <= 2 && (
          <View style={styles.earlyBadge}>
            <Text style={styles.earlyBadgeText}>erken</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Detail view ─────────────────────────────────────────────────────────────

function PlaceDetailView({ name }: { name: string }) {
  const router = useRouter();
  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);
  const { data, isLoading } = useQuery<PlaceIntelligence | null>({
    queryKey: ['place-detail', name],
    queryFn: () => getPlaceIntelligence(name),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}><ActivityIndicator color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Pressable style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
          <Text style={styles.backText}>Dream Places</Text>
        </Pressable>
        <View style={styles.centered}>
          <Ionicons name="location-outline" size={36} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Bu yer hakkında henüz veri yok</Text>
        </View>
      </SafeAreaView>
    );
  }

  const color = placeColor(data.type as DreamPlaceType);
  const icon  = TYPE_ICON[data.type as DreamPlaceType] ?? 'location-outline';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Pressable style={styles.backBtn} onPress={goBack}>
        <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
        <Text style={styles.backText}>Dream Places</Text>
      </Pressable>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Hero */}
        <View style={[styles.detailHero, { borderColor: `${color}40` }]}>
          <View style={[styles.detailIconWrap, { backgroundColor: `${color}20` }]}>
            <Ionicons name={icon} size={30} color={color} />
          </View>
          <Text style={styles.detailName}>{data.name}</Text>
          <Text style={styles.detailSub}>
            {TYPE_LABEL[data.type as DreamPlaceType]}
            {data.country ? ` · ${data.country}` : ''}
            {data.city ? `, ${data.city}` : ''}
          </Text>

          {/* Stat row */}
          <View style={styles.detailStats}>
            <StatPill label="Rüya" value={data.dreamCount} color={color} />
            <StatPill label="Dream Score" value={data.dreamScore} color={color} />
            <StatPill
              label="Lucid"
              value={data.dreamCount < 3 ? '—' : `${Math.round(data.lucidRatio * 100)}%`}
              color="#C084FC"
            />
            <StatPill
              label="Kabus"
              value={data.dreamCount < 3 ? '—' : `${Math.round(data.nightmareRatio * 100)}%`}
              color="#F87171"
            />
          </View>
          {data.dreamCount < 3 && (
            <View style={styles.lowSampleNote}>
              <Ionicons name="information-circle-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.lowSampleText}>
                Az veri ({data.dreamCount} rüya) — oranlar henüz güvenilir değil
              </Text>
            </View>
          )}
        </View>

        {/* Emotions */}
        {data.emotions.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>DUYGULAR</Text>
            <View style={styles.card}>
              {data.emotions.slice(0, 6).map((e) => (
                <View key={e.emotion} style={styles.emotionRow}>
                  <Text style={styles.emotionName}>{e.emotion}</Text>
                  <View style={styles.emotionBar}>
                    <View style={[styles.emotionFill, { width: `${e.percentage}%` as any, backgroundColor: color }]} />
                  </View>
                  <Text style={[styles.emotionPct, { color }]}>{e.percentage}%</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Themes */}
        {data.themes.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>TEMALAR</Text>
            <View style={[styles.card, styles.chipRow]}>
              {data.themes.slice(0, 8).map((t) => (
                <View key={t.theme} style={[styles.chip, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}>
                  <Text style={[styles.chipText, { color }]}>{t.theme}</Text>
                  <Text style={styles.chipCount}>{t.count}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Symbols */}
        {data.symbols.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>SEMBOLLER</Text>
            <View style={[styles.card, styles.chipRow]}>
              {data.symbols.slice(0, 8).map((s) => (
                <View key={s.symbol} style={[styles.chip, { backgroundColor: '#A78BFA18', borderColor: '#A78BFA30' }]}>
                  <Text style={[styles.chipText, { color: '#A78BFA' }]}>{s.symbol}</Text>
                  <Text style={styles.chipCount}>{s.count}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Archetypes */}
        {data.archetypes.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>ARKETİPLER</Text>
            <View style={[styles.card, styles.chipRow]}>
              {data.archetypes.map((a) => (
                <View key={a.archetype} style={[styles.chip, { backgroundColor: '#FBBF2418', borderColor: '#FBBF2430' }]}>
                  <Text style={[styles.chipText, { color: '#FBBF24' }]}>{a.archetype}</Text>
                  <Text style={styles.chipCount}>{a.count}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatPill({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <View style={[styles.statPill, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}>
      <Text style={[styles.statPillValue, { color }]}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

type TrendTab = 'today' | 'week' | 'month';

export default function DreamPlacesScreen() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  const router   = useRouter();
  const goBack   = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);

  if (name) return <PlaceDetailView name={decodeURIComponent(name)} />;

  const [trendTab, setTrendTab] = useState<TrendTab>('week');

  const trendQ = useQuery({
    queryKey: ['places', 'trending-all'],
    queryFn:  getTrendingAll,
    staleTime: 10 * 60 * 1000,
  });

  const curatedQ = useQuery({
    queryKey: ['places', 'curated'],
    queryFn:  getCuratedPlaces,
    staleTime: 10 * 60 * 1000,
  });

  const trending   = trendQ.data?.[trendTab] ?? [];
  const curated    = curatedQ.data;
  const isLoading  = trendQ.isLoading || curatedQ.isLoading;

  const toDetail = (placeName: string) => {
    router.push({ pathname: '/dream-places', params: { name: encodeURIComponent(placeName) } } as any);
  };

  const TAB_LABELS: { key: TrendTab; label: string }[] = [
    { key: 'today', label: 'Bugün' },
    { key: 'week',  label: 'Hafta'  },
    { key: 'month', label: 'Ay'     },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Pressable style={styles.backBtn} onPress={goBack}>
        <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
        <Text style={styles.backText}>Benim Dünyam</Text>
      </Pressable>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <Text style={styles.heading}>Dream Places</Text>
        <Text style={styles.headingSub}>
          İnsanların rüyalarında en çok görünen yerler
        </Text>

        {isLoading ? (
          <View style={styles.centered}><ActivityIndicator color={Colors.primary} /></View>
        ) : (
          <>
            {/* ── Trending Places ───────────────────────────────────────── */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Ionicons name="flame-outline" size={14} color="#F87171" />
                <Text style={[styles.sectionTitle, { color: '#F87171' }]}>Trend Yerler</Text>
              </View>

              <View style={styles.tabRow}>
                {TAB_LABELS.map((t) => (
                  <Pressable
                    key={t.key}
                    style={[styles.tabBtn, trendTab === t.key && styles.tabBtnActive]}
                    onPress={() => setTrendTab(t.key)}
                  >
                    <Text style={[styles.tabText, trendTab === t.key && styles.tabTextActive]}>
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {trending.length === 0 ? (
                <EmptyInSection text="Bu dönemde henüz yer verisi yok" />
              ) : (
                trending.map((p, i) => (
                  <PlaceCard key={p.name} place={p} rank={i + 1} onPress={() => toDetail(p.name)} />
                ))
              )}
            </View>

            {/* ── Most Dreamed Cities ──────────────────────────────────── */}
            {(curated?.cities?.length ?? 0) > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="business-outline" size={14} color="#60A5FA" />
                  <Text style={[styles.sectionTitle, { color: '#60A5FA' }]}>En Çok Rüya Görülen Şehirler</Text>
                </View>
                {curated!.cities.map((p, i) => (
                  <PlaceCard key={p.name} place={p} rank={i + 1} onPress={() => toDetail(p.name)} />
                ))}
              </View>
            )}

            {/* ── Most Dreamed Landmarks ───────────────────────────────── */}
            {(curated?.landmarks?.length ?? 0) > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="diamond-outline" size={14} color="#FBBF24" />
                  <Text style={[styles.sectionTitle, { color: '#FBBF24' }]}>En Çok Rüya Görülen Simge Yapılar</Text>
                </View>
                {curated!.landmarks.map((p, i) => (
                  <PlaceCard key={p.name} place={p} rank={i + 1} onPress={() => toDetail(p.name)} />
                ))}
              </View>
            )}

            {/* ── Most Peaceful Places ─────────────────────────────────── */}
            {(curated?.peaceful?.length ?? 0) > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="water-outline" size={14} color="#34D399" />
                  <Text style={[styles.sectionTitle, { color: '#34D399' }]}>En Huzurlu Yerler</Text>
                </View>
                {curated!.peaceful.map((p) => (
                  <PlaceCard key={p.name} place={p} onPress={() => toDetail(p.name)} />
                ))}
              </View>
            )}

            {/* ── Most Lucid Places ────────────────────────────────────── */}
            {(curated?.lucid?.length ?? 0) > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="eye-outline" size={14} color="#C084FC" />
                  <Text style={[styles.sectionTitle, { color: '#C084FC' }]}>En Fazla Lucid Rüya Görülen Yerler</Text>
                </View>
                {curated!.lucid.map((p) => (
                  <PlaceCard key={p.name} place={p} onPress={() => toDetail(p.name)} />
                ))}
              </View>
            )}

            {/* ── Most Emotional Places ────────────────────────────────── */}
            {(curated?.emotional?.length ?? 0) > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="heart-outline" size={14} color="#F472B6" />
                  <Text style={[styles.sectionTitle, { color: '#F472B6' }]}>En Duygusal Yerler</Text>
                </View>
                {curated!.emotional.map((p) => (
                  <PlaceCard key={p.name} place={p} onPress={() => toDetail(p.name)} />
                ))}
              </View>
            )}

            {/* Empty state when no data at all */}
            {trending.length === 0 &&
             (curated?.cities.length ?? 0) === 0 &&
             (curated?.landmarks.length ?? 0) === 0 && (
              <View style={styles.emptyFull}>
                <Ionicons name="location-outline" size={44} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>Henüz yer verisi yok</Text>
                <Text style={styles.emptyText}>
                  Rüyalarda gerçek dünya yerleri bahsedildikçe burada görünmeye başlar
                </Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyInSection({ text }: { text: string }) {
  return (
    <View style={styles.emptySection}>
      <Ionicons name="location-outline" size={22} color={Colors.textMuted} />
      <Text style={styles.emptySectionText}>{text}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll:    { paddingHorizontal: 16, paddingBottom: 40 },
  centered:  { paddingVertical: 60, alignItems: 'center', gap: 10 },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  backText: { fontSize: 13, color: Colors.textSecondary },

  heading:    { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  headingSub: { fontSize: 13, color: Colors.textMuted, lineHeight: 19, marginTop: 4, marginBottom: 16 },

  // Section
  sectionBlock: { marginBottom: 20 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '800' },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.2, marginTop: 16, marginBottom: 8 },

  // Tabs
  tabRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 10, padding: 3, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  tabBtn: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabText:       { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: '#FFFFFF', fontWeight: '700' },

  // Place card
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  cardRank:       { fontSize: 11, fontWeight: '800', width: 22, textAlign: 'right' },
  cardIcon:       { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardBody:       { flex: 1, gap: 2 },
  cardName:       { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  cardMeta:       { fontSize: 11, color: Colors.textMuted },
  cardStat:       { alignItems: 'center', gap: 1 },
  cardCount:      { fontSize: 18, fontWeight: '900' },
  cardCountLabel: { fontSize: 9, color: Colors.textMuted },
  earlyBadge: {
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5,
    backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)', marginTop: 2,
  },
  earlyBadgeText: { fontSize: 8, color: '#FBBF24', fontWeight: '700' },
  lowSampleNote: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, marginTop: 4,
  },
  lowSampleText: { fontSize: 11, color: Colors.textMuted, flex: 1, lineHeight: 15 },

  // Detail
  detailHero: {
    backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1,
    padding: 20, alignItems: 'center', gap: 8, marginBottom: 12,
  },
  detailIconWrap: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  detailName:     { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  detailSub:      { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  detailStats:    { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 },
  statPill:       { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, alignItems: 'center', minWidth: 64 },
  statPillValue:  { fontSize: 16, fontWeight: '800' },
  statPillLabel:  { fontSize: 9, color: Colors.textMuted, marginTop: 1 },

  card: {
    backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1,
    borderColor: Colors.border, padding: 14, marginBottom: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipText:  { fontSize: 12, fontWeight: '600' },
  chipCount: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },

  emotionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: `${Colors.border}60` },
  emotionName: { fontSize: 13, color: Colors.textPrimary, width: 80 },
  emotionBar:  { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.border, overflow: 'hidden' },
  emotionFill: { height: '100%', borderRadius: 2, opacity: 0.8 },
  emotionPct:  { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },

  emptySection:     { paddingVertical: 20, alignItems: 'center', gap: 8 },
  emptySectionText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  emptyFull:  { paddingVertical: 60, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textSecondary },
  emptyText:  { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 19 },
});
