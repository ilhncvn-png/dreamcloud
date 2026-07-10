import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Dimensions, Easing, FlatList, Modal, Platform,
  Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getWeatherNow } from '@/api/weather.api';
import { getMyMatches } from '@/api/matches.api';
import { getSignalsToday } from '@/api/signals.api';
import type { DreamWeather } from '@/types/weather.types';
import type { DreamSignals } from '@/types/signal.types';
import { getPublicFeed } from '@/api/dreams.api';
import LikeSaveBar from '@/components/LikeSaveBar';
import DreamCardSkeleton from '@/components/DreamCardSkeleton';
import { Colors } from '@/constants/colors';
import { MoonIcon } from '@/design/icons';
import type { Dream } from '@/types/dream.types';
import type { DreamCategory } from '@/api/dreams.api';

const { width: W } = Dimensions.get('window');

const FEED_KEY = ['dreams', 'public'] as const;

// ── Translations ──────────────────────────────────────────────────────────────

const TR: Record<string, string> = {
  awakening: 'uyanış', journey: 'yolculuk', flying: 'uçuş', falling: 'düşme',
  water: 'su', flood: 'su baskını', transformation: 'dönüşüm', threshold: 'geçiş',
  pursuit: 'kaçış', entrapment: 'hapsolma', loss: 'kayıp', reunion: 'kavuşma',
  confrontation: 'yüzleşme', discovery: 'keşif', protection: 'koruma',
  exposure: 'ifşa', memory: 'bellek', birth: 'doğum', death: 'ölüm', love: 'aşk',
  fear: 'korku', door: 'kapı', bird: 'kuş', light: 'ışık', fire: 'ateş',
  snake: 'yılan', key: 'anahtar', moon: 'ay', sun: 'güneş', bridge: 'köprü',
  ocean: 'okyanus', house: 'ev', tree: 'ağaç', awe: 'hayranlık', wonder: 'merak',
  peace: 'huzur', anxiety: 'kaygı', sadness: 'keder', anger: 'öfke',
  joy: 'sevinç', freedom: 'özgürlük', serenity: 'dinginlik', calm: 'sükunet',
  excitement: 'heyecan', dread: 'tedirginlik', curiosity: 'merak',
  shadow: 'gölge', guide: 'rehber', sea: 'deniz', ascent: 'yükseliş',
};

function tr(key: string): string { return TR[key.toLowerCase()] ?? key; }
function cap(s: string): string  { return s.charAt(0).toUpperCase() + s.slice(1); }

// ── Category meta ─────────────────────────────────────────────────────────────

const CAT_ACCENT: Record<DreamCategory, string> = {
  lucid:     '#60A5FA',
  beautiful: '#34D399',
  nightmare: '#F87171',
  normal:    '#8B5CF6',
};

const CAT_LABEL: Record<DreamCategory, string> = {
  lucid:     'LUCİD',
  beautiful: 'GÜZEL',
  nightmare: 'KABUS',
  normal:    'ALAN',
};

// ── Collective color mapping ──────────────────────────────────────────────────

const COLLECTIVE_COLOR: Record<string, string> = {
  wonder: '#7C3AED', curiosity: '#7C3AED', awe: '#7C3AED',
  transformation: '#D97706', joy: '#D97706', excitement: '#D97706',
  peace: '#0891B2', serenity: '#0891B2', calm: '#0891B2', freedom: '#0891B2',
  fear: '#DC2626', anxiety: '#DC2626', dread: '#DC2626',
  threshold: '#4338CA', entrapment: '#4338CA', pursuit: '#4338CA',
  discovery: '#059669', love: '#BE185D', sadness: '#1E40AF',
};

function collectiveColor(s: DreamSignals | undefined, w: DreamWeather | undefined): string {
  const topEm = [...(s?.emotions ?? [])].sort((a, b) => b.count - a.count)[0];
  if (topEm && COLLECTIVE_COLOR[topEm.name]) return COLLECTIVE_COLOR[topEm.name]!;
  const topThm = [...(s?.themes ?? [])].sort((a, b) => b.count - a.count)[0];
  if (topThm && COLLECTIVE_COLOR[topThm.name]) return COLLECTIVE_COLOR[topThm.name]!;
  if (w?.dominantTrace) return COLLECTIVE_COLOR[w.dominantTrace.name] ?? Colors.primary;
  return Colors.primary;
}

