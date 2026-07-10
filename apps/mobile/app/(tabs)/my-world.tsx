import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getMyIdentity } from '@/api/identity.api';
import { getMyMatches } from '@/api/matches.api';
import { getMyDreams } from '@/api/dreams.api';
import { getMyProfile } from '@/api/users.api';
import { getUnreadCount } from '@/api/notifications.api';
import { getMyMentionStats } from '@/api/mentions.api';
import Avatar from '@/components/Avatar';
import type { DreamIdentity } from '@/types/identity.types';
import type { Dream } from '@/types/dream.types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ── Dimensions ────────────────────────────────────────────────────────────────

const { width: W } = Dimensions.get('window');
const PAD = 20;

// ── Label maps ────────────────────────────────────────────────────────────────

const MONTH_FULL = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const THEME_TR: Record<string, string> = {
  pursuit: 'Takip', threshold: 'Eşik', flying: 'Uçuş', transformation: 'Dönüşüm',
  reunion: 'Kavuşma', loss: 'Kayıp', chase: 'Kovalanma', falling: 'Düşme',
  water: 'Su', fire: 'Ateş', descent: 'İniş', ascent: 'Yükseliş', school: 'Okul',
  death: 'Ölüm', birth: 'Doğum', journey: 'Yolculuk', entrapment: 'Sıkışma',
  discovery: 'Keşif', confrontation: 'Yüzleşme', protection: 'Koruma', exposure: 'Açığa Çıkma',
};

const EMOTION_TR: Record<string, string> = {
  fear: 'Korku', joy: 'Sevinç', peace: 'Huzur', loneliness: 'Yalnızlık',
  wonder: 'Merak', sadness: 'Hüzün', anger: 'Öfke', nostalgia: 'Özlem',
  love: 'Aşk', anxiety: 'Kaygı', excitement: 'Heyecan', grief: 'Yas',
  confusion: 'Karmaşa', calm: 'Sükunet', awe: 'Hayranlık', dread: 'Tedirginlik',
  serenity: 'Dinginlik',
};

const SYMBOL_TR: Record<string, string> = {
  threshold: 'Eşik', shadow: 'Gölge', flood: 'Sel', abyss: 'Uçurum',
  guide: 'Rehber', labyrinth: 'Labirent', door: 'Kapı', mirror_self: 'Ayna',
  tree: 'Ağaç', water: 'Su', key: 'Anahtar', light: 'Işık', fire: 'Ateş',
  flying: 'Uçuş', falling: 'Düşüş', sea: 'Deniz', old_house: 'Eski Ev',
  animal: 'Hayvan', child: 'Çocuk', chase: 'Takip', vehicle: 'Araç',
  transformation: 'Dönüşüm',
};

const SYM_EMOJI: Record<string, string> = {
  threshold: '🚪', shadow: '🌑', flood: '🌊', abyss: '🕳',
  guide: '🌟', labyrinth: '🌀', door: '🚪', mirror_self: '🪞',
  tree: '🌳', water: '💧', key: '🗝', light: '✨', fire: '🔥',
  flying: '🌤', falling: '💫', sea: '🌊', old_house: '🏠',
  animal: '🦁', child: '🌱', chase: '🏃', vehicle: '🚂',
  transformation: '⚡',
};

const EMOTION_COLOR: Record<string, string> = {
  fear: '#F87171', joy: '#34D399', peace: '#60A5FA', loneliness: '#818CF8',
  wonder: '#A78BFA', sadness: '#6366F1', anger: '#EF4444', nostalgia: '#C084FC',
  love: '#F472B6', anxiety: '#FB923C', excitement: '#FBBF24', grief: '#94A3B8',
  confusion: '#64748B', calm: '#6EE7B7', awe: '#818CF8', dread: '#B91C1C',
  serenity: '#BAE6FD',
};

const ARCHETYPE_EMOJI: Record<string, string> = {
  shadow: '🌑', anima: '🌙', animus: '☀️', wise_elder: '🦉',
  trickster: '🃏', guide: '🌟', hero: '⚔️', child: '🌱',
  great_mother: '🌊', explorer: '🧭', guardian: '🛡',
};

const CAT_COLOR: Record<string, string> = {
  nightmare: '#F87171', lucid: '#60A5FA', beautiful: '#34D399', normal: '#A78BFA',
};

const CAT_PHASE: Record<string, string> = {
  nightmare: 'Karanlık', lucid: 'Farkındalık', beautiful: 'Huzur', normal: 'Keşif',
};

const CAT_ICON: Record<string, string> = {
  nightmare: '🌑', lucid: '✨', beautiful: '🌸', normal: '🌙',
};

function tl(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}

// ── Level system ──────────────────────────────────────────────────────────────

const LEVELS = [
  { max: 4,        name: 'Tomurcuk', color: '#60A5FA' },
  { max: 9,        name: 'Uyanık',   color: '#34D399' },
  { max: 19,       name: 'Gezgin',   color: '#A78BFA' },
  { max: 49,       name: 'Kaşif',    color: '#F472B6' },
  { max: 99,       name: 'Bilge',    color: '#FBBF24' },
  { max: 199,      name: 'Arif',     color: '#FB923C' },
  { max: Infinity, name: 'Kolektif', color: '#EF4444' },
];

function resolveLevel(dreamCount: number) {
  const idx  = LEVELS.findIndex(l => dreamCount <= l.max);
  const safe = Math.max(0, idx);
  const lv   = LEVELS[safe]!;
  const prev = safe > 0 ? LEVELS[safe - 1]! : null;
  const lo   = prev ? prev.max + 1 : 0;
  const hi   = lv.max === Infinity ? lo + 49 : lv.max;
  const progress = Math.min(1, (dreamCount - lo) / Math.max(1, hi - lo));
  const toNext   = lv.max === Infinity ? 0 : lv.max + 1 - dreamCount;
  return { number: safe + 1, name: lv.name, color: lv.color, progress, toNext };
}

// ── Data helpers ──────────────────────────────────────────────────────────────

function computeStreak(dreams: Dream[]): number {
  if (!dreams.length) return 0;
  const days   = [...new Set(dreams.map(d => d.createdAt.slice(0, 10)))].sort().reverse();
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  for (let i = 0; i < days.length; i++) {
    const exp = new Date(today);
    exp.setDate(today.getDate() - i);
    if (days[i] === exp.toISOString().slice(0, 10)) streak++;
    else break;
  }
  return streak;
}

