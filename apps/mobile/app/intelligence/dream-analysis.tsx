import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { getDreamIntelligenceAnalysis } from '@/api/intelligence.api';

// ── Constants ─────────────────────────────────────────────────────────────────

const EMOTION_COLOR: Record<string, string> = {
  fear: '#F87171',  anxiety: '#F87171',    dread: '#DC2626',
  curiosity: '#A78BFA', wonder: '#A78BFA', awe: '#7C3AED',
  sadness: '#60A5FA', grief: '#3B82F6',    longing: '#93C5FD',
  hope: '#34D399',  joy: '#FBBF24',        peace: '#22D3EE',
  serenity: '#06B6D4', warmth: '#F97316',  liberation: '#86EFAC',
  unease: '#FCD34D', bittersweet: '#C084FC', clarity: '#67E8F9',
  loneliness: '#818CF8', melancholy: '#6D28D9', nostalgia: '#F472B6',
  disorientation: '#94A3B8', love: '#FB7185', anger: '#EF4444',
  excitement: '#34D399', calm: '#6EE7B7',
};

const EMOTION_TR: Record<string, string> = {
  fear: 'Korku', anxiety: 'Kaygı', dread: 'Tedirginlik',
  curiosity: 'Merak', wonder: 'Hayranlık', awe: 'Huşu',
  sadness: 'Hüzün', grief: 'Yas', longing: 'Özlem',
  hope: 'Umut', joy: 'Sevinç', peace: 'Huzur',
  serenity: 'Sükunet', warmth: 'Sıcaklık', liberation: 'Özgürlük',
  unease: 'Huzursuzluk', bittersweet: 'Tatlı-Acı', clarity: 'Netlik',
  loneliness: 'Yalnızlık', melancholy: 'Melankoli', nostalgia: 'Nostalji',
  disorientation: 'Yönsüzlük', love: 'Aşk', anger: 'Öfke',
  excitement: 'Heyecan', calm: 'Dinginlik',
};

const INTENSITY_DOTS: Record<string, number> = {
  low: 1, moderate: 2, high: 3, intense: 4, overwhelming: 5,
};

const ARCHETYPE_META: Record<string, { icon: string; label: string; desc: string }> = {
  shadow:     { icon: '🌑', label: 'Gölge',      desc: 'Kabul edilmemiş benlik yönleri yüzeye çıkıyor.' },
  guide:      { icon: '🌟', label: 'Rehber',      desc: 'İçsel bilgelik sembolik bir figürle konuşuyor.' },
  child:      { icon: '🌱', label: 'İç Çocuk',    desc: 'Masumiyet ve yeniden doğuş enerjisi.' },
  anima:      { icon: '🌙', label: 'Anima',       desc: 'Bilinçdışındaki dişil prensiplerin sesi.' },
  animus:     { icon: '☀️', label: 'Animus',      desc: 'Bilinçdışındaki eril prensiplerin sesi.' },
  hero:       { icon: '⚔️', label: 'Kahraman',    desc: 'Zorlukların üstesinden gelen benlik yönü.' },
  trickster:  { icon: '🃏', label: 'Şeytan Oğlan', desc: 'Düzeni bozan ve dönüştüren güç.' },
  wise_elder: { icon: '🦉', label: 'Bilge',       desc: 'Deneyim ve içgüdüsel bilgelik konuşuyor.' },
  explorer:   { icon: '🧭', label: 'Kaşif',       desc: 'Bilinmeyene atılım ve keşif dürtüsü.' },
  seeker:     { icon: '🔍', label: 'Arayan',      desc: 'Anlam ve gerçeği bulma arayışı.' },
  guardian:   { icon: '🛡', label: 'Bekçi',       desc: 'Koruma ve sınır koyma ihtiyacı.' },
  threshold:  { icon: '🚪', label: 'Eşik',        desc: 'Bir geçiş anının tam ortasındasın.' },
};

const SYM_ICON: Record<string, string> = {
  threshold: '🚪', shadow: '🌑', flood: '🌊', guide: '🌟', flying: '🌤',
  transformation: '⚡', labyrinth: '🌀', fire: '🔥', mirror: '🪞', abyss: '🕳',
  falling: '💫', child: '🌱', water: '💧', mountain: '⛰', key: '🗝',
  wind: '💨', forest: '🌿', road: '🛤', eye: '👁', spiral: '🌀',
  light: '✨', sea: '🌊', tree: '🌳', door: '🚪', animal: '🦁',
};

