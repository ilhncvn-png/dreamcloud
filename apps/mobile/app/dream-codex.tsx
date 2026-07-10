import { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import {
  CODEX_ENTRIES,
  CATEGORY_META,
  searchEntries,
  type CodexCategory,
  type CodexEntry,
} from '@/data/codex';

const ACCENT = '#C4A55A';
const BG     = '#06050F';
const CARD   = '#0C0B1A';

const ALL_CATEGORIES = Object.keys(CATEGORY_META) as CodexCategory[];

export default function DreamCodexScreen() {
  const router = useRouter();
  const [query, setQuery]     = useState('');
  const [active, setActive]   = useState<CodexCategory | null>(null);
  const headerAnim             = useRef(new Animated.Value(0)).current;

  const entries = useMemo(() => {
    const searched = searchEntries(query);
    if (!active) return searched;
    return searched.filter(e => e.category === active);
  }, [query, active]);

  const renderEntry = ({ item }: { item: CodexEntry }) => {
    const meta = CATEGORY_META[item.category];
    return (
      <Pressable
        style={({ pressed }) => [s.card, { opacity: pressed ? 0.80 : 1 }]}
        onPress={() => router.push({ pathname: '/codex/[slug]', params: { slug: item.slug } } as any)}
      >
        <View style={[s.cardIconWrap, { backgroundColor: `${meta.color}15`, borderColor: `${meta.color}25` }]}>
          <Ionicons name={item.icon as any} size={20} color={meta.color} />
        </View>
        <View style={s.cardBody}>
          <View style={s.cardRow}>
            <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
            <View style={[s.catBadge, { backgroundColor: `${meta.color}18` }]}>
              <Text style={[s.catBadgeText, { color: meta.color }]}>{meta.glyph}</Text>
            </View>
          </View>
          <Text style={s.cardSub} numberOfLines={2}>{item.shortDesc}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.18)" />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── Sticky header ── */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.50)" />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerGlyph}>◈</Text>
          <Text style={s.headerTitle}>Dream Codex</Text>
        </View>
        <View style={s.backBtn} />
      </View>

      <FlatList
        data={entries}
        keyExtractor={item => item.slug}
        renderItem={renderEntry}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <>
            {/* Lore caption */}
            <View style={s.loreWrap}>
              <Text style={s.loreText}>
                Dream Cloud evreninde keşfedilen her kavram, her enerji ve her sembol bu kodekste kayıt altına alınmıştır. Okumak keşfetmektir.
              </Text>
              <View style={s.loreDivider} />
            </View>

            {/* Search */}
            <View style={s.searchWrap}>
              <Ionicons name="search-outline" size={16} color={ACCENT} />
              <TextInput
                style={s.searchInput}
                placeholder="Bir kavram ara…"
                placeholderTextColor="rgba(255,255,255,0.22)"
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.30)" />
                </Pressable>
              )}
            </View>

            {/* Category filters */}
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[null, ...ALL_CATEGORIES] as (CodexCategory | null)[]}
              keyExtractor={item => item ?? 'all'}
              contentContainerStyle={s.filterRow}
              renderItem={({ item: cat }) => {
                const isActive = active === cat;
                const meta     = cat ? CATEGORY_META[cat] : null;
                return (
                  <Pressable
                    style={[
                      s.filterPill,
                      isActive && { backgroundColor: meta ? `${meta.color}22` : `${ACCENT}22`, borderColor: meta ? meta.color : ACCENT },
                    ]}
                    onPress={() => setActive(cat === active ? null : cat)}
                  >
                    {meta && <Text style={{ fontSize: 10, marginRight: 4, color: isActive ? meta.color : 'rgba(255,255,255,0.35)' }}>{meta.glyph}</Text>}
                    <Text style={[s.filterText, isActive && { color: meta ? meta.color : ACCENT, fontWeight: '700' }]}>
                      {cat ? CATEGORY_META[cat].label : 'Tümü'}
                    </Text>
                  </Pressable>
                );
              }}
            />

            {/* Count */}
            <Text style={s.countLabel}>{entries.length} KAYIT</Text>
          </>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyGlyph}>◈</Text>
            <Text style={s.emptyTitle}>Kavram bulunamadı</Text>
            <Text style={s.emptySub}>Farklı anahtar kelimelerle ara</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={s.separator} />}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: BG },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: `${ACCENT}18` },
  backBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerGlyph:  { fontSize: 16, color: ACCENT, opacity: 0.80 },
  headerTitle:  { fontSize: 17, fontWeight: '800', color: 'rgba(255,255,255,0.88)', letterSpacing: 0.5 },

  // Lore
  loreWrap:     { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20, alignItems: 'center' },
  loreText:     { fontSize: 12.5, color: 'rgba(255,255,255,0.32)', textAlign: 'center', lineHeight: 20, fontStyle: 'italic', letterSpacing: 0.2 },
  loreDivider:  { width: 40, height: 1, backgroundColor: `${ACCENT}30`, marginTop: 20 },

  // Search
  searchWrap:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, gap: 10, backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: `${ACCENT}22`, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput:  { flex: 1, fontSize: 14, color: '#fff', padding: 0 },

  // Filters
  filterRow:    { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  filterPill:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.03)' },
  filterText:   { fontSize: 11.5, fontWeight: '600', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.3 },

  // Count
  countLabel:   { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.5, color: 'rgba(255,255,255,0.15)', paddingHorizontal: 20, marginBottom: 8 },

  // Cards
  listContent:  { paddingBottom: 48 },
  card:         { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: CARD },
  cardIconWrap: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardBody:     { flex: 1, gap: 4 },
  cardRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle:    { flex: 1, fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.88)', letterSpacing: 0.2 },
  catBadge:     { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  catBadgeText: { fontSize: 10, fontWeight: '800' },
  cardSub:      { fontSize: 12, color: 'rgba(255,255,255,0.32)', lineHeight: 17 },
  separator:    { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 74 },

  // Empty
  empty:        { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyGlyph:   { fontSize: 32, color: `${ACCENT}40` },
  emptyTitle:   { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.30)' },
  emptySub:     { fontSize: 12, color: 'rgba(255,255,255,0.18)' },
});