function buildCalendarDays(dreams: Dream[]): { date: string; cat: string | null }[] {
  const map = new Map<string, string>();
  for (const d of dreams) {
    const date = d.createdAt.slice(0, 10);
    if (!map.has(date)) map.set(date, d.category);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 35 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (34 - i));
    const date = d.toISOString().slice(0, 10);
    return { date, cat: map.get(date) ?? null };
  });
}

function buildAIReflection(identity: DreamIdentity): string {
  const sym1 = identity.dominantSymbols?.[0];
  const sym2 = identity.dominantSymbols?.[1];
  const em1  = identity.dominantEmotions?.[0];
  const em2  = identity.dominantEmotions?.[1];
  const thm1 = identity.dominantThemes?.[0];
  const thm2 = identity.dominantThemes?.[1];
  const arch = identity.primaryArchetypeName;

  const parts: string[] = [];
  if (sym1 && sym2)
    parts.push(`"${tl(SYMBOL_TR, sym1)}" ve "${tl(SYMBOL_TR, sym2)}" sembolleri bilinçaltında baskın olmaya devam ediyor.`);
  else if (sym1)
    parts.push(`"${tl(SYMBOL_TR, sym1)}" sembolü bilinçaltında defalarca yüzeye çıkıyor.`);

  if (thm1 && thm2)
    parts.push(`"${tl(THEME_TR, thm1)}"dan "${tl(THEME_TR, thm2)}"ye doğru bir dönüşüm gözlemleniyor.`);
  else if (thm1)
    parts.push(`"${tl(THEME_TR, thm1)}" teması bilinçaltındaki ana anlatıyı oluşturuyor.`);

  if (em1 && em2)
    parts.push(`"${tl(EMOTION_TR, em1)}" ve "${tl(EMOTION_TR, em2)}" duyguları rüya yaşamını şekillendiriyor.`);
  else if (em1)
    parts.push(`"${tl(EMOTION_TR, em1)}" duygusu rüyalarda belirleyici izler bırakıyor.`);

  if (arch)
    parts.push(`${arch} arketipinin enerjisi bu örüntülerde kendini güçlü biçimde gösteriyor.`);

  return parts.length > 0 ? parts.join(' ') : (identity.personalitySummary ?? '');
}

// ── S0: Ambient background ────────────────────────────────────────────────────

function AmbientField() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const lp = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 11000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 11000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    lp.start();
    return () => lp.stop();
  }, [pulse]);

  const op1 = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.08] });
  const op2 = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.02, 0.05] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[amb.orb1, { opacity: op1 }]} />
      <Animated.View style={[amb.orb2, { opacity: op2 }]} />
    </View>
  );
}
const amb = StyleSheet.create({
  orb1: { position: 'absolute', width: W * 1.2, height: W * 1.2, borderRadius: W * 0.6, top: -W * 0.3, left: -W * 0.1, backgroundColor: '#6C63FF' },
  orb2: { position: 'absolute', width: W * 0.8, height: W * 0.8, borderRadius: W * 0.4, top: W * 0.6, right: -W * 0.3, backgroundColor: '#A78BFA' },
});

// ── S1: Consciousness Identity ────────────────────────────────────────────────