// ── Theme data ────────────────────────────────────────────────────────────────

const STREAM_EMOJI: Record<string, string> = {
  discovery: '✨', transformation: '⚡', threshold: '🚪', pursuit: '🌑',
  water: '🌊', flying: '🌤', falling: '💫', journey: '🗺',
  loss: '🌒', reunion: '🌟', confrontation: '⚔️', exposure: '👁',
  ascent: '🏔', birth: '🌱',
};

const STREAM_COLOR: Record<string, string> = {
  discovery: '#34D399', transformation: '#FBBF24', threshold: '#6366F1',
  pursuit: '#F87171', water: '#60A5FA', flying: '#22D3EE',
  falling: '#94A3B8', journey: '#A78BFA', loss: '#6B7280',
  reunion: '#34D399', confrontation: '#F87171', exposure: '#FBBF24',
  ascent: '#A78BFA', birth: '#34D399',
};

// ── Signal sentence ───────────────────────────────────────────────────────────

function buildTonightSignal(s: DreamSignals | undefined, w: DreamWeather | undefined): string {
  if (w?.weatherSummary && w.weatherSummary.length > 10 && w.weatherSummary.length < 120)
    return w.weatherSummary;
  const total  = w?.totalDreamers ?? s?.dreamCount ?? 0;
  const topEm  = [...(s?.emotions ?? [])].sort((a, b) => b.count - a.count)[0];
  const topSym = [...(s?.symbols  ?? [])].sort((a, b) => b.count - a.count)[0];
  const rising = [...(s?.themes   ?? [])].filter(t => t.trend === 'rising').sort((a, b) => b.trendPct - a.trendPct)[0];
  const topThm = [...(s?.themes   ?? [])].sort((a, b) => b.count - a.count)[0];
  if (total <= 1 && topEm) {
    const symPart = topSym ? ` ${cap(tr(topSym.name))} sembolü öne çıkıyor.` : '';
    return `Bu gece güçlü bir ${tr(topEm.name)} sinyali algılandı.${symPart}`;
  }
  if (total > 1 && topEm) {
    const symPart = topSym ? ` ${cap(tr(topSym.name))} sembolü ön plana çıkıyor.` : '';
    return `${total} bilinç ${tr(topEm.name)} duygusunda buluştu.${symPart}`;
  }
  if (rising && topEm)  return `${cap(tr(topEm.name))} ve ${tr(rising.name)} bu gece kolektif bilinçte yükseliyor.`;
  if (topThm && topEm)  return `${cap(tr(topEm.name))} ve ${tr(topThm.name)} bu gece kolektif bilinçte yoğunlaşıyor.`;
  if (topThm)           return `Bu gece kolektif rüya alanı ${tr(topThm.name)} enerjisiyle doluyor.`;
  return 'Kolektif bilinç bu gece aktif. Rüyalar birbirini sessizce buluyor.';
}

// ── Module-level stable stars ─────────────────────────────────────────────────

const H_STARS = Array.from({ length: 18 }, (_, i) => {
  const s = i * 73 + 17;
  return {
    id: i,
    x: ((s * 31 + 7) % (W - 4)),
    y: ((s * 53 + 11) % 220),
    size: i % 4 === 0 ? 1.8 : i % 3 === 0 ? 1.2 : 0.8,
    dur: 2400 + ((s * 97) % 2600),
    anim: new Animated.Value(((s % 10) / 10) * 0.4 + 0.04),
  };
});

// ── L0: Background stars ──────────────────────────────────────────────────────

