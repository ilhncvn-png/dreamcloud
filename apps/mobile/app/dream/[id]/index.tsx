import {
  Animated, Dimensions, Easing, FlatList, KeyboardAvoidingView,
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput,
  View, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useQuery, useInfiniteQuery, useMutation, useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getDream } from '@/api/dreams.api';
import { getDreamAnalysis } from '@/api/analysis.api';
import { getDreamMatches } from '@/api/matches.api';
import { getComments, createComment, deleteComment } from '@/api/comments.api';
import { Colors, CategoryColors } from '@/constants/colors';
import LikeSaveBar from '@/components/LikeSaveBar';
import Avatar from '@/components/Avatar';
import EmptyState from '@/components/EmptyState';
import { useAuthStore } from '@/store/auth.store';
import { BackIcon, CloseIcon, SendIcon, CommentIcon } from '@/design/icons';
import type { Comment } from '@/types/comment.types';
import type { DreamCategory } from '@/types/dream.types';
import type { DreamAnalysisResponse } from '@/types/analysis.types';
import type { DreamMatch } from '@/types/match.types';

const { width: W } = Dimensions.get('window');
const MAX_COMMENT = 500;

// ── Constants ─────────────────────────────────────────────────────────────────

const PARTICLE_COLOR: Record<DreamCategory, string> = {
  lucid:     '#A78BFA',
  nightmare: '#F87171',
  beautiful: '#FCD34D',
  normal:    '#60A5FA',
};

const CAT_LABEL: Record<DreamCategory, string> = {
  lucid: 'LUCİD', beautiful: 'GÜZEL', nightmare: 'KABUS', normal: 'RÜYA',
};

const EMOTION_META: Record<string, { label: string; color: string }> = {
  fear:           { label: 'Korku',       color: '#EF4444' },
  anxiety:        { label: 'Kaygı',       color: '#F87171' },
  dread:          { label: 'Tedirginlik', color: '#DC2626' },
  curiosity:      { label: 'Merak',       color: '#A78BFA' },
  wonder:         { label: 'Hayranlık',   color: '#8B5CF6' },
  awe:            { label: 'Huşu',        color: '#7C3AED' },
  sadness:        { label: 'Keder',       color: '#60A5FA' },
  grief:          { label: 'Yas',         color: '#3B82F6' },
  longing:        { label: 'Özlem',       color: '#93C5FD' },
  hope:           { label: 'Umut',        color: '#34D399' },
  joy:            { label: 'Sevinç',      color: '#FBBF24' },
  peace:          { label: 'Huzur',       color: '#22D3EE' },
  serenity:       { label: 'Sükunet',     color: '#06B6D4' },
  warmth:         { label: 'Sıcaklık',    color: '#F97316' },
  liberation:     { label: 'Özgürlük',    color: '#86EFAC' },
  unease:         { label: 'Huzursuzluk', color: '#FCD34D' },
  bittersweet:    { label: 'Tatlı-Acı',   color: '#C084FC' },
  clarity:        { label: 'Netlik',      color: '#67E8F9' },
  loneliness:     { label: 'Yalnızlık',   color: '#818CF8' },
  melancholy:     { label: 'Melankoli',   color: '#6D28D9' },
  nostalgia:      { label: 'Nostalji',    color: '#F472B6' },
  disorientation: { label: 'Yönsüzlük',  color: '#94A3B8' },
};

const INTENSITY_DOTS: Record<string, number> = {
  low: 1, moderate: 2, high: 3, intense: 4, overwhelming: 5,
};

const FALLBACK_EMOTIONS: Record<DreamCategory, Array<{ emotion: string; intensity: string; label: string }>> = {
  lucid: [
    { emotion: 'wonder', intensity: 'intense', label: 'Hayranlık' },
    { emotion: 'clarity', intensity: 'high', label: 'Netlik' },
    { emotion: 'curiosity', intensity: 'high', label: 'Merak' },
    { emotion: 'awe', intensity: 'moderate', label: 'Huşu' },
  ],
  beautiful: [
    { emotion: 'joy', intensity: 'intense', label: 'Sevinç' },
    { emotion: 'warmth', intensity: 'high', label: 'Sıcaklık' },
    { emotion: 'peace', intensity: 'high', label: 'Huzur' },
    { emotion: 'hope', intensity: 'moderate', label: 'Umut' },
  ],
  nightmare: [
    { emotion: 'fear', intensity: 'intense', label: 'Korku' },
    { emotion: 'anxiety', intensity: 'high', label: 'Kaygı' },
    { emotion: 'unease', intensity: 'high', label: 'Huzursuzluk' },
    { emotion: 'dread', intensity: 'moderate', label: 'Tedirginlik' },
  ],
  normal: [
    { emotion: 'curiosity', intensity: 'moderate', label: 'Merak' },
    { emotion: 'longing', intensity: 'moderate', label: 'Özlem' },
    { emotion: 'melancholy', intensity: 'low', label: 'Melankoli' },
    { emotion: 'nostalgia', intensity: 'moderate', label: 'Nostalji' },
  ],
};