function ConsciousnessIdentity({ identity }: { identity: DreamIdentity }) {
  const em1  = identity.dominantEmotions?.[0];
  const sym1 = identity.dominantSymbols?.[0];

  return (
    <View style={ci.wrap}>
      <Text style={ci.eyebrow}>BİLİNÇ KİMLİĞİM</Text>

      {/* Archetype hero */}
      <View style={ci.heroRow}>
        <View style={ci.glyphBox}>
          <View style={ci.glyphGlow} />
          <Text style={ci.glyph}>{identity.primaryArchetypeEmoji}</Text>
        </View>
        <View style={ci.heroText}>
          <Text style={ci.archName}>{identity.primaryArchetypeName.toUpperCase()}</Text>
          {identity.secondaryArchetypeName && (
            <Text style={ci.secondaryArch}>
              {identity.secondaryArchetypeEmoji}  {identity.secondaryArchetypeName}
            </Text>
          )}
        </View>
      </View>

      {/* Identity sentence */}
      <Text style={ci.summary}>{identity.personalitySummary}</Text>

      {/* Dominant signals */}
      <View style={ci.signals}>
        {em1 && (
          <View style={ci.sigChip}>
            <View style={[ci.sigDot, { backgroundColor: EMOTION_COLOR[em1] ?? '#A78BFA' }]} />
            <Text style={ci.sigLabel}>{tl(EMOTION_TR, em1)}</Text>
          </View>
        )}
        {sym1 && (
          <View style={ci.sigChip}>
            <Text style={ci.sigEmoji}>{SYM_EMOJI[sym1] ?? '·'}</Text>
            <Text style={ci.sigLabel}>{tl(SYMBOL_TR, sym1)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
const ci = StyleSheet.create({
  wrap:        { paddingHorizontal: PAD, paddingTop: 8, paddingBottom: 32, gap: 22 },
  eyebrow:     { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.5, color: 'rgba(167,139,250,0.45)' },
  heroRow:     { flexDirection: 'row', alignItems: 'center', gap: 20 },
  glyphBox:    { width: 84, height: 84, borderRadius: 24, backgroundColor: 'rgba(167,139,250,0.08)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.22)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glyphGlow:   { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(167,139,250,0.10)', top: -20, left: -10 },
  glyph:       { fontSize: 42, lineHeight: 50 },
  heroText:    { flex: 1, gap: 6 },
  archName:    { fontSize: 30, fontWeight: '900', color: 'rgba(255,255,255,0.94)', letterSpacing: -0.5, lineHeight: 34 },
  secondaryArch:{ fontSize: 13, color: 'rgba(255,255,255,0.32)', fontWeight: '600' },
  summary:     { fontSize: 15, color: 'rgba(255,255,255,0.52)', lineHeight: 23, fontStyle: 'italic', borderLeftWidth: 2, borderLeftColor: 'rgba(167,139,250,0.30)', paddingLeft: 14 },
  signals:     { flexDirection: 'row', gap: 10 },
  sigChip:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  sigDot:      { width: 6, height: 6, borderRadius: 3 },
  sigEmoji:    { fontSize: 14 },
  sigLabel:    { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.60)' },
});

// ── S2: Dream Statistics ──────────────────────────────────────────────────────

function StatOrb({ value, label, color, icon, index }: {
  value: string; label: string; color: string; icon: string; index: number;
}) {
  const breatheA = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const dur = 4000 + index * 700;
    const lp  = Animated.loop(Animated.sequence([
      Animated.timing(breatheA, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breatheA, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    lp.start(); return () => lp.stop();
  }, [breatheA, index]);
  const sc = breatheA.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.10] });
  const op = breatheA.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.30] });

  return (
    <View style={ds.orb}>
      <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: color, opacity: op, transform: [{ scale: sc }] }} />
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${color}18`, borderWidth: 1, borderColor: `${color}40`, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        </View>
      </View>
      <Text style={[ds.orbVal, { color }]}>{value}</Text>
      <Text style={ds.orbLabel}>{label}</Text>
    </View>
  );
}

function DreamStatistics({ totalDreams, activeDays, streak, resonanceCount }: {
  totalDreams:    number;
  activeDays:     number;
  streak:         number;
  resonanceCount: number;
}) {
  const stats = [
    { label: 'Toplam Rüya', value: String(totalDreams),    color: '#A78BFA', icon: '🌙' },
    { label: 'Aktif Gün',   value: String(activeDays),     color: '#60A5FA', icon: '☀️' },
    { label: 'Seri',        value: `${streak}g`,            color: '#FBBF24', icon: '🔥' },
    { label: 'Rezonans',    value: String(resonanceCount), color: '#F472B6', icon: '✦' },
  ];

  return (
    <View style={ds.wrap}>
      <Text style={ds.eyebrow}>RÜYA İSTATİSTİKLERİM</Text>
      <View style={ds.row}>
        {stats.map((s, i) => (
          <StatOrb key={s.label} value={s.value} label={s.label} color={s.color} icon={s.icon} index={i} />
        ))}
      </View>
    </View>
  );
}
const ds = StyleSheet.create({
  wrap:     { paddingHorizontal: PAD, paddingBottom: 28, gap: 14 },
  eyebrow:  { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  row:      { flexDirection: 'row', justifyContent: 'space-between' },
  orb:      { flex: 1, alignItems: 'center', gap: 8 },
  orbVal:   { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  orbLabel: { fontSize: 8, fontWeight: '800', color: 'rgba(255,255,255,0.28)', letterSpacing: 0.5, textAlign: 'center' },
});

// ── S3: Symbol Constellation ──────────────────────────────────────────────────

function SymbolConstellation({ symbols }: { symbols: string[] }) {
  if (!symbols.length) return null;
  const top = symbols.slice(0, 8);

  const sizeFor = (i: number) =>
    i === 0 ? { emoji: 30, font: 17 }
    : i < 3  ? { emoji: 22, font: 14 }
    : i < 6  ? { emoji: 17, font: 12 }
    :           { emoji: 13, font: 11 };

  return (
    <View style={sc.wrap}>
      <Text style={sc.eyebrow}>SEMBOL KONSTELASYONum</Text>
      <View style={sc.cloud}>
        {top.map((sym, i) => {
          const sz      = sizeFor(i);
          const opacity = 1 - i * 0.09;
          const isBig   = i === 0;
          return (
            <View key={`${sym}-${i}`} style={[
              sc.chip,
              {
                opacity,
                borderColor: isBig ? 'rgba(251,191,36,0.40)' : i < 3 ? 'rgba(251,191,36,0.18)' : 'rgba(251,191,36,0.07)',
                backgroundColor: isBig ? 'rgba(251,191,36,0.10)' : 'rgba(251,191,36,0.03)',
                paddingHorizontal: isBig ? 18 : i < 3 ? 13 : 10,
                paddingVertical:   isBig ? 12  : i < 3 ? 9  : 7,
              },
            ]}>
              <Text style={{ fontSize: sz.emoji }}>{SYM_EMOJI[sym] ?? '·'}</Text>
              <Text style={[sc.label, { fontSize: sz.font, color: isBig ? '#FBBF24' : i < 3 ? 'rgba(251,191,36,0.75)' : 'rgba(255,255,255,0.42)' }]}>
                {tl(SYMBOL_TR, sym)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
const sc = StyleSheet.create({
  wrap:    { paddingHorizontal: PAD, paddingBottom: 28, gap: 14 },
  eyebrow: { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  cloud:   { flexDirection: 'row', flexWrap: 'wrap', gap: 9, alignItems: 'center' },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 50, borderWidth: 1 },
  label:   { fontWeight: '800' },
});

// ── S4: Emotion Spectrum ──────────────────────────────────────────────────────

function EmotionSpectrum({ emotions }: { emotions: string[] }) {
  const top = emotions.slice(0, 5);
  if (!top.length) return null;

  return (
    <View style={esp.wrap}>
      <Text style={esp.eyebrow}>DUYGU SPEKTRUMUM</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={esp.cloud}>
        {top.map((em, i) => {
          const color = EMOTION_COLOR[em] ?? '#A78BFA';
          const size  = 52 - i * 6;
          return <EmotionOrbChip key={`${em}-${i}`} em={em} color={color} size={size} rank={i} />;
        })}
      </ScrollView>
    </View>
  );
}

function EmotionOrbChip({ em, color, size, rank }: { em: string; color: string; size: number; rank: number }) {
  const breatheA = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const dur = 3500 + rank * 500;
    const lp  = Animated.loop(Animated.sequence([
      Animated.timing(breatheA, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breatheA, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    lp.start(); return () => lp.stop();
  }, [breatheA, rank]);
  const sc = breatheA.interpolate({ inputRange: [0, 1], outputRange: [0.90, 1.10] });
  const op = breatheA.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.38] });

  return (
    <View style={[esp.node, { width: size + 20, gap: 8, alignItems: 'center' }]}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: op, transform: [{ scale: sc }] }} />
        <View style={{ width: size * 0.70, height: size * 0.70, borderRadius: size * 0.35, backgroundColor: `${color}20`, borderWidth: 1, borderColor: `${color}55` }} />
      </View>
      <Text style={[esp.nodeLabel, { color, opacity: 1 - rank * 0.12 }]} numberOfLines={1}>{tl(EMOTION_TR, em)}</Text>
    </View>
  );
}
const esp = StyleSheet.create({
  wrap:      { paddingHorizontal: PAD, paddingBottom: 28, gap: 14 },
  eyebrow:   { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  cloud:     { flexDirection: 'row', alignItems: 'center', gap: 14, paddingRight: PAD, paddingVertical: 8 },
  node:      {},
  nodeLabel: { fontSize: 10, fontWeight: '800', textAlign: 'center' },
});

// ── S5: Archetype Evolution ───────────────────────────────────────────────────

function ArchetypeEvolution({ identity }: { identity: DreamIdentity }) {
  const all = [
    ...(identity.dominantArchetypes ?? []).slice(0, 3),
  ];
  // ensure primary is last (current)
  const withPrimary = all.includes(identity.primaryArchetype)
    ? all
    : [...all.slice(0, 2), identity.primaryArchetype];
  const chain = withPrimary.slice(0, 3).reverse(); // oldest → newest

  if (chain.length < 2) return null;

  return (
    <View style={ae.wrap}>
      <Text style={ae.eyebrow}>ARKETİP EVRİMİM</Text>
      <Text style={ae.sub}>Rüyalar boyunca şekillenen bilinç yolculuğu.</Text>
      <View style={ae.chain}>
        {chain.map((archKey, i) => {
          const isCurrent = i === chain.length - 1;
          const icon      = ARCHETYPE_EMOJI[archKey] ?? '◎';
          const name      = tl({
            shadow: 'Gölge', anima: 'Anima', animus: 'Animus', wise_elder: 'Bilge Yaşlı',
            trickster: 'Çıfıtçı', guide: 'Rehber', hero: 'Kahraman', child: 'Çocuk',
            great_mother: 'Büyük Ana', explorer: 'Kaşif', guardian: 'Koruyucu',
          }, archKey);
          return (
            <View key={`${archKey}-${i}`} style={ae.nodeWrap}>
              <View style={[ae.node, isCurrent && ae.nodeCurrent]}>
                <Text style={ae.nodeIcon}>{icon}</Text>
                <Text style={[ae.nodeName, isCurrent && ae.nodeNameCurrent]}>{name}</Text>
                {isCurrent && <Text style={ae.currentTag}>ŞİMDİ</Text>}
              </View>
              {i < chain.length - 1 && <Text style={ae.arrow}>↓</Text>}
            </View>
          );
        })}
      </View>
    </View>
  );
}
const ae = StyleSheet.create({
  wrap:            { paddingHorizontal: PAD, paddingBottom: 28, gap: 14 },
  eyebrow:         { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sub:             { fontSize: 12, color: 'rgba(255,255,255,0.30)', lineHeight: 18, marginTop: -4 },
  chain:           { alignItems: 'flex-start', gap: 0 },
  nodeWrap:        { alignItems: 'flex-start' },
  node:            { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 4 },
  nodeCurrent:     { backgroundColor: 'rgba(167,139,250,0.08)', borderColor: 'rgba(167,139,250,0.30)' },
  nodeIcon:        { fontSize: 22 },
  nodeName:        { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.50)' },
  nodeNameCurrent: { color: 'rgba(255,255,255,0.90)', fontWeight: '900' },
  currentTag:      { fontSize: 7, fontWeight: '900', letterSpacing: 1.5, color: '#A78BFA', marginLeft: 4 },
  arrow:           { fontSize: 18, color: 'rgba(167,139,250,0.30)', fontWeight: '900', paddingLeft: 26, marginVertical: 2 },
});

// ── S6: Dream Calendar ────────────────────────────────────────────────────────

const CAL_CELL = Math.floor((W - PAD * 2 - 24) / 7);

function DreamCalendar({ dreams }: { dreams: Dream[] }) {
  const days = buildCalendarDays(dreams);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <View style={cal.wrap}>
      <Text style={cal.eyebrow}>RÜYA TAKVİMİM</Text>
      <Text style={cal.sub}>Son 35 gün · Her rüya bir ışık yakar.</Text>
      <View style={cal.grid}>
        {days.map((day, i) => {
          const isToday = day.date === today;
          const hasD    = !!day.cat;
          const color   = hasD ? (CAT_COLOR[day.cat!] ?? '#A78BFA') : null;
          return (
            <View key={day.date} style={[cal.cell, isToday && cal.cellToday]}>
              <View style={[
                cal.dot,
                {
                  backgroundColor: color ? `${color}55` : 'rgba(255,255,255,0.04)',
                  borderColor:     color ? `${color}80` : 'rgba(255,255,255,0.07)',
                  borderWidth:     isToday ? 1.5 : 1,
                },
              ]}>
                {hasD && <View style={[cal.dotInner, { backgroundColor: color! }]} />}
              </View>
            </View>
          );
        })}
      </View>
      <View style={cal.legend}>
        {[
          { cat: 'lucid', label: 'Lucid' }, { cat: 'beautiful', label: 'Güzel' },
          { cat: 'nightmare', label: 'Kabus' }, { cat: 'normal', label: 'Normal' },
        ].map(({ cat, label }) => (
          <View key={cat} style={cal.legendItem}>
            <View style={[cal.legendDot, { backgroundColor: CAT_COLOR[cat] ?? '#A78BFA' }]} />
            <Text style={cal.legendLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const cal = StyleSheet.create({
  wrap:        { paddingHorizontal: PAD, paddingBottom: 28, gap: 14 },
  eyebrow:     { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sub:         { fontSize: 12, color: 'rgba(255,255,255,0.30)', lineHeight: 18, marginTop: -4 },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell:        { width: CAL_CELL, height: CAL_CELL, alignItems: 'center', justifyContent: 'center' },
  cellToday:   {},
  dot:         { width: CAL_CELL - 6, height: CAL_CELL - 6, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  dotInner:    { width: (CAL_CELL - 6) * 0.42, height: (CAL_CELL - 6) * 0.42, borderRadius: 100, opacity: 0.85 },
  legend:      { flexDirection: 'row', gap: 16, paddingTop: 4 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 6, height: 6, borderRadius: 3, opacity: 0.75 },
  legendLabel: { fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: '600' },
});

// ── S7: AI Reflection ─────────────────────────────────────────────────────────

function AIReflection({ identity }: { identity: DreamIdentity }) {
  const text = buildAIReflection(identity);
  if (!text) return null;

  return (
    <View style={air.wrap}>
      <View style={air.headerRow}>
        <Ionicons name="sparkles-outline" size={11} color="rgba(167,139,250,0.55)" />
        <Text style={air.eyebrow}>BİLİNÇ YANSIMASI</Text>
      </View>
      <Text style={air.body}>{text}</Text>
    </View>
  );
}
const air = StyleSheet.create({
  wrap:      { paddingHorizontal: PAD, paddingBottom: 28, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyebrow:   { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(167,139,250,0.45)' },
  body:      { fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 26, fontStyle: 'italic', borderLeftWidth: 2, borderLeftColor: 'rgba(167,139,250,0.28)', paddingLeft: 14 },
});

// ── S8: Consciousness Level ───────────────────────────────────────────────────

function ConsciousnessLevel({ identity, matchCount }: { identity: DreamIdentity; matchCount: number }) {
  const lv      = resolveLevel(identity.dreamCount);
  const pulsA   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const lp = Animated.loop(Animated.sequence([
      Animated.timing(pulsA, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulsA, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    lp.start(); return () => lp.stop();
  }, [pulsA]);
  const sc = pulsA.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.12] });
  const op = pulsA.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.40] });

  return (
    <View style={lev.wrap}>
      <Text style={lev.eyebrow}>BİLİNÇ SEVİYEM</Text>
      <View style={{ alignItems: 'center', gap: 20 }}>
        {/* Level orb */}
        <View style={{ width: 100, height: 100, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: lv.color, opacity: op, transform: [{ scale: sc }] }} />
          <View style={{ width: 68, height: 68, borderRadius: 34, borderWidth: 1.5, borderColor: `${lv.color}55`, backgroundColor: 'rgba(4,3,15,0.65)', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Text style={[lev.lvNum, { color: lv.color }]}>{lv.number}</Text>
            <Text style={lev.lvName}>{lv.name}</Text>
          </View>
        </View>
        {lv.toNext > 0 && (
          <Text style={lev.lvNext}>{lv.toNext} rüya daha sonraki seviyeye</Text>
        )}
        {/* Score row */}
        <View style={lev.scoreRow}>
          {[
            { val: identity.resonanceScore,     key: 'REZONANS', color: '#A78BFA' },
            { val: identity.wonderScore,         key: 'MERAK',    color: '#FBBF24' },
            { val: identity.transformationScore, key: 'DÖNÜŞÜM',  color: '#34D399' },
            { val: matchCount,                   key: 'BAĞLANTI', color: '#F472B6' },
          ].map((s, i) => (
            <View key={s.key} style={[lev.scoreItem, i > 0 && lev.scoreBorder]}>
              <Text style={[lev.scoreVal, { color: s.color }]}>{s.val}</Text>
              <Text style={lev.scoreKey}>{s.key}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
const lev = StyleSheet.create({
  wrap:       { paddingHorizontal: PAD, paddingBottom: 28, gap: 18 },
  eyebrow:    { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  lvNum:      { fontSize: 26, fontWeight: '900', letterSpacing: -1, lineHeight: 28 },
  lvName:     { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.50)', letterSpacing: 0.5 },
  lvNext:     { fontSize: 11, color: 'rgba(255,255,255,0.28)', fontWeight: '600', fontStyle: 'italic' },
  scoreRow:   { flexDirection: 'row', width: '100%' },
  scoreItem:  { flex: 1, alignItems: 'center', gap: 5 },
  scoreBorder:{ borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.06)' },
  scoreVal:   { fontSize: 18, fontWeight: '900', letterSpacing: -0.2 },
  scoreKey:   { fontSize: 7.5, fontWeight: '900', letterSpacing: 1.5, color: 'rgba(255,255,255,0.22)' },
});

// ── PRESERVED: Consciousness Map ──────────────────────────────────────────────

const MAP_W   = W - PAD * 2;
const MAP_H   = 340;
const MCX     = MAP_W / 2;
const MCY     = MAP_H * 0.44;
const R_INNER = 92;
const R_OUTER = 152;

const THEME_ANGS = [-90, 30, 150];
const OUTER_ANGS = [-45, 45, 135, 225, -135];

type MapNode = {
  id: string; label: string; type: 'center' | 'theme' | 'emotion' | 'symbol';
  x: number; y: number; size: number; color: string; ring: 'center' | 'inner' | 'outer';
};

const MAP_COLOR: Record<string, string> = {
  center: '#A78BFA', theme: '#A78BFA', emotion: '#F472B6', symbol: '#60A5FA',
};

function buildMapNodes(identity: DreamIdentity, username: string): MapNode[] {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const nodes: MapNode[] = [];
  nodes.push({
    id: 'center', label: username.slice(0, 7).toUpperCase(),
    type: 'center', ring: 'center', x: MCX, y: MCY, size: 54, color: '#A78BFA',
  });
  const themes = (identity.dominantThemes ?? []).slice(0, 3);
  THEME_ANGS.forEach((ang, i) => {
    if (!themes[i]) return;
    const r = toRad(ang);
    nodes.push({
      id: `t-${i}`, label: tl(THEME_TR, themes[i]!), type: 'theme', ring: 'inner',
      x: MCX + Math.cos(r) * R_INNER, y: MCY + Math.sin(r) * R_INNER, size: 40, color: MAP_COLOR['theme']!,
    });
  });
  const outer: { label: string; type: 'emotion' | 'symbol' }[] = [
    ...(identity.dominantEmotions ?? []).slice(0, 3).map(e => ({ label: tl(EMOTION_TR, e), type: 'emotion' as const })),
    ...(identity.dominantSymbols  ?? []).slice(0, 2).map(s => ({ label: tl(SYMBOL_TR,  s), type: 'symbol'  as const })),
  ];
  OUTER_ANGS.forEach((ang, i) => {
    if (!outer[i]) return;
    const r = toRad(ang);
    nodes.push({
      id: `o-${i}`, label: outer[i]!.label, type: outer[i]!.type, ring: 'outer',
      x: MCX + Math.cos(r) * R_OUTER, y: MCY + Math.sin(r) * R_OUTER, size: 32, color: MAP_COLOR[outer[i]!.type]!,
    });
  });
  return nodes;
}

function MapLine({ from, to }: { from: MapNode; to: MapNode }) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ang = `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`;
  return (
    <View pointerEvents="none" style={{
      position: 'absolute', left: (from.x + to.x) / 2 - len / 2, top: (from.y + to.y) / 2 - 0.5,
      width: len, height: 1, backgroundColor: to.color, opacity: 0.11, transform: [{ rotate: ang }],
    }} />
  );
}

function MapNodeDot({ node, breathe }: { node: MapNode; breathe: Animated.Value }) {
  const LW   = 76;
  const glow = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.52] });
  const ring = breathe.interpolate({ inputRange: [0, 1], outputRange: [node.size * 0.48, node.size * 0.76] });
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: node.x - LW / 2, top: node.y - node.size / 2, width: LW, alignItems: 'center' }}>
      <Animated.View pointerEvents="none" style={{
        position: 'absolute', alignSelf: 'center',
        width: ring, height: ring,
        borderRadius: Animated.divide(ring, 2) as unknown as number,
        backgroundColor: node.color, opacity: glow,
        top: node.size / 2, marginTop: -(node.size * 0.76) / 2,
      }} />
      <View style={{
        width: node.size, height: node.size, borderRadius: node.size / 2,
        backgroundColor: `${node.color}22`,
        borderWidth: node.ring === 'center' ? 1.5 : StyleSheet.hairlineWidth,
        borderColor: node.color, alignItems: 'center', justifyContent: 'center',
      }}>
        {node.ring === 'center' && (
          <Text style={{ fontSize: 8, fontWeight: '900', color: node.color, letterSpacing: 0.6 }} numberOfLines={1}>
            {node.label}
          </Text>
        )}
      </View>
      {node.ring !== 'center' && (
        <Text numberOfLines={1} style={{ marginTop: 4, fontSize: 8, fontWeight: '600', color: 'rgba(255,255,255,0.48)', width: LW, textAlign: 'center' }}>
          {node.label}
        </Text>
      )}
    </View>
  );
}

function ConsciousnessMap({ identity, username }: { identity: DreamIdentity; username: string }) {
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      Animated.timing(breathe, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    ]));
    a.start();
    return () => a.stop();
  }, [breathe]);
  const nodes  = buildMapNodes(identity, username);
  const center = nodes[0];

  return (
    <View style={cm.wrap}>
      <Text style={cm.eyebrow}>BİLİNÇ HARİTASI</Text>
      <View style={cm.card}>
        <View style={[cm.field, { width: MAP_W - 2, height: MAP_H }]}>
          {center && nodes.filter(n => n !== center).map(n => <MapLine key={`l-${n.id}`} from={center} to={n} />)}
          {[...nodes].reverse().map(n => <MapNodeDot key={n.id} node={n} breathe={breathe} />)}
        </View>
        <View style={cm.legend}>
          {[{ label: 'Tema', color: '#A78BFA' }, { label: 'Duygu', color: '#F472B6' }, { label: 'Sembol', color: '#60A5FA' }].map(({ label, color }) => (
            <View key={label} style={cm.legendItem}>
              <View style={[cm.legendDot, { backgroundColor: color }]} />
              <Text style={cm.legendText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
const cm = StyleSheet.create({
  wrap:       { paddingHorizontal: PAD, paddingBottom: 28 },
  eyebrow:    { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)', marginBottom: 14 },
  card:       { backgroundColor: '#07061A', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(167,139,250,0.14)', overflow: 'hidden' },
  field:      { position: 'relative' },
  legend:     { flexDirection: 'row', gap: 18, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 5, height: 5, borderRadius: 3 },
  legendText: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.28)', letterSpacing: 0.5 },
});

// ── PRESERVED: Dream Archive ──────────────────────────────────────────────────

type DreamChapter = { key: string; label: string; dreams: Dream[] };

function buildChapters(dreams: Dream[]): DreamChapter[] {
  const map = new Map<string, Dream[]>();
  for (const d of dreams) {
    const date = new Date(d.createdAt);
    const key  = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const arr  = map.get(key) ?? [];
    arr.push(d);
    map.set(key, arr);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => {
      const d0   = items[0];
      const date = new Date(d0?.createdAt ?? Date.now());
      return { key, label: `${MONTH_FULL[date.getMonth()]} ${date.getFullYear()}`, dreams: items };
    });
}

function DreamArchive({ dreams, totalCount }: { dreams: Dream[]; totalCount: number }) {
  const router   = useRouter();
  const chapters = buildChapters(dreams);
  if (!chapters.length) return null;

  return (
    <View style={da.wrap}>
      <Text style={da.eyebrow}>RÜYA ARŞİVİM</Text>
      {chapters.map(ch => (
        <View key={ch.key} style={da.chapter}>
          <View style={da.chapterHeader}>
            <Text style={da.chapterTitle}>{ch.label.toUpperCase()}</Text>
            <Text style={da.chapterCount}>{ch.dreams.length} rüya</Text>
          </View>
          {ch.dreams.slice(0, 3).map((d, i) => (
            <View key={d.id} style={[da.row, i < Math.min(2, ch.dreams.length - 1) && da.rowBorder]}>
              <Text style={da.icon}>{CAT_ICON[d.category] ?? '🌙'}</Text>
              <View style={da.rowMeta}>
                <Text style={da.rowTitle} numberOfLines={1}>{d.title ?? d.content.slice(0, 55).trim()}</Text>
                <Text style={da.rowDate}>{new Date(d.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</Text>
              </View>
            </View>
          ))}
          {ch.dreams.length > 3 && (
            <Text style={da.more}>+{ch.dreams.length - 3} rüya daha</Text>
          )}
        </View>
      ))}
      {totalCount > dreams.length && (
        <Pressable
          style={({ pressed }) => [da.allBtn, { opacity: pressed ? 0.75 : 1 }]}
          onPress={() => router.push('/(tabs)/profile' as any)}
        >
          <Text style={da.allText}>Tüm Arşivi Gör</Text>
          <Ionicons name="arrow-forward" size={12} color="#34D399" />
        </Pressable>
      )}
    </View>
  );
}
const da = StyleSheet.create({
  wrap:          { paddingHorizontal: PAD, paddingBottom: 28, gap: 8 },
  eyebrow:       { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)', marginBottom: 6 },
  chapter:       { backgroundColor: '#07061A', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(52,211,153,0.12)', overflow: 'hidden' },
  chapterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 11, paddingBottom: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  chapterTitle:  { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.38)', letterSpacing: 1.4 },
  chapterCount:  { fontSize: 9, fontWeight: '700', color: 'rgba(52,211,153,0.55)' },
  row:           { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  rowBorder:     { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  icon:          { fontSize: 13, width: 18, textAlign: 'center' },
  rowMeta:       { flex: 1 },
  rowTitle:      { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.72)', lineHeight: 17 },
  rowDate:       { fontSize: 9.5, color: 'rgba(255,255,255,0.22)', marginTop: 2 },
  more:          { fontSize: 10, color: 'rgba(255,255,255,0.22)', paddingHorizontal: 14, paddingBottom: 10, paddingTop: 2 },
  allBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(52,211,153,0.20)', backgroundColor: 'rgba(52,211,153,0.04)' },
  allText:       { fontSize: 12, fontWeight: '700', color: '#34D399' },
});

// ── PRESERVED: Consciousness Tools ────────────────────────────────────────────

type ToolItem = {
  key: string; icon: IoniconName; label: string; sub: string; color: string; route: string; badge?: number;
};
type ToolGroup = { label: string; items: ToolItem[] };

function ConsciousnessTools({ unreadCount, mentionCount }: { unreadCount: number; mentionCount: number }) {
  const router  = useRouter();
  const CARD_W  = (W - PAD * 2 - 8) / 2;

  const groups: ToolGroup[] = [
    {
      label: 'KEŞFET',
      items: [
        { key: 'atlas', icon: 'planet-outline', color: '#A78BFA', label: 'Dream Atlas', sub: 'İnsanlığın bilinçaltı haritası', route: '/dream-atlas' },
        { key: 'map',   icon: 'map-outline',    color: '#60A5FA', label: 'Dream Map',   sub: 'Kolektif bilinçaltı yaşayan harita', route: '/dream-map' },
        { key: 'places',icon: 'location-outline',color: '#34D399',label: 'Dream Places',sub: 'Rüyalarda en çok görülen mekanlar', route: '/dream-places' },
      ],
    },
    {
      label: 'SOSYAL',
      items: [
        { key: 'mentions', icon: 'eye-outline', color: '#F472B6', label: 'Rüyamda Göründüm', sub: mentionCount > 0 ? `${mentionCount} kişi rüyanda gördü` : 'Başkalarının rüyalarında', route: '/mentions', ...(mentionCount > 0 && { badge: mentionCount }) },
        { key: 'connections', icon: 'git-network-outline', color: '#F472B6', label: 'Dream Connections', sub: 'Rüyalarında kesişen bilinçler', route: '/dream-connections' },
      ],
    },
    {
      label: 'KİŞİSEL',
      items: [
        { key: 'journal',  icon: 'book-outline',     color: '#FBBF24', label: 'Dream Journal',      sub: 'Özel rüya arşivin',                          route: '/dream-journal' },
        { key: 'saved',    icon: 'bookmark-outline', color: '#FBBF24', label: 'Saved Dreams',       sub: 'Kaydettiğin rüyalar',                         route: '/saved-dreams' },
        { key: 'reality',  icon: 'radio-outline',    color: '#34D399', label: 'Reality Resonance',  sub: 'Gerçekleşen rüyalar ve bilinç sinyalleri',    route: '/reality-resonance' },
      ],
    },
    {
      label: 'SİSTEM',
      items: [
        { key: 'codex',   icon: 'book-outline',          color: '#C4A55A', label: 'Dream Codex',     sub: 'Evrenin gizli bilgi arşivi',                          route: '/dream-codex' },
        { key: 'notif',   icon: 'notifications-outline', color: '#A78BFA', label: 'Bildirimler',     sub: unreadCount > 0 ? `${unreadCount} okunmamış` : 'Hepsi okundu', route: '/(tabs)/notifications', ...(unreadCount > 0 && { badge: unreadCount }) },
        { key: 'profile', icon: 'person-outline',        color: 'rgba(255,255,255,0.40)', label: 'Profil & Ayarlar', sub: 'Hesap ve tercihler', route: '/(tabs)/profile' },
      ],
    },
  ];

  return (
    <View style={ct.wrap}>
      <Text style={ct.eyebrow}>BİLİNÇ ARAÇLARI</Text>
      {groups.map(group => (
        <View key={group.label} style={ct.group}>
          <Text style={ct.groupLabel}>{group.label}</Text>
          <View style={ct.grid}>
            {group.items.map(item => (
              <Pressable
                key={item.key}
                style={({ pressed }) => [ct.card, { width: CARD_W, opacity: pressed ? 0.78 : 1 }]}
                onPress={() => router.push(item.route as any)}
              >
                <View style={[ct.iconWrap, { backgroundColor: `${item.color}18` }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                  {(item.badge ?? 0) > 0 && (
                    <View style={ct.badge}>
                      <Text style={ct.badgeText}>{(item.badge ?? 0) > 99 ? '99+' : item.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={ct.cardLabel} numberOfLines={1}>{item.label}</Text>
                <Text style={ct.cardSub} numberOfLines={2}>{item.sub}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
const ct = StyleSheet.create({
  wrap:       { paddingHorizontal: PAD, paddingBottom: 28 },
  eyebrow:    { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)', marginBottom: 14 },
  group:      { marginBottom: 14 },
  groupLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5, color: 'rgba(255,255,255,0.20)', marginBottom: 8 },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card:       { backgroundColor: '#07061A', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 14, gap: 8 },
  iconWrap:   { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badge:      { position: 'absolute', top: -3, right: -3, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText:  { fontSize: 7.5, fontWeight: '900', color: '#FFFFFF' },
  cardLabel:  { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.80)' },
  cardSub:    { fontSize: 10, color: 'rgba(255,255,255,0.28)', lineHeight: 14 },
});

// ── Section divider ───────────────────────────────────────────────────────────

function Divider() {
  return <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginHorizontal: PAD, marginBottom: 28 }} />;
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MyWorldScreen() {
  const router = useRouter();

  const { data: identity, isLoading: identityLoading, refetch, isRefetching } = useQuery({
    queryKey: ['identity', 'me'], queryFn: getMyIdentity, staleTime: 10 * 60 * 1000,
  });

  const { data: matchData } = useQuery({
    queryKey: ['matches', 'my-matches'], queryFn: () => getMyMatches({ limit: 3 }), staleTime: 5 * 60 * 1000,
  });

  const { data: dreamsData } = useQuery({
    queryKey: ['dreams', 'my-world'], queryFn: () => getMyDreams(1), staleTime: 5 * 60 * 1000,
  });

  const { data: calData } = useQuery({
    queryKey: ['dreams', 'calendar'],
    queryFn:  async () => {
      const p1 = await getMyDreams(1);
      if (p1.meta.pages <= 1) return p1.items;
      const rest = await Promise.all(
        Array.from({ length: Math.min(p1.meta.pages - 1, 4) }, (_, i) => getMyDreams(i + 2)),
      );
      return [...p1.items, ...rest.flatMap(p => p.items)];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: profile } = useQuery({
    queryKey: ['my-profile'], queryFn: getMyProfile, staleTime: 5 * 60 * 1000,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'], queryFn: getUnreadCount, staleTime: 30 * 1000,
  });

  const { data: mentionStats } = useQuery({
    queryKey: ['mentions', 'stats'], queryFn: getMyMentionStats, staleTime: 5 * 60 * 1000,
  });

  const matchCount   = matchData?.meta.total ?? 0;
  const dreams       = dreamsData?.items ?? [];
  const allDreams    = calData ?? dreams;
  const totalCount   = dreamsData?.meta.total ?? 0;
  const username     = profile?.username ?? '';
  const mentionCount = mentionStats?.totalMentions ?? 0;
  const activeDays   = new Set(allDreams.map(d => d.createdAt.slice(0, 10))).size;
  const streak       = computeStreak(allDreams);

  const onRefresh = useCallback(() => { void refetch(); }, [refetch]);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <AmbientField />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !identityLoading}
            onRefresh={onRefresh}
            tintColor="#A78BFA"
          />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>DÜNYAM</Text>
            <Text style={s.subtitle}>bilinçaltı kimlik merkezi</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/profile' as any)}
            style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
            hitSlop={10}
          >
            <Avatar uri={profile?.avatarUrl ?? null} name={username} size={34} />
          </Pressable>
        </View>

        {identityLoading ? (
          <View style={s.loadingCard}>
            <Ionicons name="moon-outline" size={24} color="rgba(167,139,250,0.40)" />
            <Text style={s.loadingText}>Bilinçaltın haritalanıyor…</Text>
          </View>
        ) : !identity ? (
          <View style={s.emptyCard}>
            <Ionicons name="moon-outline" size={36} color="rgba(167,139,250,0.35)" />
            <Text style={s.emptyTitle}>Henüz bir kimlik yok</Text>
            <Text style={s.emptyBody}>Rüyalarını kaydetmeye devam et.{'\n'}Bilinçaltın zamanla şekillenecek.</Text>
          </View>
        ) : (
          <>
            {/* 1 — Consciousness Identity hero */}
            <ConsciousnessIdentity identity={identity} />

            {/* 2 — Dream Statistics */}
            <DreamStatistics
              totalDreams={identity.dreamCount}
              activeDays={activeDays}
              streak={streak}
              resonanceCount={matchCount}
            />
            <Divider />

            {/* 3 — Symbol Constellation */}
            {(identity.dominantSymbols ?? []).length > 0 && (
              <>
                <SymbolConstellation symbols={identity.dominantSymbols ?? []} />
                <Divider />
              </>
            )}

            {/* 4 — Emotion Spectrum */}
            {(identity.dominantEmotions ?? []).length > 0 && (
              <>
                <EmotionSpectrum emotions={identity.dominantEmotions ?? []} />
                <Divider />
              </>
            )}

            {/* 5 — Archetype Evolution */}
            {(identity.dominantArchetypes ?? []).length >= 2 && (
              <>
                <ArchetypeEvolution identity={identity} />
                <Divider />
              </>
            )}

            {/* 6 — Dream Calendar */}
            {allDreams.length > 0 && (
              <>
                <DreamCalendar dreams={allDreams} />
                <Divider />
              </>
            )}

            {/* 7 — AI Reflection */}
            <AIReflection identity={identity} />

            {/* 8 — Consciousness Level */}
            <ConsciousnessLevel identity={identity} matchCount={matchCount} />
            <Divider />

            {/* 9 — Consciousness Map (PRESERVED) */}
            <ConsciousnessMap identity={identity} username={username} />
            <Divider />

            {/* 10 — Dream Archive (PRESERVED) */}
            {dreams.length > 0 && (
              <>
                <DreamArchive dreams={dreams} totalCount={totalCount} />
                <Divider />
              </>
            )}
          </>
        )}

        {/* 11 — Consciousness Tools (PRESERVED, always visible) */}
        <ConsciousnessTools unreadCount={unreadCount} mentionCount={mentionCount} />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Screen styles ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: '#04030F' },
  scroll:      { paddingBottom: 20 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: PAD, paddingTop: 14, paddingBottom: 24 },
  title:       { fontSize: 22, fontWeight: '900', letterSpacing: 3, color: 'rgba(255,255,255,0.92)' },
  subtitle:    { fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1.6, marginTop: 3 },
  loadingCard: { height: 180, borderRadius: 20, marginHorizontal: PAD, marginBottom: 10, backgroundColor: '#07061A', borderWidth: 1, borderColor: 'rgba(167,139,250,0.14)', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 12, color: 'rgba(255,255,255,0.28)', letterSpacing: 0.5 },
  emptyCard:   { paddingVertical: 52, alignItems: 'center', gap: 10 },
  emptyTitle:  { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.50)' },
  emptyBody:   { fontSize: 12, color: 'rgba(255,255,255,0.28)', textAlign: 'center', lineHeight: 19 },
});