function HomeStars() {
  useEffect(() => {
    const loops = H_STARS.map(s => {
      const lp = Animated.loop(Animated.sequence([
        Animated.timing(s.anim, { toValue: 0.85, duration: s.dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(s.anim, { toValue: 0.04, duration: s.dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      lp.start(); return lp;
    });
    return () => loops.forEach(l => l.stop());
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {H_STARS.map(s => (
        <Animated.View key={s.id} style={{
          position: 'absolute', left: s.x, top: s.y,
          width: s.size, height: s.size, borderRadius: s.size / 2,
          backgroundColor: '#C4B5FD', opacity: s.anim,
        }} />
      ))}
    </View>
  );
}

// ── L1: Collective Dream Core ─────────────────────────────────────────────────

const ORB_PARTICLES = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2;
  const r     = 74 + (i % 3) * 14;
  return { id: i, x: Math.cos(angle) * r, y: Math.sin(angle) * r, size: 1.2 + (i % 4) * 0.6, op: 0.04 + (i % 5) * 0.03 };
});
const ORB_W = 148;

function CollectiveDreamCore({ signals, weather }: {
  signals: DreamSignals | undefined; weather: DreamWeather | undefined;
}) {
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, [breathe]);

  const color  = collectiveColor(signals, weather);
  const s1Op   = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.26, 0.55] });
  const s1Sc   = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] });
  const s2Op   = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.26] });
  const s2Sc   = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.91, 1.09] });
  const s3Op   = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.12] });
  const s3Sc   = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.14] });

  const total  = weather?.totalDreamers ?? signals?.dreamCount ?? 0;
  const topEm  = [...(signals?.emotions ?? [])].sort((a, b) => b.count - a.count)[0];
  const topThm = [...(signals?.themes   ?? [])].sort((a, b) => b.count - a.count)[0];
  const topSym = [...(signals?.symbols  ?? [])].sort((a, b) => b.count - a.count)[0];

  return (
    <View style={l1.wrap}>
      <View style={l1.orbWrap}>
        {ORB_PARTICLES.map(p => (
          <View key={p.id} style={[l1.particle, {
            left: ORB_W / 2 + p.x - p.size / 2, top: ORB_W / 2 + p.y - p.size / 2,
            width: p.size, height: p.size, borderRadius: p.size / 2,
            backgroundColor: color, opacity: p.op,
          }]} />
        ))}
        <Animated.View style={[l1.orb3, { backgroundColor: color, opacity: s3Op, transform: [{ scale: s3Sc }] }]} />
        <Animated.View style={[l1.orb2, { backgroundColor: color, opacity: s2Op, transform: [{ scale: s2Sc }] }]} />
        <Animated.View style={[l1.orb1, { backgroundColor: color, opacity: s1Op, transform: [{ scale: s1Sc }] }]} />
      </View>
      <View style={l1.row}>
        <View style={l1.col}>
          <Text style={[l1.colVal, { color }]}>{topEm ? cap(tr(topEm.name)) : '—'}</Text>
          <Text style={l1.colLabel}>DUYGU</Text>
        </View>
        <View style={l1.colCenter}>
          <Text style={l1.dreamer}>{total || '—'}</Text>
          <Text style={l1.dreamerLabel}>
            {!total ? 'rüyacı' : total === 1 ? 'bilinç aktif' : 'bilinç bir arada'}
          </Text>
        </View>
        <View style={l1.col}>
          <Text style={[l1.colVal, { color }]}>{topSym ? cap(tr(topSym.name)) : '—'}</Text>
          <Text style={l1.colLabel}>SEMBOL</Text>
        </View>
      </View>
      {topThm && (
        <View style={l1.themeRow}>
          <Text style={l1.themeVal}>{cap(tr(topThm.name))}</Text>
          <Text style={l1.themeLbl}>· TEMA</Text>
        </View>
      )}
    </View>
  );
}
const l1 = StyleSheet.create({
  wrap:        { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 20, alignItems: 'center', gap: 20 },
  orbWrap:     { width: ORB_W, height: ORB_W, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  particle:    { position: 'absolute' },
  orb1:        { position: 'absolute', width: 48,  height: 48,  borderRadius: 24 },
  orb2:        { position: 'absolute', width: 84,  height: 84,  borderRadius: 42 },
  orb3:        { position: 'absolute', width: 130, height: 130, borderRadius: 65 },
  row:         { flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between' },
  col:         { flex: 1, alignItems: 'center', gap: 4 },
  colCenter:   { flex: 1, alignItems: 'center', gap: 2 },
  colVal:      { fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
  colLabel:    { fontSize: 7.5, fontWeight: '900', letterSpacing: 1.8, color: 'rgba(255,255,255,0.25)' },
  dreamer:     { fontSize: 26, fontWeight: '900', color: 'rgba(255,255,255,0.85)', lineHeight: 28 },
  dreamerLabel:{ fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.28)', letterSpacing: 0.4 },
  themeRow:    { flexDirection: 'row', gap: 5, alignItems: 'center' },
  themeVal:    { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.48)' },
  themeLbl:    { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: 'rgba(255,255,255,0.22)' },
});

// ── L2: Tonight's Signal ──────────────────────────────────────────────────────

function TonightSignal({ signals, weather }: {
  signals: DreamSignals | undefined; weather: DreamWeather | undefined;
}) {
  const sentence = buildTonightSignal(signals, weather);
  return (
    <View style={l2.wrap}>
      <View style={l2.line} />
      <Text style={l2.text}>{sentence}</Text>
      <View style={l2.line} />
    </View>
  );
}
const l2 = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, gap: 12 },
  line: { width: 20, height: 1, backgroundColor: 'rgba(167,139,250,0.25)', flexShrink: 0 },
  text: { flex: 1, fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.52)', lineHeight: 22, fontStyle: 'italic', textAlign: 'center' },
});