function emotionColor(e: string) { return EMOTION_COLOR[e] ?? Colors.primary; }
function emotionLabel(e: string) { return EMOTION_TR[e] ?? e; }
function symIcon(s: string)      { return SYM_ICON[s.toLowerCase()] ?? '✦'; }

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreOrb({ value, label, color }: { value: number | null; label: string; color: string }) {
  const display = value !== null ? Math.round(value) : '—';
  return (
    <View style={[orb.container, { borderColor: color + '60', backgroundColor: color + '12' }]}>
      <View style={[orb.inner, { borderColor: color + '40', backgroundColor: color + '08' }]}>
        <Text style={[orb.value, { color }]}>{display}</Text>
        <Text style={orb.label}>{label}</Text>
      </View>
    </View>
  );
}

const orb = StyleSheet.create({
  container: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  inner: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  value: { fontSize: 26, fontWeight: '800', letterSpacing: -1 },
  label: { fontSize: 9, color: Colors.textMuted, fontWeight: '600', letterSpacing: 1, marginTop: 1 },
});

function IntensityDots({ level, color }: { level: string; color: string }) {
  const count = INTENSITY_DOTS[level] ?? 2;
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={{
          width: 5, height: 5, borderRadius: 3,
          backgroundColor: i < count ? color : 'rgba(255,255,255,0.08)',
        }} />
      ))}
    </View>
  );
}

