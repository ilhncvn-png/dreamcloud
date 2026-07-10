import { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getEntryBySlug,
  getEntryBySlug as getRelated,
  CATEGORY_META,
} from '@/data/codex';

const ACCENT = '#C4A55A';
const BG     = '#06050F';
const CARD   = '#0C0B1A';

function SectionBlock({ label, body }: { label: string; body: string }) {
  return (
    <View style={d.section}>
      <View style={d.sectionLabelRow}>
        <View style={d.sectionDot} />
        <Text style={d.sectionLabel}>{label}</Text>
      </View>
      <Text style={d.sectionBody}>{body}</Text>
    </View>
  );
}

export default function CodexEntryScreen() {
  const router  = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const entry = getEntryBySlug(slug ?? '');

  if (!entry) {
    return (
      <SafeAreaView style={d.container} edges={['top']}>
        <Pressable onPress={() => router.back()} style={d.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.50)" />
        </Pressable>
        <View style={d.notFound}>
          <Text style={d.notFoundGlyph}>◈</Text>
          <Text style={d.notFoundText}>Bu kayıt Codex'te bulunamadı</Text>
          <Pressable onPress={() => router.back()} style={d.notFoundBtn}>
            <Text style={d.notFoundBtnText}>Geri Dön</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const meta     = CATEGORY_META[entry.category];
  const related  = (entry.relatedSlugs ?? [])
    .map(s => getRelated(s))
    .filter(Boolean) as NonNullable<ReturnType<typeof getEntryBySlug>>[];

  return (
    <SafeAreaView style={d.container} edges={['top']}>

      {/* Sticky back bar */}
      <Pressable onPress={() => router.back()} style={d.backBtn} hitSlop={12}>
        <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.50)" />
        <Text style={d.backLabel}>Dream Codex</Text>
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={d.scroll}>

        {/* ── Hero ── */}
        <View style={d.hero}>
          {/* Category badge */}
          <View style={[d.catPill, { backgroundColor: `${meta.color}18`, borderColor: `${meta.color}30` }]}>
            <Text style={[d.catPillGlyph, { color: meta.color }]}>{meta.glyph}</Text>
            <Text style={[d.catPillLabel, { color: meta.color }]}>{meta.label}</Text>
          </View>

          {/* Icon ring */}
          <View style={[d.iconRing, { borderColor: `${meta.color}30`, backgroundColor: `${meta.color}0C` }]}>
            <Ionicons name={entry.icon as any} size={36} color={meta.color} />
          </View>

          {/* Title */}
          <Text style={d.title}>{entry.title}</Text>
          <Text style={d.subtitle}>{entry.subtitle}</Text>

          {/* Ornamental divider */}
          <View style={d.ornament}>
            <View style={[d.ornamentLine, { backgroundColor: `${ACCENT}25` }]} />
            <Text style={[d.ornamentGlyph, { color: `${ACCENT}60` }]}>◈</Text>
            <View style={[d.ornamentLine, { backgroundColor: `${ACCENT}25` }]} />
          </View>

          {/* Short description */}
          <Text style={d.shortDesc}>{entry.shortDesc}</Text>
        </View>

        {/* ── Content sections ── */}
        <View style={d.sections}>
          <SectionBlock label="AÇIKLAMA"          body={entry.detail} />
          <View style={d.sectionDivider} />
          <SectionBlock label="NEDEN ÖNEMLİ"      body={entry.whyItMatters} />
          <View style={d.sectionDivider} />
          <SectionBlock label="NASIL ETKİLEŞİM KURULUR" body={entry.howToInteract} />
        </View>

        {/* ── Related entries ── */}
        {related.length > 0 && (
          <View style={d.relatedWrap}>
            <Text style={d.relatedLabel}>İLGİLİ KAVRAMLAR</Text>
            {related.map(rel => {
              const relMeta = CATEGORY_META[rel.category];
              return (
                <Pressable
                  key={rel.slug}
                  style={({ pressed }) => [d.relatedCard, { opacity: pressed ? 0.78 : 1 }]}
                  onPress={() => router.push({ pathname: '/codex/[slug]', params: { slug: rel.slug } } as any)}
                >
                  <View style={[d.relatedIcon, { backgroundColor: `${relMeta.color}14`, borderColor: `${relMeta.color}25` }]}>
                    <Ionicons name={rel.icon as any} size={16} color={relMeta.color} />
                  </View>
                  <View style={d.relatedBody}>
                    <Text style={d.relatedTitle}>{rel.title}</Text>
                    <Text style={d.relatedSub} numberOfLines={1}>{rel.shortDesc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.18)" />
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Footer seal */}
        <View style={d.footer}>
          <Text style={d.footerSeal}>◈ Dream Codex ◈</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const d = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BG },

  // Back
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: `${ACCENT}12` },
  backLabel:   { fontSize: 13, color: 'rgba(255,255,255,0.32)', fontWeight: '600' },

  // Hero
  scroll:      { paddingBottom: 56 },
  hero:        { alignItems: 'center', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  catPill:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginBottom: 24 },
  catPillGlyph:{ fontSize: 10, fontWeight: '800' },
  catPillLabel:{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5 },

  iconRing:    { width: 80, height: 80, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },

  title:       { fontSize: 26, fontWeight: '900', color: 'rgba(255,255,255,0.92)', textAlign: 'center', letterSpacing: 0.3, marginBottom: 6 },
  subtitle:    { fontSize: 13, color: 'rgba(255,255,255,0.35)', textAlign: 'center', fontStyle: 'italic', lineHeight: 20, marginBottom: 24 },

  ornament:    { flexDirection: 'row', alignItems: 'center', width: '70%', gap: 10, marginBottom: 22 },
  ornamentLine:{ flex: 1, height: 1 },
  ornamentGlyph:{ fontSize: 12 },

  shortDesc:   { fontSize: 15, color: 'rgba(255,255,255,0.60)', textAlign: 'center', lineHeight: 24, fontWeight: '500' },

  // Sections
  sections:    { paddingHorizontal: 20, marginTop: 8 },
  section:     { paddingVertical: 20 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionDot:  { width: 4, height: 4, borderRadius: 2, backgroundColor: ACCENT, opacity: 0.70 },
  sectionLabel:{ fontSize: 9, fontWeight: '900', letterSpacing: 2.5, color: `${ACCENT}80` },
  sectionBody: { fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 24 },
  sectionDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },

  // Related
  relatedWrap: { paddingHorizontal: 20, paddingTop: 28, gap: 8 },
  relatedLabel:{ fontSize: 9, fontWeight: '900', letterSpacing: 2.5, color: 'rgba(255,255,255,0.18)', marginBottom: 4 },
  relatedCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  relatedIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  relatedBody: { flex: 1 },
  relatedTitle:{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  relatedSub:  { fontSize: 11, color: 'rgba(255,255,255,0.28)', lineHeight: 15 },

  // Footer
  footer:      { alignItems: 'center', paddingTop: 36, paddingBottom: 8 },
  footerSeal:  { fontSize: 10, letterSpacing: 3, color: `${ACCENT}30`, fontWeight: '600' },

  // Not found
  notFound:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundGlyph: { fontSize: 36, color: `${ACCENT}30` },
  notFoundText:{ fontSize: 15, color: 'rgba(255,255,255,0.30)', textAlign: 'center' },
  notFoundBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  notFoundBtnText: { fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: '600' },
});