const SYM_ICON: Record<string, string> = {
  threshold: '🚪', shadow: '🌑', flood: '🌊', guide: '🌟', flying: '🌤',
  transformation: '⚡', labyrinth: '🌀', fire: '🔥', mirror: '🪞', abyss: '🕳',
  falling: '💫', child: '🌱', palace: '🏰', ice: '❄', water: '💧',
  mountain: '⛰', bridge: '🌉', key: '🗝', wind: '💨', forest: '🌿',
  road: '🛤', eye: '👁', clock: '⏳', spiral: '🌀', tower: '🏰',
};

const ARCHETYPE_META: Record<string, { icon: string; label: string; desc: string }> = {
  shadow:     { icon: '🌑', label: 'Gölge',       desc: 'Kabul edilmemiş benlik yönleri yüzeye çıkıyor.' },
  guide:      { icon: '🌟', label: 'Rehber',       desc: 'İçsel bilgelik sembolik bir figürle konuşuyor.' },
  child:      { icon: '🌱', label: 'İç Çocuk',     desc: 'Masumiyet ve yeniden doğuş enerjisi.' },
  anima:      { icon: '🌙', label: 'Anima',        desc: 'Bilinçdışındaki dişil prensiplerin sesi.' },
  animus:     { icon: '☀️', label: 'Animus',       desc: 'Bilinçdışındaki eril prensiplerin sesi.' },
  hero:       { icon: '⚔️', label: 'Kahraman',     desc: 'Zorlukların üstesinden gelen benlik yönü.' },
  trickster:  { icon: '🃏', label: 'Şeytan Oğlan', desc: 'Düzeni bozan ve dönüştüren güç.' },
  wise_elder: { icon: '🦉', label: 'Bilge',        desc: 'Deneyim ve içgüdüsel bilgelik konuşuyor.' },
  explorer:   { icon: '🧭', label: 'Kaşif',        desc: 'Bilinmeyene atılım ve keşif dürtüsü.' },
  seeker:     { icon: '🔍', label: 'Arayan',       desc: 'Anlam ve gerçeği bulma arayışı.' },
  guardian:   { icon: '🛡', label: 'Bekçi',        desc: 'Koruma ve sınır koyma ihtiyacı.' },
  threshold:  { icon: '🚪', label: 'Eşik',         desc: 'Bir geçiş anının tam ortasındasın.' },
  flood:      { icon: '🌊', label: 'Sel',          desc: 'Bilinçdışının baskın gücü yüzeliyor.' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}
function formatCommentDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function resolveArchetype(a: DreamAnalysisResponse): typeof ARCHETYPE_META[string] | null {
  const fromFigure = a.figures
    .find(f => f.archetypeCandidate)?.archetypeCandidate?.toLowerCase().replace(/\s+/g, '_') ?? '';
  if (fromFigure && ARCHETYPE_META[fromFigure]) return ARCHETYPE_META[fromFigure]!;
  const fromSymbol = a.symbols
    .find(s => ARCHETYPE_META[s.symbolCategory.toLowerCase()])?.symbolCategory.toLowerCase() ?? '';
  if (fromSymbol && ARCHETYPE_META[fromSymbol]) return ARCHETYPE_META[fromSymbol]!;
  return null;
}

function buildInterpretation(a: DreamAnalysisResponse): string {
  const parts: string[] = [];
  if (a.primaryTheme) {
    parts.push(`Bu rüyada "${a.primaryTheme}" teması öne çıkıyor.`);
  }
  if (a.emotionalArc?.from && a.emotionalArc?.to) {
    parts.push(`Bilinçaltın ${a.emotionalArc.from}'dan ${a.emotionalArc.to}'a uzanan bir duygusal yolculuk yaşatıyor.`);
  }
  if (a.residualEmotion) {
    parts.push(`Bu rüya ardında ${a.residualEmotion} duygusu bırakıyor.`);
  }
  return parts.length > 0
    ? parts.join(' ')
    : 'Bu rüyada derin sembolik katmanlar tespit edildi.';
}

// ── Particle Field ─────────────────────────────────────────────────────────────

interface Particle {
  id: number;
  startX: number;
  startY: number;
  size: number;
  duration: number;
  delay: number;
  anim: Animated.Value;
}

function ParticleField({ category }: { category: DreamCategory }) {
  const color = PARTICLE_COLOR[category];

  const particles = useRef<Particle[]>(
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      startX: Math.random() * W,
      startY: 80 + Math.random() * 500,
      size: 1.5 + Math.random() * 2.5,
      duration: 14000 + Math.random() * 12000,
      delay: Math.random() * 12000,
      anim: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    const loops = particles.map(p => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.anim, {
            toValue: 1, duration: p.duration,
            easing: Easing.linear, useNativeDriver: true,
          }),
          Animated.timing(p.anim, {
            toValue: 0, duration: 0, useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return loop;
    });
    return () => loops.forEach(l => l.stop());
  }, [particles]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map(p => {
        const opacity = p.anim.interpolate({
          inputRange: [0, 0.06, 0.80, 1],
          outputRange: [0, 0.65, 0.25, 0],
        });
        const translateY = p.anim.interpolate({
          inputRange: [0, 1], outputRange: [0, -680],
        });
        return (
          <Animated.View
            key={p.id}
            style={{
              position: 'absolute',
              left: p.startX,
              top: p.startY,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: color,
              opacity,
              transform: [{ translateY }],
            }}
          />
        );
      })}
    </View>
  );
}