function SectionHeader({ icon, title, color }: { icon: string; title: string; color: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={[s.sectionIcon, { color }]}>{icon}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DreamAnalysisScreen() {
  const { dreamId } = useLocalSearchParams<{ dreamId: string }>();
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['intel-analysis', dreamId],
    queryFn: () => getDreamIntelligenceAnalysis(dreamId ?? ''),
    enabled: !!dreamId,
    staleTime: 5 * 60_000,
  });

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={s.headerTitle}>
          <Text style={s.titleLabel}>RÜYA ANALİZİ</Text>
          <Text style={s.titleSub}>Bilinçaltı zekası</Text>
        </View>
        <View style={s.headerRight}>
          <View style={[s.liveTag, { backgroundColor: Colors.primary + '20', borderColor: Colors.primary + '40' }]}>
            <Text style={[s.liveText, { color: Colors.primary }]}>AI</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={s.loadingText}>Rüya analiz ediliyor...</Text>
        </View>
      ) : isError || !data ? (
        <View style={s.center}>
          <Text style={{ fontSize: 36 }}>🌑</Text>
          <Text style={s.emptyTitle}>Analiz bulunamadı</Text>
          <Text style={s.emptyDesc}>Bu rüya henüz işlenmemiş olabilir.</Text>
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Score orbs */}
          <View style={s.orbRow}>
            <ScoreOrb value={data.dreamScore}     label="RÜYA SKORU"    color="#FBBF24" />
            <ScoreOrb value={data.resonanceScore} label="REZONANS"       color={Colors.primary} />
          </View>

          {/* Primary chips */}
          <View style={s.chipRow}>
            {data.primaryEmotion && (
              <View style={[s.chip, { borderColor: emotionColor(data.primaryEmotion) + '60', backgroundColor: emotionColor(data.primaryEmotion) + '14' }]}>
                <Text style={[s.chipText, { color: emotionColor(data.primaryEmotion) }]}>
                  {emotionLabel(data.primaryEmotion)}
                </Text>
              </View>
            )}
            {data.primarySymbol && (
              <View style={[s.chip, { borderColor: '#60A5FA60', backgroundColor: '#60A5FA14' }]}>
                <Text style={s.chipIcon}>{symIcon(data.primarySymbol)}</Text>
                <Text style={[s.chipText, { color: '#60A5FA' }]}>{data.primarySymbol}</Text>
              </View>
            )}
            {data.primaryArchetype && (
              <View style={[s.chip, { borderColor: '#FBBF2460', backgroundColor: '#FBBF2414' }]}>
                <Text style={s.chipIcon}>{ARCHETYPE_META[data.primaryArchetype]?.icon ?? '✦'}</Text>
                <Text style={[s.chipText, { color: '#FBBF24' }]}>
                  {ARCHETYPE_META[data.primaryArchetype]?.label ?? data.primaryArchetype}
                </Text>
              </View>
            )}
          </View>

          {/* Emotions */}
          {data.emotions.length > 0 && (
            <View style={s.card}>
              <SectionHeader icon="❤️" title="Duygular" color="#F472B6" />
              {data.emotions.map((e, i) => {
                const color = emotionColor(e.emotion);
                return (
                  <View key={i} style={s.emotionRow}>
                    <View style={[s.emotionDot, { backgroundColor: color }]} />
                    <Text style={s.emotionLabel}>{emotionLabel(e.emotion)}</Text>
                    {e.isPrimary && (
                      <View style={[s.primaryTag, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                        <Text style={[s.primaryTagText, { color }]}>Baskın</Text>
                      </View>
                    )}
                    <View style={{ marginLeft: 'auto' }}>
                      <IntensityDots level={e.intensity} color={color} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Symbols */}
          {data.symbols.length > 0 && (
            <View style={s.card}>
              <SectionHeader icon="💭" title="Semboller" color="#60A5FA" />
              <View style={s.symbolGrid}>
                {data.symbols.map((sym, i) => (
                  <View key={i} style={s.symbolCard}>
                    <Text style={s.symbolIcon}>{symIcon(sym.manifestation)}</Text>
                    <Text style={s.symbolName} numberOfLines={1}>{sym.manifestation}</Text>
                    <View style={s.confBar}>
                      <View style={[s.confFill, { width: `${sym.confidence}%` as `${number}%`, backgroundColor: '#60A5FA' }]} />
                    </View>
                    <Text style={s.confPct}>{sym.confidence}%</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Archetypes */}
          {data.archetypes.length > 0 && (
            <View style={s.card}>
              <SectionHeader icon="✦" title="Arketipler" color="#FBBF24" />
              {data.archetypes.map((arch, i) => {
                const meta = ARCHETYPE_META[arch];
                return (
                  <View key={i} style={[s.archRow, { borderColor: 'rgba(251,191,36,0.15)', backgroundColor: 'rgba(251,191,36,0.05)' }]}>
                    <Text style={s.archIcon}>{meta?.icon ?? '✦'}</Text>
                    <View style={s.archText}>
                      <Text style={[s.archName, { color: '#FBBF24' }]}>{meta?.label ?? arch}</Text>
                      {meta?.desc && <Text style={s.archDesc}>{meta.desc}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Themes */}
          {data.themes.length > 0 && (
            <View style={s.card}>
              <SectionHeader icon="🌙" title="Temalar" color="#A78BFA" />
              <View style={s.themeWrap}>
                {data.themes.map((t, i) => (
                  <View key={i} style={[s.themeChip, t.isPrimary && s.themeChipPrimary]}>
                    <Text style={[s.themeText, t.isPrimary && s.themeTextPrimary]}>{t.theme}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {data.analyzedAt && (
            <Text style={s.analyzedAt}>
              {new Date(data.analyzedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} tarihinde analiz edildi
            </Text>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, paddingHorizontal: 12 },
  titleLabel:  { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 1.5 },
  titleSub:    { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  headerRight: { width: 36, alignItems: 'flex-end' },
  liveTag:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  liveText:    { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textMuted, fontSize: 14, marginTop: 8 },
  emptyTitle:  { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 8 },
  emptyDesc:   { color: Colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },

  orbRow: { flexDirection: 'row', justifyContent: 'center', gap: 28, paddingVertical: 8 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipText:{ fontSize: 12, fontWeight: '600' },
  chipIcon:{ fontSize: 12 },

  card: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 12,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionIcon:   { fontSize: 14 },
  sectionTitle:  { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.5, textTransform: 'uppercase' },

  emotionRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emotionDot:   { width: 7, height: 7, borderRadius: 4 },
  emotionLabel: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500', flex: 1 },
  primaryTag:   { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  primaryTagText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  symbolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  symbolCard: {
    width: '29%', backgroundColor: 'rgba(96,165,250,0.06)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(96,165,250,0.2)',
    padding: 10, alignItems: 'center', gap: 4,
  },
  symbolIcon: { fontSize: 22 },
  symbolName: { fontSize: 10, color: Colors.textSecondary, fontWeight: '500', textAlign: 'center' },
  confBar:    { width: '100%', height: 3, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  confFill:   { height: '100%', borderRadius: 2 },
  confPct:    { fontSize: 9, color: '#60A5FA', fontWeight: '700' },

  archRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  archIcon:{ fontSize: 22, lineHeight: 26 },
  archText:{ flex: 1 },
  archName:{ fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  archDesc:{ fontSize: 12, color: Colors.textMuted, marginTop: 2, lineHeight: 17 },

  themeWrap:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeChip:        { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', backgroundColor: 'rgba(167,139,250,0.08)' },
  themeChipPrimary: { borderColor: 'rgba(167,139,250,0.6)', backgroundColor: 'rgba(167,139,250,0.18)' },
  themeText:        { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  themeTextPrimary: { color: '#A78BFA', fontWeight: '700' },

  analyzedAt: { fontSize: 10, color: Colors.textMuted, textAlign: 'center', marginTop: 4 },
});