// ── L3: Frequency Orbs ───────────────────────────────────────────────────────

function FrequencyOrb({ name, count, color, emoji, delay }: {
  name: string; count: number; color: string; emoji: string; delay: number;
}) {
  const breathe = useRef(new Animated.Value(0)).current;
  const entryA  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entryA, { toValue: 1, duration: 500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const lp = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 3200 + delay % 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 3200 + delay % 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    lp.start();
    return () => lp.stop();
  }, [breathe, entryA, delay]);
  const sc = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });
  const op = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.20, 0.45] });
  return (
    <Animated.View style={{ alignItems: 'center', gap: 8, opacity: entryA }}>
      <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', width: 52, height: 52, borderRadius: 26, backgroundColor: color, opacity: op, transform: [{ scale: sc }] }} />
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
      </View>
      <Text style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.65)', textAlign: 'center' }}>{name}</Text>
      <Text style={{ fontSize: 9.5, fontWeight: '600', color: 'rgba(255,255,255,0.28)' }}>{count} rüya</Text>
    </Animated.View>
  );
}

function DreamFrequencies({ signals }: { signals: DreamSignals | undefined }) {
  const themes = [...(signals?.themes ?? [])].sort((a, b) => b.count - a.count).slice(0, 5);
  if (themes.length === 0) return null;
  return (
    <View style={l3.wrap}>
      <Text style={l3.eyebrow}>BU GECENİN FREKANSLARI</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={l3.row}>
        {themes.map((t, i) => (
          <FrequencyOrb
            key={t.name}
            name={cap(tr(t.name))}
            count={t.count}
            color={STREAM_COLOR[t.name] ?? '#A78BFA'}
            emoji={STREAM_EMOJI[t.name] ?? '🌊'}
            delay={i * 80}
          />
        ))}
      </ScrollView>
    </View>
  );
}
const l3 = StyleSheet.create({
  wrap:    { paddingTop: 8, paddingBottom: 4 },
  eyebrow: { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)', paddingHorizontal: 24, marginBottom: 18 },
  row:     { paddingHorizontal: 24, gap: 28, paddingBottom: 4 },
});

// ── L4: Nearby Minds ─────────────────────────────────────────────────────────

type MindData = {
  id:       string;
  name:     string;
  initials: string;
  score:    number;
  emotions: string[];
  symbols:  string[];
};