// ── Hero Section ──────────────────────────────────────────────────────────────

interface HeroProps {
  title: string | null;
  category: DreamCategory;
  createdAt: string;
  authorName: string;
  onAuthorPress: () => void;
}

function HeroSection({ title, category, createdAt, authorName, onAuthorPress }: HeroProps) {
  const { accent, text: catText } = CategoryColors[category];

  return (
    <View style={hero.wrap}>
      {/* category row */}
      <View style={hero.catRow}>
        <View style={[hero.catDot, { backgroundColor: accent }]} />
        <Text style={[hero.catLabel, { color: accent }]}>{CAT_LABEL[category]}</Text>
      </View>

      {/* title */}
      {title ? (
        <Text style={hero.title}>{title}</Text>
      ) : (
        <Text style={[hero.title, { color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }]}>
          Adsız Rüya
        </Text>
      )}

      {/* author + date */}
      <Pressable onPress={onAuthorPress} style={({ pressed }) => [hero.meta, { opacity: pressed ? 0.7 : 1 }]}>
        <Text style={hero.author}>@{authorName}</Text>
        <View style={hero.metaDot} />
        <Text style={hero.date}>{formatDate(createdAt)}</Text>
      </Pressable>

      {/* fade gradient at hero bottom */}
      <LinearGradient
        colors={['transparent', Colors.background] as const}
        style={hero.bottomFade}
        pointerEvents="none"
      />
    </View>
  );
}
const hero = StyleSheet.create({
  wrap:       { paddingTop: 64, paddingHorizontal: 28, paddingBottom: 80, gap: 16 },
  catRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot:     { width: 7, height: 7, borderRadius: 4 },
  catLabel:   { fontSize: 10, fontWeight: '900', letterSpacing: 2.5, opacity: 0.9 },
  title:      { fontSize: 34, fontWeight: '900', color: Colors.textPrimary, lineHeight: 42, letterSpacing: -0.8 },
  meta:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  author:     { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.45)' },
  metaDot:    { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)' },
  date:       { fontSize: 12, color: 'rgba(255,255,255,0.28)' },
  bottomFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 70 },
});

// ── Dream Body ────────────────────────────────────────────────────────────────

function DreamBody({ content }: { content: string }) {
  return (
    <View style={db.wrap}>
      {/* top emergence fade */}
      <LinearGradient
        colors={[Colors.background, 'transparent'] as const}
        style={db.topFade}
        pointerEvents="none"
      />
      <Text style={db.text}>{content}</Text>
    </View>
  );
}
const db = StyleSheet.create({
  wrap:    { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 32 },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 36, zIndex: 1 },
  text:    { fontSize: 17, color: 'rgba(255,255,255,0.68)', lineHeight: 30, fontWeight: '400', letterSpacing: 0.15 },
});

// ── Symbol Layer ──────────────────────────────────────────────────────────────

interface SymbolChip { key: string; icon: string; label: string }