function NearbyMinds() {
  const router = useRouter();
  const [previewId, setPreviewId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey:  ['matches', 'preview'],
    queryFn:   () => getMyMatches({ limit: 6 }),
    staleTime: 10 * 60 * 1000, retry: 1,
  });

  const matches = data?.items ?? [];

  const count = matches.filter(m => m.matchScore >= 40).length || matches.length;
  const allThemes = matches.flatMap(m => m.sharedThemes);
  const freq = allThemes.reduce<Record<string, number>>((a, t) => { a[t] = (a[t] ?? 0) + 1; return a; }, {});
  const topT = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
  const topTheme = topT ? cap(tr(topT[0])) : null;

  const seenIds = new Set<string>();
  const minds: MindData[] = matches
    .filter(m => { if (seenIds.has(m.matchingUserId)) return false; seenIds.add(m.matchingUserId); return true; })
    .slice(0, 5)
    .map(m => ({
      id:       m.matchingUserId,
      name:     m.matchingUserDisplayName ?? m.matchingUserUsername,
      initials: (m.matchingUserDisplayName ?? m.matchingUserUsername).slice(0, 2).toUpperCase(),
      score:    Math.round(m.matchScore),
      emotions: m.sharedEmotions.slice(0, 3),
      symbols:  m.sharedSymbols.slice(0, 3),
    }));

  const previewMind = previewId ? (minds.find(m => m.id === previewId) ?? null) : null;

  if (minds.length === 0) return null;

  return (
    <View style={l4.wrap}>
      <Text style={l4.eyebrow}>YAKINDAKI BİLİNÇLER</Text>
      <Text style={l4.headline}>
        {`${count} bilinç senin rüya izlerinle örtüşüyor.`}
        {topTheme ? `\n"${topTheme}" frekansında buluşuyorsunuz.` : ''}
      </Text>
      <View style={l4.orbs}>
        {minds.map(m => (
          <Pressable key={m.id} onPress={() => setPreviewId(m.id)} style={l4.mindOrb}>
            <View style={[l4.orbCircle, { opacity: 0.60 + (m.score / 100) * 0.40 }]}>
              <Text style={l4.orbInitials}>{m.initials}</Text>
            </View>
            <Text style={l4.orbScore}>{m.score}%</Text>
          </Pressable>
        ))}
        {count > 5 && (
          <Pressable onPress={() => router.push('/nearby-minds' as never)} style={l4.mindOrb}>
            <View style={[l4.orbCircle, { backgroundColor: 'rgba(167,139,250,0.08)' }]}>
              <Text style={l4.orbMore}>+{count - 5}</Text>
            </View>
            <Text style={l4.orbScore}>daha</Text>
          </Pressable>
        )}
      </View>
      <Pressable onPress={() => router.push('/nearby-minds' as never)} style={({ pressed }) => [l4.cta, { opacity: pressed ? 0.70 : 1 }]}>
        <Text style={l4.ctaText}>Tümünü Gör</Text>
        <Ionicons name="arrow-forward" size={11} color="#A78BFA" />
      </Pressable>

      {/* Profile preview modal */}
      <Modal
        visible={!!previewId}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewId(null)}
        statusBarTranslucent
      >
        <Pressable style={nm.overlay} onPress={() => setPreviewId(null)}>
          {previewMind && (
            <Pressable style={nm.sheet}>
              <View style={nm.handle} />
              <View style={nm.topRow}>
                <View style={nm.bigOrb}>
                  <Text style={nm.bigInit}>{previewMind.initials}</Text>
                </View>
                <View style={nm.metaWrap}>
                  <Text style={nm.name}>{previewMind.name}</Text>
                  <Text style={nm.score}>{previewMind.score}% Rezonans</Text>
                </View>
              </View>
              {previewMind.emotions.length > 0 && (
                <View style={nm.section}>
                  <Text style={nm.sLabel}>ORTAK DUYGULAR</Text>
                  <View style={nm.chips}>
                    {previewMind.emotions.map(e => (
                      <View key={e} style={nm.chip}><Text style={nm.chipTxt}>{cap(tr(e))}</Text></View>
                    ))}
                  </View>
                </View>
              )}
              {previewMind.symbols.length > 0 && (
                <View style={nm.section}>
                  <Text style={nm.sLabel}>ORTAK SEMBOLLER</Text>
                  <View style={nm.chips}>
                    {previewMind.symbols.map(s => (
                      <View key={s} style={nm.chip}><Text style={nm.chipTxt}>{cap(tr(s))}</Text></View>
                    ))}
                  </View>
                </View>
              )}
              <Pressable
                style={({ pressed }) => [nm.cta, { opacity: pressed ? 0.75 : 1 }]}
                onPress={() => { setPreviewId(null); router.push(`/user/${previewMind.id}` as never); }}
              >
                <Text style={nm.ctaTxt}>Profili Gör</Text>
                <Ionicons name="arrow-forward" size={12} color="#A78BFA" />
              </Pressable>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}
const l4 = StyleSheet.create({
  wrap:       { paddingHorizontal: 24, paddingVertical: 20, gap: 16 },
  eyebrow:    { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  headline:   { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.65)', lineHeight: 23, fontStyle: 'italic' },
  orbs:       { flexDirection: 'row', gap: 14, alignItems: 'flex-end' },
  mindOrb:    { alignItems: 'center', gap: 5 },
  orbCircle:  { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(108,99,255,0.28)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.30)', alignItems: 'center', justifyContent: 'center' },
  orbInitials:{ fontSize: 13, fontWeight: '900', color: 'rgba(255,255,255,0.80)' },
  orbMore:    { fontSize: 12, fontWeight: '900', color: 'rgba(167,139,250,0.65)' },
  orbScore:   { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.28)' },
  cta:        { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  ctaText:    { fontSize: 12, fontWeight: '800', color: '#A78BFA' },
});
const nm = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:    { backgroundColor: '#0F0F23', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: 'rgba(167,139,250,0.12)', padding: 24, gap: 20, paddingBottom: 40 },
  handle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', alignSelf: 'center', marginBottom: 4 },
  topRow:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bigOrb:   { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(108,99,255,0.28)', borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.35)', alignItems: 'center', justifyContent: 'center' },
  bigInit:  { fontSize: 17, fontWeight: '900', color: 'rgba(255,255,255,0.80)' },
  metaWrap: { flex: 1, gap: 4 },
  name:     { fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.85)' },
  score:    { fontSize: 12, fontWeight: '700', color: '#A78BFA' },
  section:  { gap: 10 },
  sLabel:   { fontSize: 8, fontWeight: '900', letterSpacing: 2, color: 'rgba(255,255,255,0.25)' },
  chips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(108,99,255,0.12)', borderWidth: 1, borderColor: 'rgba(108,99,255,0.25)' },
  chipTxt:  { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.65)' },
  cta:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(167,139,250,0.08)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.18)', marginTop: 4 },
  ctaTxt:   { fontSize: 13, fontWeight: '800', color: '#A78BFA' },
});

// ── Thin resonance divider ────────────────────────────────────────────────────

function ResDivider() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginVertical: 4 }}>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(167,139,250,0.10)' }} />
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(167,139,250,0.22)', marginHorizontal: 10 }} />
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(167,139,250,0.10)' }} />
    </View>
  );
}

// ── Live indicator ────────────────────────────────────────────────────────────

function LiveIndicator() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.2,  duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.delay(600),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399', opacity: pulse }} />
  );
}

// ── L5: Dream Signal card ─────────────────────────────────────────────────────

const TAG_EMOJI: Record<string, string> = {
  deniz: '🌊', okyanus: '🌊', su: '💧', uçuş: '🌤', kuş: '🌤',
  ateş: '🔥', ışık: '✨', karanlık: '🌑', kapı: '🚪', anahtar: '🗝',
  ay: '🌙', rüzgâr: '💨', orman: '🌿', dağ: '⛰', ayna: '🪞',
  gölge: '👤', köprü: '🌉', ev: '🏠', güneş: '🌞', yılan: '🐍',
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'şimdi';
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s`;
  return `${Math.floor(h / 24)}g`;
}

function resonanceDots(n: number): number {
  if (n >= 20) return 5; if (n >= 10) return 4; if (n >= 5) return 3;
  if (n >= 2)  return 2; if (n >= 1)  return 1; return 0;
}

function DreamSignal({ dream }: { dream: Dream }) {
  const router   = useRouter();
  const accent   = CAT_ACCENT[dream.category];
  const label    = CAT_LABEL[dream.category];
  const dots     = resonanceDots(dream.likeCount ?? 0);
  const username = dream.author?.username ?? 'anonim';
  const initials = (dream.author?.username ?? 'A').slice(0, 2).toUpperCase();
  const userId   = dream.author?.id ?? dream.userId;
  const hasRing  = (dream.likeCount ?? 0) >= 2;
  const tags     = (dream.tags ?? [])
    .filter(t => !t.startsWith('p:') && !t.startsWith('yer:'))
    .map(t => ({ raw: t, label: tr(t) })).slice(0, 3);

  return (
    <Pressable
      style={({ pressed }) => [sig.wrap, { opacity: pressed ? 0.88 : 1 }]}
      onPress={() => router.push(`/dream/${dream.id}`)}
    >
      {/* Vertical resonance glow */}
      <View style={[sig.glow, { backgroundColor: accent }]} />

      <View style={sig.body}>
        {/* Avatar row */}
        <View style={sig.avatarRow}>
          <Pressable onPress={() => router.push(`/user/${userId}` as never)} hitSlop={4}>
            <View style={[sig.avatar, hasRing && { borderColor: `${accent}66`, borderWidth: 1.5 }]}>
              <Text style={sig.avatarInit}>{initials}</Text>
            </View>
          </Pressable>
          <View style={sig.avatarMeta}>
            <Text style={sig.avatarName}>@{username}</Text>
            <Text style={sig.avatarTime}>{formatRelativeTime(dream.createdAt)}</Text>
          </View>
          <Text style={[sig.catLabel, { color: `${accent}CC` }]}>{label}</Text>
        </View>

        {dream.title ? <Text style={sig.title} numberOfLines={1}>{dream.title}</Text> : null}
        <Text style={sig.excerpt} numberOfLines={2}>{dream.content}</Text>

        {tags.length > 0 && (
          <View style={sig.tagRow}>
            {tags.map(({ raw, label: l }) => (
              <Text key={raw} style={[sig.tag, { color: `${accent}88` }]}>
                {TAG_EMOJI[l.toLowerCase()] ?? '·'}  {l}
              </Text>
            ))}
          </View>
        )}

        {/* Resonance dots + decode link */}
        <View style={sig.footer}>
          <View style={sig.dots}>
            {Array.from({ length: 5 }, (_, i) => (
              <View key={i} style={[sig.dot, { backgroundColor: i < dots ? accent : 'rgba(255,255,255,0.07)' }]} />
            ))}
          </View>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => router.push(`/dream-decode/${dream.id}`)} style={({ pressed }) => [sig.decode, { opacity: pressed ? 0.65 : 1 }]}>
            <Ionicons name="logo-electron" size={10} color={`${accent}70`} />
            <Text style={[sig.decodeTxt, { color: `${accent}90` }]}>Rüyayı Çöz</Text>
          </Pressable>
        </View>

        {/* Social action bar */}
        <LikeSaveBar dream={dream} queryKey={[...FEED_KEY]} />
      </View>
    </Pressable>
  );
}
const sig = StyleSheet.create({
  wrap:       { flexDirection: 'row', marginHorizontal: 24, marginBottom: 22 },
  glow:       { width: 2, borderRadius: 1, opacity: 0.55, marginRight: 14, marginTop: 4 },
  body:       { flex: 1, gap: 8 },
  avatarRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:     { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(108,99,255,0.20)', alignItems: 'center', justifyContent: 'center' },
  avatarInit: { fontSize: 11, fontWeight: '900', color: 'rgba(255,255,255,0.70)' },
  avatarMeta: { flex: 1, gap: 1 },
  avatarName: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.48)' },
  avatarTime: { fontSize: 10, color: 'rgba(255,255,255,0.20)' },
  catLabel:   { fontSize: 8.5, fontWeight: '900', letterSpacing: 1.8 },
  title:      { fontSize: 17, fontWeight: '800', color: 'rgba(255,255,255,0.90)', lineHeight: 22, letterSpacing: -0.3 },
  excerpt:    { fontSize: 13, color: 'rgba(255,255,255,0.40)', lineHeight: 20 },
  tagRow:     { flexDirection: 'row', gap: 12 },
  tag:        { fontSize: 11, fontWeight: '700' },
  footer:     { flexDirection: 'row', alignItems: 'center', paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.05)' },
  dots:       { flexDirection: 'row', gap: 3 },
  dot:        { width: 5, height: 5, borderRadius: 3 },
  decode:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  decodeTxt:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
});

// ── Header ────────────────────────────────────────────────────────────────────

function HomeHeader() {
  return (
    <View style={hdr.wrap}>
      <View style={hdr.wordRow}>
        <Text style={hdr.wordDream}>Dream</Text>
        <Text style={hdr.wordCloud}>Cloud</Text>
      </View>
    </View>
  );
}
const hdr = StyleSheet.create({
  wrap:      { alignItems: 'center', justifyContent: 'center', paddingTop: 6, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(167,139,250,0.08)' },
  wordRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  wordDream: { fontSize: 16, letterSpacing: 1.2, color: '#C4B5FD', fontWeight: Platform.OS === 'ios' ? '200' : '300' },
  wordCloud: { fontSize: 16, letterSpacing: 1.2, color: '#FFFFFF', fontWeight: Platform.OS === 'ios' ? '300' : '400' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function PublicFeedScreen() {
  const {
    data: feedData, isLoading: feedLoading, isFetchingNextPage,
    fetchNextPage, hasNextPage, refetch, isRefetching,
  } = useInfiniteQuery({
    queryKey:         [...FEED_KEY],
    queryFn:          ({ pageParam }) => getPublicFeed(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage.meta;
      return page < pages ? page + 1 : undefined;
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: weather } = useQuery({ queryKey: ['weather', 'now'],   queryFn: getWeatherNow,   staleTime: 5 * 60 * 1000, retry: 1 });
  const { data: signals } = useQuery({ queryKey: ['signals', 'today'], queryFn: getSignalsToday, staleTime: 10 * 60 * 1000 });

  const allDreams = useMemo(() => feedData?.pages.flatMap(p => p.items) ?? [], [feedData]);

  const onRefresh    = useCallback(() => { void refetch(); }, [refetch]);
  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderDream  = useCallback(({ item }: { item: Dream }) => <DreamSignal dream={item} />, []);
  const extractKey   = useCallback((item: Dream) => item.id, []);

  const FeedHeader = useCallback(() => (
    <>
      <CollectiveDreamCore signals={signals} weather={weather} />
      <TonightSignal signals={signals} weather={weather} />
      <ResDivider />
      <View style={{ paddingTop: 20 }}>
        <DreamFrequencies signals={signals} />
      </View>
      <ResDivider />
      <View style={{ paddingTop: 16 }}>
        <NearbyMinds />
      </View>
      <ResDivider />
      <View style={{ paddingTop: 8, paddingHorizontal: 24, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <LiveIndicator />
        <Text style={{ fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' }}>CANLI RÜYALAR</Text>
      </View>
    </>
  ), [signals, weather]);

  const ListEmpty = useCallback(() => {
    if (feedLoading) return <DreamCardSkeleton count={3} />;
    return (
      <View style={sc.empty}>
        <MoonIcon size={40} color="rgba(255,255,255,0.15)" />
        <Text style={sc.emptyTxt}>Bu gece henüz yeni rüya paylaşılmadı.</Text>
      </View>
    );
  }, [feedLoading]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#04030F' }} edges={['top']}>
      <HomeStars />
      <HomeHeader />
      <FlatList
        data={allDreams}
        keyExtractor={extractKey}
        renderItem={renderDream}
        ListHeaderComponent={FeedHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={isFetchingNextPage
          ? <ActivityIndicator size="small" color={Colors.primary} style={{ paddingVertical: 20 }} />
          : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !feedLoading}
            onRefresh={onRefresh}
            tintColor="#6C63FF"
            colors={['#6C63FF']}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </SafeAreaView>
  );
}

const sc = StyleSheet.create({
  empty:    { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32, gap: 12 },
  emptyTxt: { fontSize: 14, color: 'rgba(255,255,255,0.30)', textAlign: 'center', lineHeight: 22 },
});