function SymbolLayer({ symbols, tags, accent }: {
  symbols: DreamAnalysisResponse['symbols'] | undefined;
  tags: string[];
  accent: string;
}) {
  const chips: SymbolChip[] = [
    ...(symbols ?? []).slice(0, 4).map(s => ({
      key: s.symbolCategory,
      icon: SYM_ICON[s.symbolCategory] ?? '·',
      label: s.manifestation ?? s.symbolCategory,
    })),
    ...((symbols?.length ?? 0) < 2
      ? tags.filter(t => !t.includes(':')).slice(0, 3).map(t => ({ key: t, icon: '·', label: t }))
      : []),
  ].slice(0, 5);

  if (chips.length === 0) return null;

  return (
    <View style={sl.wrap}>
      <Text style={sl.sectionLabel}>SEMBOLLER</Text>
      <View style={sl.chips}>
        {chips.map(c => (
          <View key={c.key} style={[sl.chip, { borderColor: `${accent}40` }]}>
            <Text style={sl.chipIcon}>{c.icon}</Text>
            <Text style={[sl.chipText, { color: `${accent}DD` }]}>{c.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const sl = StyleSheet.create({
  wrap:         { paddingHorizontal: 28, paddingBottom: 28 },
  sectionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2.5, color: 'rgba(255,255,255,0.20)', marginBottom: 14 },
  chips:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
  chipIcon:     { fontSize: 16 },
  chipText:     { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },
});

// ── Emotion Spectrum ──────────────────────────────────────────────────────────

function DotMeter({ filled, color }: { filled: number; color: string }) {
  return (
    <View style={em.dots}>
      {[1, 2, 3, 4, 5].map(i => (
        <View
          key={i}
          style={[em.dot, i <= filled ? { backgroundColor: color, opacity: 0.85 } : em.dotEmpty]}
        />
      ))}
    </View>
  );
}

function EmotionSpectrum({ emotions, category }: {
  emotions: DreamAnalysisResponse['emotions'] | undefined;
  category: DreamCategory;
}) {
  const rows = emotions && emotions.length > 0
    ? [...emotions]
        .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
        .slice(0, 4)
        .map(e => ({
          key: e.emotion,
          label: EMOTION_META[e.emotion]?.label ?? e.emotion,
          color: EMOTION_META[e.emotion]?.color ?? Colors.primary,
          dots:  INTENSITY_DOTS[e.intensity] ?? 2,
          primary: e.isPrimary,
        }))
    : FALLBACK_EMOTIONS[category].map(e => ({
        key:   e.emotion,
        label: e.label,
        color: EMOTION_META[e.emotion]?.color ?? Colors.primary,
        dots:  INTENSITY_DOTS[e.intensity] ?? 2,
        primary: false,
      }));

  return (
    <View style={em.wrap}>
      <Text style={em.sectionLabel}>DUYGU SPEKTRUMU</Text>
      <View style={em.rows}>
        {rows.map(r => (
          <View key={r.key} style={em.row}>
            <Text style={[em.label, r.primary && em.labelPrimary]}>{r.label}</Text>
            <DotMeter filled={r.dots} color={r.color} />
          </View>
        ))}
      </View>
    </View>
  );
}
const em = StyleSheet.create({
  wrap:         { paddingHorizontal: 28, paddingBottom: 28 },
  sectionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2.5, color: 'rgba(255,255,255,0.20)', marginBottom: 16 },
  rows:         { gap: 14 },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 16 },
  label:        { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.38)', width: 100 },
  labelPrimary: { color: 'rgba(255,255,255,0.70)', fontWeight: '800' },
  dots:         { flexDirection: 'row', gap: 6 },
  dot:          { width: 9, height: 9, borderRadius: 5 },
  dotEmpty:     { width: 9, height: 9, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.10)' },
});

// ── Collective Resonance ──────────────────────────────────────────────────────

function ResonanceBanner({ likeCount, matchCount, analysis }: {
  likeCount: number;
  matchCount: number;
  analysis: DreamAnalysisResponse | undefined;
}) {
  const total = likeCount + matchCount;
  if (total === 0 && !analysis) return null;

  const dominantTheme  = analysis?.primaryTheme;
  const topSymbol      = analysis?.symbols?.[0]?.manifestation ?? analysis?.symbols?.[0]?.symbolCategory;
  const emotionOverlap = analysis?.primaryEmotion;

  return (
    <View style={res.wrap}>
      <View style={res.pulse} />
      <View style={res.content}>
        {total > 0 && (
          <Text style={res.headline}>
            {matchCount > 0
              ? `${matchCount} rüyacı benzer semboller gördü`
              : `${likeCount} rüyacı bu rüyada yankı buldu`}
          </Text>
        )}
        <View style={res.tags}>
          {dominantTheme && (
            <View style={res.tag}>
              <Text style={res.tagLabel}>Baskın Tema</Text>
              <Text style={res.tagValue}>{dominantTheme}</Text>
            </View>
          )}
          {topSymbol && (
            <View style={res.tag}>
              <Text style={res.tagLabel}>Tekrarlayan Sembol</Text>
              <Text style={res.tagValue}>{topSymbol}</Text>
            </View>
          )}
          {emotionOverlap && (
            <View style={res.tag}>
              <Text style={res.tagLabel}>Duygusal Örtüşme</Text>
              <Text style={res.tagValue}>{EMOTION_META[emotionOverlap]?.label ?? emotionOverlap}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
const res = StyleSheet.create({
  wrap:      { marginHorizontal: 28, marginBottom: 24, padding: 18, borderRadius: 18, backgroundColor: 'rgba(108,99,255,0.07)', borderWidth: 1, borderColor: 'rgba(108,99,255,0.20)', flexDirection: 'row', gap: 14 },
  pulse:     { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 4, opacity: 0.8 },
  content:   { flex: 1, gap: 12 },
  headline:  { fontSize: 14, fontWeight: '700', color: 'rgba(196,181,253,0.80)', lineHeight: 20 },
  tags:      { gap: 8 },
  tag:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagLabel:  { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.25)', letterSpacing: 0.3 },
  tagValue:  { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.55)' },
});

// ── AI Interpretation ─────────────────────────────────────────────────────────

function AIInterpretation({ analysis, isLoading }: {
  analysis: DreamAnalysisResponse | undefined;
  isLoading: boolean;
}) {
  return (
    <View style={ai.wrap}>
      <View style={ai.header}>
        <Ionicons name="sparkles-outline" size={12} color="rgba(167,139,250,0.7)" />
        <Text style={ai.sectionLabel}>RÜYA YORUMU</Text>
      </View>

      {isLoading ? (
        <View style={ai.pending}>
          <ActivityIndicator size="small" color={Colors.primary} style={{ opacity: 0.5 }} />
          <Text style={ai.pendingText}>Bilinçaltı analiz ediliyor…</Text>
        </View>
      ) : analysis && analysis.status === 'completed' ? (
        <>
          <Text style={ai.body}>{buildInterpretation(analysis)}</Text>
          {analysis.themes.filter(t => !t.isPrimary).slice(0, 2).map(t => (
            <View key={t.theme} style={ai.themeRow}>
              <View style={ai.themeDot} />
              <Text style={ai.themeText}>{t.theme}</Text>
              <Text style={ai.conf}>{Math.round(t.confidence * 100)}%</Text>
            </View>
          ))}
        </>
      ) : (
        <Text style={ai.pendingText}>Bu rüya için henüz yorum oluşturulmadı.</Text>
      )}
    </View>
  );
}
const ai = StyleSheet.create({
  wrap:        { marginHorizontal: 28, marginBottom: 20, padding: 20, borderRadius: 18, backgroundColor: '#06041C', borderWidth: 1, borderColor: 'rgba(167,139,250,0.12)', gap: 14 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionLabel:{ fontSize: 9, fontWeight: '900', letterSpacing: 2.5, color: 'rgba(167,139,250,0.50)' },
  body:        { fontSize: 15, color: 'rgba(255,255,255,0.58)', lineHeight: 24, fontStyle: 'italic' },
  themeRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  themeDot:    { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(167,139,250,0.35)' },
  themeText:   { fontSize: 12, color: 'rgba(255,255,255,0.32)', fontWeight: '600', flex: 1 },
  conf:        { fontSize: 10, color: 'rgba(167,139,250,0.40)', fontWeight: '700' },
  pending:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pendingText: { fontSize: 13, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' },
});

// ── Dominant Archetype ────────────────────────────────────────────────────────

function ArchetypeCard({ analysis, accent }: {
  analysis: DreamAnalysisResponse | undefined;
  accent: string;
}) {
  if (!analysis) return null;
  const arch = resolveArchetype(analysis);
  if (!arch) return null;

  return (
    <View style={[arc.wrap, { borderColor: `${accent}25` }]}>
      <Text style={arc.sectionLabel}>HAKİM ARKETİP</Text>
      <View style={arc.row}>
        <Text style={arc.icon}>{arch.icon}</Text>
        <View style={arc.info}>
          <Text style={[arc.name, { color: accent }]}>{arch.label}</Text>
          <Text style={arc.desc}>{arch.desc}</Text>
        </View>
      </View>
    </View>
  );
}
const arc = StyleSheet.create({
  wrap:         { marginHorizontal: 28, marginBottom: 20, padding: 18, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, gap: 12 },
  sectionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2.5, color: 'rgba(255,255,255,0.20)' },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 16 },
  icon:         { fontSize: 32 },
  info:         { flex: 1, gap: 5 },
  name:         { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  desc:         { fontSize: 13, color: 'rgba(255,255,255,0.40)', lineHeight: 19 },
});

// ── Nearby Minds ──────────────────────────────────────────────────────────────

function NearbyMinds({ matches }: { matches: DreamMatch[] }) {
  const router = useRouter();
  const unique = matches
    .filter((m, i, arr) => arr.findIndex(x => x.matchingUserId === m.matchingUserId) === i)
    .slice(0, 5);

  if (unique.length === 0) return null;

  return (
    <View style={nm.wrap}>
      <Text style={nm.sectionLabel}>YAKINDAKI BİLİNÇLER</Text>
      <View style={nm.list}>
        {unique.map(m => {
          const pct   = Math.round(m.matchScore);
          const name  = m.matchingUserDisplayName ?? m.matchingUserUsername;
          const barW  = Math.max(12, (pct / 100) * (W - 56 - 120 - 52));
          return (
            <Pressable
              key={m.matchingUserId}
              style={({ pressed }) => [nm.row, { opacity: pressed ? 0.75 : 1 }]}
              onPress={() => router.push(`/user/${m.matchingUserId}`)}
            >
              <Avatar name={name} size={36} />
              <View style={nm.nameCol}>
                <Text style={nm.displayName} numberOfLines={1}>{name}</Text>
                <Text style={nm.username}>@{m.matchingUserUsername}</Text>
              </View>
              <View style={nm.meter}>
                <View style={[nm.meterBar, { width: barW }]} />
              </View>
              <Text style={nm.pct}>{pct}%</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
const nm = StyleSheet.create({
  wrap:         { paddingHorizontal: 28, marginBottom: 24 },
  sectionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2.5, color: 'rgba(255,255,255,0.20)', marginBottom: 16 },
  list:         { gap: 14 },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameCol:      { width: 100, gap: 2 },
  displayName:  { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  username:     { fontSize: 10, color: Colors.textMuted },
  meter:        { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  meterBar:     { height: 3, backgroundColor: Colors.primary, borderRadius: 2, opacity: 0.7 },
  pct:          { fontSize: 13, fontWeight: '800', color: Colors.primary, minWidth: 40, textAlign: 'right' },
});

// ── Similar Dreams ────────────────────────────────────────────────────────────

function SimilarDreamCards({ matches }: { matches: DreamMatch[] }) {
  const router = useRouter();
  if (matches.length === 0) return null;

  return (
    <View style={sd.wrap}>
      <Text style={sd.sectionLabel}>BENZER RÜYALAR</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={sd.scroll}
      >
        {matches.map(m => {
          const excerpt = m.matchingDreamTitle ?? m.matchingDreamContent;
          const pct     = Math.round(m.matchScore);
          return (
            <Pressable
              key={m.id}
              style={({ pressed }) => [sd.card, { opacity: pressed ? 0.80 : 1 }]}
              onPress={() => router.push(`/dream/${m.matchingDreamId}`)}
            >
              {/* score badge */}
              <View style={sd.badge}>
                <Text style={sd.badgeText}>{pct}</Text>
                <Text style={sd.badgeUnit}>%</Text>
              </View>

              {/* excerpt */}
              <Text style={sd.excerpt} numberOfLines={3}>{excerpt}</Text>

              {/* shared symbols */}
              {m.sharedSymbols.length > 0 && (
                <View style={sd.symRow}>
                  {m.sharedSymbols.slice(0, 3).map(s => (
                    <View key={s} style={sd.symChip}>
                      <Text style={sd.symText}>{s}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* author */}
              <Text style={sd.author}>@{m.matchingUserUsername}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
const sd = StyleSheet.create({
  wrap:         { marginBottom: 24 },
  sectionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2.5, color: 'rgba(255,255,255,0.20)', marginBottom: 16, paddingHorizontal: 28 },
  scroll:       { paddingHorizontal: 28, gap: 12 },
  card:         { width: 210, padding: 16, borderRadius: 18, backgroundColor: '#06041C', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 10 },
  badge:        { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  badgeText:    { fontSize: 22, fontWeight: '900', color: Colors.primary },
  badgeUnit:    { fontSize: 11, fontWeight: '700', color: Colors.primary, opacity: 0.7 },
  excerpt:      { fontSize: 13, color: 'rgba(255,255,255,0.48)', lineHeight: 20 },
  symRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  symChip:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(108,99,255,0.12)', borderWidth: 1, borderColor: 'rgba(108,99,255,0.25)' },
  symText:      { fontSize: 9, fontWeight: '700', color: Colors.primary },
  author:       { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
});

// ── Comment Item ──────────────────────────────────────────────────────────────

function CommentItem({ comment, onDelete }: { comment: Comment; onDelete: (id: string) => void }) {
  return (
    <View style={cm.item}>
      <Avatar name={comment.author.username} size={32} />
      <View style={cm.body}>
        <View style={cm.header}>
          <Text style={cm.username}>@{comment.author.username}</Text>
          <Text style={cm.date}>{formatCommentDate(comment.createdAt)}</Text>
        </View>
        <Text style={cm.content}>{comment.content}</Text>
      </View>
      {comment.isOwn && (
        <Pressable
          onPress={() => Alert.alert('Yorumu Sil', 'Bu yorumu silmek istediğine emin misin?', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Sil', style: 'destructive', onPress: () => onDelete(comment.id) },
          ])}
          hitSlop={16}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 8 })}
        >
          <CloseIcon size={13} color={Colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}
const cm = StyleSheet.create({
  item:     { flexDirection: 'row', gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border, alignItems: 'flex-start', paddingHorizontal: 28 },
  body:     { flex: 1, gap: 4 },
  header:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  username: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  date:     { fontSize: 10, color: Colors.textMuted },
  content:  { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function DreamDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const qc       = useQueryClient();
  const { user } = useAuthStore();
  const insets   = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back(); else router.replace('/(tabs)');
  }, [router]);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: dream, isLoading, isError } = useQuery({
    queryKey: ['dream', id],
    queryFn:  () => getDream(id),
    enabled:  !!id,
  });

  const { data: analysis, isLoading: analysisLoading } = useQuery({
    queryKey:  ['dream-analysis', id],
    queryFn:   () => getDreamAnalysis(id),
    enabled:   !!id && !!dream,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: matchesData } = useQuery({
    queryKey:  ['dream-matches', id],
    queryFn:   () => getDreamMatches(id, { limit: 6 }),
    enabled:   !!id && !!dream,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const {
    data: commentsData, isLoading: commentsLoading,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey:         ['comments', id],
    queryFn:          ({ pageParam = 1 }) => getComments(id, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) => last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined,
    enabled: !!id,
  });

  const allComments   = commentsData?.pages.flatMap(p => p.items) ?? [];
  const totalComments = commentsData?.pages[0]?.meta.total ?? dream?.commentCount ?? 0;
  const topMatches    = matchesData?.items ?? [];
  const matchTotal    = matchesData?.meta.total ?? 0;

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addMutation = useMutation({
    mutationFn: (content: string) => createComment(id, content),
    onSuccess: (newComment) => {
      qc.setQueryData(['comments', id], (old: typeof commentsData) => {
        if (!old) return old;
        const first = old.pages[0];
        if (!first) return old;
        return {
          ...old,
          pages: [
            { ...first, items: [newComment, ...first.items], meta: { ...first.meta, total: first.meta.total + 1 } },
            ...old.pages.slice(1),
          ],
        };
      });
      qc.setQueryData(['dream', id], (old: typeof dream) =>
        old ? { ...old, commentCount: (old.commentCount ?? 0) + 1 } : old);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (cid: string) => deleteComment(id, cid),
    onSuccess: (_d, cid) => {
      qc.setQueryData(['comments', id], (old: typeof commentsData) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map(p => ({
            ...p,
            items: p.items.filter(c => c.id !== cid),
            meta:  { ...p.meta, total: Math.max(0, p.meta.total - 1) },
          })),
        };
      });
      qc.setQueryData(['dream', id], (old: typeof dream) =>
        old ? { ...old, commentCount: Math.max(0, (old.commentCount ?? 1) - 1) } : old);
    },
  });

  function handleSubmit() {
    const text = inputText.trim();
    if (!text || addMutation.isPending) return;
    setInputText('');
    inputRef.current?.blur();
    addMutation.mutate(text);
  }

  // ── List header ───────────────────────────────────────────────────────────

  function ListHeader() {
    if (!dream) return null;
    const { accent } = CategoryColors[dream.category];
    const authorName = dream.author?.username ?? 'Anonim';
    const authorId   = dream.author?.id ?? dream.userId;

    return (
      <View>
        <HeroSection
          title={dream.title}
          category={dream.category}
          createdAt={dream.createdAt}
          authorName={authorName}
          onAuthorPress={() => { if (authorId) router.push(`/user/${authorId}`); }}
        />

        <DreamBody content={dream.content} />

        <SymbolLayer
          symbols={analysis?.symbols}
          tags={dream.tags}
          accent={accent}
        />

        <EmotionSpectrum
          emotions={analysis?.emotions}
          category={dream.category}
        />

        <ResonanceBanner
          likeCount={dream.likeCount}
          matchCount={matchTotal}
          analysis={analysis}
        />

        {/* Like / Save */}
        <View style={{ paddingHorizontal: 28, paddingBottom: 24 }}>
          <LikeSaveBar dream={dream} queryKey={['dream', id]} />
        </View>

        <AIInterpretation analysis={analysis} isLoading={analysisLoading} />

        <ArchetypeCard analysis={analysis} accent={accent} />

        <NearbyMinds matches={topMatches} />

        <SimilarDreamCards matches={topMatches} />

        {/* Comments header */}
        <View style={s.divider} />
        <View style={s.commentsHeader}>
          <Text style={s.commentsTitle}>Yorumlar</Text>
          {totalComments > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{totalComments}</Text>
            </View>
          )}
        </View>
        {commentsLoading && (
          <ActivityIndicator size="small" color={Colors.primary} style={s.loader} />
        )}
      </View>
    );
  }

  function ListFooter() {
    return (
      <View>
        {isFetchingNextPage && (
          <ActivityIndicator size="small" color={Colors.primary} style={s.loader} />
        )}
        {hasNextPage && !isFetchingNextPage && (
          <Pressable
            style={({ pressed }) => [s.loadMore, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => { void fetchNextPage(); }}
          >
            <Text style={s.loadMoreText}>Daha fazla yorum</Text>
          </Pressable>
        )}
        <View style={{ height: 80 }} />
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* Atmospheric particles — full screen, behind everything */}
      {dream && <ParticleField category={dream.category} />}

      {/* Floating back button — above scroll, pinned below the status bar */}
      <View style={[s.navBar, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [s.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={goBack}
          hitSlop={8}
        >
          <BackIcon size={20} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Loading state */}
      {isLoading && (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      {/* Error state */}
      {isError && (
        <View style={s.centered}>
          <Text style={s.errorText}>Rüya bulunamadı</Text>
          <Pressable
            style={({ pressed }) => [s.retryBtn, { opacity: pressed ? 0.75 : 1 }]}
            onPress={goBack}
          >
            <Text style={s.retryText}>Geri Dön</Text>
          </Pressable>
        </View>
      )}

      {/* Main content */}
      {dream && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <FlatList
            data={allComments}
            keyExtractor={c => c.id}
            renderItem={({ item }) => (
              <CommentItem
                comment={item}
                onDelete={cid => deleteMutation.mutate(cid)}
              />
            )}
            ListHeaderComponent={<ListHeader />}
            ListFooterComponent={<ListFooter />}
            ListEmptyComponent={
              !commentsLoading ? (
                <View style={{ paddingHorizontal: 28 }}>
                  <EmptyState
                    icon={<CommentIcon size={40} color={Colors.textMuted} />}
                    title="Henüz yorum yok"
                    subtitle="Bu rüyaya ilk yorumu sen yap"
                  />
                </View>
              ) : null
            }
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />

          {/* Comment input */}
          {user && (
            <View style={s.inputBar}>
              <Avatar name={user.email ?? 'U'} size={30} />
              <View style={{ flex: 1 }}>
                <TextInput
                  ref={inputRef}
                  style={s.textInput}
                  placeholder="Yorum yaz…"
                  placeholderTextColor={Colors.textMuted}
                  value={inputText}
                  onChangeText={v => setInputText(v.slice(0, MAX_COMMENT))}
                  multiline
                  maxLength={MAX_COMMENT}
                  returnKeyType="send"
                  submitBehavior="newline"
                />
                {inputText.length > MAX_COMMENT * 0.8 && (
                  <Text style={s.charCount}>{inputText.length}/{MAX_COMMENT}</Text>
                )}
              </View>
              <Pressable
                style={({ pressed }) => [
                  s.sendBtn,
                  {
                    opacity: pressed || !inputText.trim() || addMutation.isPending ? 0.45 : 1,
                    backgroundColor: inputText.trim() ? Colors.primary : Colors.surfaceHigh,
                  },
                ]}
                onPress={handleSubmit}
                disabled={!inputText.trim() || addMutation.isPending}
                hitSlop={4}
              >
                {addMutation.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <SendIcon size={16} color="#fff" />}
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  centered:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  errorText:     { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  retryBtn:      { paddingHorizontal: 24, paddingVertical: 11, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  retryText:     { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  navBar:        { position: 'absolute', left: 0, right: 0, paddingLeft: 16, zIndex: 100 },
  backBtn:       { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(15,15,35,0.70)' },

  scrollContent: { paddingBottom: 20 },

  divider:        { height: 1, backgroundColor: Colors.border, marginHorizontal: 28, marginTop: 8, marginBottom: 20 },
  commentsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 28, marginBottom: 6 },
  commentsTitle:  { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  badge:          { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, backgroundColor: Colors.primaryGlow, borderWidth: 1, borderColor: Colors.primary },
  badgeText:      { fontSize: 11, fontWeight: '800', color: Colors.primary },
  loader:         { paddingVertical: 16 },
  loadMore:       { alignItems: 'center', paddingVertical: 14 },
  loadMoreText:   { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  inputBar:  { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
  textInput: { backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary, maxHeight: 100 },
  charCount: { fontSize: 10, color: Colors.textMuted, textAlign: 'right', marginTop: 3, marginRight: 4 },
  sendBtn:   { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
});
