import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
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
import { getMyConnections } from '@/api/matches.api';
import { getMyDreams } from '@/api/dreams.api';
import Avatar from '@/components/Avatar';
import { Colors } from '@/constants/colors';
import { BackIcon } from '@/design/icons';
import type { DreamIdentity } from '@/types/identity.types';
import type { ConnectionSummary } from '@/types/match.types';
import type { Dream } from '@/types/dream.types';

const { width: W } = Dimensions.get('window');

// ── Metadata maps ─────────────────────────────────────────────────────────────

const EMOTION_COLOR: Record<string, string> = {
  fear: '#EF4444', anxiety: '#F87171', dread: '#DC2626',
  curiosity: '#A78BFA', wonder: '#8B5CF6', awe: '#7C3AED',
  sadness: '#60A5FA', grief: '#3B82F6', longing: '#93C5FD',
  hope: '#34D399', joy: '#FBBF24', peace: '#22D3EE',
  serenity: '#06B6D4', warmth: '#F97316', liberation: '#86EFAC',
  unease: '#FCD34D', melancholy: '#6D28D9', nostalgia: '#F472B6',
  loneliness: '#818CF8', bittersweet: '#C084FC', clarity: '#67E8F9',
  love: '#F472B6', anger: '#EF4444', excitement: '#FBBF24', calm: '#6EE7B7',
};

const EMOTION_TR: Record<string, string> = {
  fear: 'Korku', anxiety: 'Kaygı', dread: 'Tedirginlik',
  curiosity: 'Merak', wonder: 'Hayranlık', awe: 'Huşu',
  sadness: 'Keder', grief: 'Yas', longing: 'Özlem',
  hope: 'Umut', joy: 'Sevinç', peace: 'Huzur',
  serenity: 'Sükunet', warmth: 'Sıcaklık', liberation: 'Özgürlük',
  unease: 'Huzursuzluk', melancholy: 'Melankoli', nostalgia: 'Nostalji',
  loneliness: 'Yalnızlık', bittersweet: 'Tatlı-Acı', clarity: 'Netlik',
  love: 'Aşk', anger: 'Öfke', excitement: 'Heyecan', calm: 'Sükunet',
};

const SYMBOL_EMOJI: Record<string, string> = {
  threshold: '🚪', shadow: '🌑', flood: '🌊', guide: '🌟',
  flying: '🌤', transformation: '⚡', labyrinth: '🌀', fire: '🔥',
  mirror: '🪞', abyss: '🕳', falling: '💫', child: '🌱',
  palace: '🏰', ice: '❄', water: '💧', mountain: '⛰',
  bridge: '🌉', key: '🗝', wind: '💨', forest: '🌿',
  road: '🛤', eye: '👁', clock: '⏳', pursuit: '🏃',
  death: '💀', birth: '🌸', door: '🚪', sea: '🌊',
  tree: '🌳', light: '✨', vehicle: '🚂', animal: '🦁',
};

const SYMBOL_TR: Record<string, string> = {
  threshold: 'Eşik', shadow: 'Gölge', flood: 'Sel', guide: 'Rehber',
  flying: 'Uçuş', transformation: 'Dönüşüm', labyrinth: 'Labirent', fire: 'Ateş',
  mirror: 'Ayna', abyss: 'Uçurum', falling: 'Düşüş', child: 'Çocuk',
  palace: 'Saray', ice: 'Buz', water: 'Su', mountain: 'Dağ',
  bridge: 'Köprü', key: 'Anahtar', wind: 'Rüzgar', forest: 'Orman',
  road: 'Yol', eye: 'Göz', clock: 'Saat', pursuit: 'Kovalamaç',
  death: 'Ölüm', birth: 'Doğuş', door: 'Kapı', sea: 'Deniz',
  tree: 'Ağaç', light: 'Işık', vehicle: 'Araç', animal: 'Hayvan',
  discovery: 'Keşif', exposure: 'İfşa', mirror_self: 'İç Yansıma', ocean: 'Okyanus',
};

const LOCATION_TR: Record<string, string> = {
  ocean: 'Deniz', forest: 'Orman', house: 'Ev', mountain: 'Dağ',
  city: 'Şehir', school: 'Okul', hospital: 'Hastane', temple: 'Tapınak',
  desert: 'Çöl', cave: 'Mağara', bridge: 'Köprü', garden: 'Bahçe',
  road: 'Yol', tunnel: 'Tünel', beach: 'Sahil', island: 'Ada',
  home: 'Ev', village: 'Köy', castle: 'Kale', space: 'Uzay',
  sea: 'Deniz', lake: 'Göl', river: 'Nehir', park: 'Park',
};

// Safely converts both 0–1 decimals AND already-integer percentages to a clamped 0–100 value.
// Handles backend values like 265 (→ 100) or 0.68 (→ 68) equally.
const toPct = (v: number): number =>
  Math.min(100, Math.max(0, Math.round(v > 1 ? v : v * 100)));

const moodToEmotion = (avg: number): { label: string; color: string } => {
  if (avg >= 70) return { label: 'Huzur',     color: '#22D3EE' };
  if (avg >= 50) return { label: 'Dönüşüm',   color: '#A78BFA' };
  if (avg >= 35) return { label: 'Merak',      color: '#60A5FA' };
  return              { label: 'Kaygı',       color: '#F87171' };
};

const RESONANCE_COLOR: Record<string, string> = {
  signal: '#60A5FA', resonance: '#A78BFA', strong: '#6C63FF',
  deep: '#F472B6', mirror: '#FBBF24',
};
const RESONANCE_TR: Record<string, string> = {
  signal: 'SİNYAL', resonance: 'REZONANS', strong: 'GÜÇLÜ',
  deep: 'DERİN', mirror: 'AYNA',
};

const MONTH_TR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
const THEME_PALETTE = ['#A78BFA','#60A5FA','#34D399','#FBBF24','#F472B6','#67E8F9'];

// ── Section divider ───────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <View style={dv.row}>
      <View style={dv.line} />
      <Text style={dv.text}>{label}</Text>
      <View style={dv.line} />
    </View>
  );
}
const dv = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(108,99,255,0.22)' },
  text: { fontSize: 9, fontWeight: '900', letterSpacing: 2.5, color: 'rgba(108,99,255,0.55)' },
});

// ── Ambient background field ──────────────────────────────────────────────────

function AmbientField() {
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;
  const pts  = useRef(
    Array.from({ length: 14 }, (_, i) => ({
      id: i, x: Math.random() * W, y: 60 + Math.random() * 1600,
      size: 1 + Math.random() * 2,
      anim: new Animated.Value(0),
      dur:  14000 + Math.random() * 10000,
      delay: Math.random() * 10000,
    }))
  ).current;

  useEffect(() => {
    const a1 = Animated.loop(Animated.sequence([
      Animated.timing(orb1, { toValue: 1, duration: 11000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(orb1, { toValue: 0, duration: 11000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const a2 = Animated.loop(Animated.sequence([
      Animated.delay(5500),
      Animated.timing(orb2, { toValue: 1, duration: 11000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(orb2, { toValue: 0, duration: 11000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const pls = pts.map(p => {
      const l = Animated.loop(Animated.sequence([
        Animated.delay(p.delay),
        Animated.timing(p.anim, { toValue: 1, duration: p.dur, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(p.anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]));
      l.start(); return l;
    });
    a1.start(); a2.start();
    return () => { a1.stop(); a2.stop(); pls.forEach(l => l.stop()); };
  }, [orb1, orb2, pts]);

  const o1Op = orb1.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.09] });
  const o2Op = orb2.interpolate({ inputRange: [0, 1], outputRange: [0.02, 0.06] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[af.orb, { top: 40, left: -70, opacity: o1Op }]} />
      <Animated.View style={[af.orb, { top: 580, right: -90, width: 250, height: 250, borderRadius: 125, opacity: o2Op }]} />
      {pts.map(p => {
        const op = p.anim.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 0.5, 0.12, 0] });
        const ty = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -1000] });
        return (
          <Animated.View
            key={p.id}
            style={{
              position: 'absolute', left: p.x, top: p.y,
              width: p.size, height: p.size, borderRadius: p.size / 2,
              backgroundColor: Colors.primary, opacity: op,
              transform: [{ translateY: ty }],
            }}
          />
        );
      })}
    </View>
  );
}
const af = StyleSheet.create({
  orb: { position: 'absolute', width: 290, height: 290, borderRadius: 145, backgroundColor: Colors.primary },
});

// ── 1. Consciousness Journey ──────────────────────────────────────────────────

function ConsciousnessJourney({
  identity, activeDreams,
}: { identity: DreamIdentity; activeDreams: number }) {
  const breathe = useRef(new Animated.Value(0)).current;
  const ring1   = useRef(new Animated.Value(0)).current;
  const ring2   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const b  = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const r1 = Animated.loop(Animated.sequence([
      Animated.timing(ring1, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(ring1, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const r2 = Animated.loop(Animated.sequence([
      Animated.delay(3000),
      Animated.timing(ring2, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(ring2, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    b.start(); r1.start(); r2.start();
    return () => { b.stop(); r1.stop(); r2.stop(); };
  }, [breathe, ring1, ring2]);

  const glowOp = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.07, 0.18] });
  const glowSc = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] });
  const r1Sc   = ring1.interpolate({ inputRange: [0, 1], outputRange: [1.00, 1.10] });
  const r1Op   = ring1.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.06] });
  const r2Sc   = ring2.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1.18] });
  const r2Op   = ring2.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.03] });

  const resLabel =
    identity.resonanceScore >= 80 ? 'Ayna'
    : identity.resonanceScore >= 60 ? 'Derin'
    : identity.resonanceScore >= 40 ? 'Güçlü'
    : identity.resonanceScore >= 20 ? 'Rezonans'
    : 'Sinyal';

  const stats = [
    { label: 'Toplam Rüya', value: String(identity.dreamCount) },
    { label: 'Aktif Gece',  value: activeDreams > 0 ? `${activeDreams}+` : '—' },
    { label: 'Rezonans',    value: `${Math.round(identity.resonanceScore)}%` },
    { label: 'Seviye',      value: resLabel },
  ];

  return (
    <View style={cj.wrap}>
      <View style={cj.orbWrap}>
        <Animated.View style={[cj.ring2, { transform: [{ scale: r2Sc }], opacity: r2Op }]} />
        <Animated.View style={[cj.ring1, { transform: [{ scale: r1Sc }], opacity: r1Op }]} />
        <Animated.View style={[cj.glow,  { transform: [{ scale: glowSc }], opacity: glowOp }]} />
        <View style={cj.orb}>
          <Text style={cj.orbEmoji}>{identity.primaryArchetypeEmoji || '🌙'}</Text>
        </View>
      </View>
      <View style={cj.grid}>
        {stats.map((s, i) => (
          <View key={i} style={cj.node}>
            <Text style={cj.nodeVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{s.value}</Text>
            <Text style={cj.nodeLbl}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const cj = StyleSheet.create({
  wrap:     { alignItems: 'center', gap: 28 },
  orbWrap:  { width: 168, height: 168, alignItems: 'center', justifyContent: 'center' },
  orb:      { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryGlow, borderWidth: 1, borderColor: 'rgba(108,99,255,0.40)', alignItems: 'center', justifyContent: 'center' },
  orbEmoji: { fontSize: 32 },
  glow:     { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: Colors.primary },
  ring1:    { position: 'absolute', width: 116, height: 116, borderRadius: 58,  borderWidth: 1, borderColor: Colors.primary },
  ring2:    { position: 'absolute', width: 160, height: 160, borderRadius: 80,  borderWidth: 1, borderColor: Colors.primary },
  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: W - 48 },
  node:     { width: (W - 68) / 2, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(108,99,255,0.14)', padding: 16, alignItems: 'center', gap: 6 },
  nodeVal:  { fontSize: 24, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5, textAlign: 'center' },
  nodeLbl:  { fontSize: 10, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.5, textAlign: 'center' },
});

// ── 2. Dream Timeline ─────────────────────────────────────────────────────────

interface MonthBar { key: string; label: string; count: number; idx: number; emotion: { label: string; color: string } | null }

function TimelineBar({ bar, maxCount, index }: { bar: MonthBar; maxCount: number; index: number }) {
  const breathe = useRef(new Animated.Value(0)).current;
  const active  = bar.count > 0;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(index * 280),
      Animated.timing(breathe, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [breathe, active, index]);

  const dotSc = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] });
  const dotOp = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.50, 1.00] });

  const BAR_MAX = 76;
  const barH    = maxCount > 0 ? Math.max(3, (bar.count / maxCount) * BAR_MAX) : 3;
  const color   = active ? THEME_PALETTE[index % THEME_PALETTE.length] ?? Colors.primary : 'rgba(255,255,255,0.08)';

  return (
    <View style={tl.col}>
      <Animated.View style={[tl.dot, { backgroundColor: color, transform: [{ scale: dotSc }], opacity: active ? dotOp : 0.20 }]} />
      <View style={tl.barTrack}>
        <View style={[tl.bar, { height: barH, backgroundColor: color, opacity: active ? 0.80 : 0.18 }]} />
      </View>
      <Text style={[tl.count, { color: active ? Colors.textSecondary : Colors.textMuted }]}>
        {active ? String(bar.count) : '·'}
      </Text>
      <Text style={tl.label}>{bar.label}</Text>
      {bar.emotion && active && (
        <Text style={[tl.emoLabel, { color: bar.emotion.color }]}>{bar.emotion.label}</Text>
      )}
    </View>
  );
}

function DreamTimeline({ dreams }: { dreams: Dream[] }) {
  const bars = useMemo<MonthBar[]>(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d        = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key      = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const month    = dreams.filter(dr => dr.createdAt.startsWith(key));
      const count    = month.length;
      const withMood = month.filter(dr => dr.moodScore !== null);
      const avgMood  = withMood.length > 0
        ? withMood.reduce((s, dr) => s + (dr.moodScore ?? 0), 0) / withMood.length
        : null;
      const emotion  = avgMood !== null ? moodToEmotion(avgMood) : null;
      return { key, label: MONTH_TR[d.getMonth()] ?? '—', count, idx: i, emotion };
    });
  }, [dreams]);

  const maxCount = Math.max(1, ...bars.map(b => b.count));

  return (
    <View style={tl.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tl.scroll}>
        {bars.map((b, i) => (
          <TimelineBar key={b.key} bar={b} maxCount={maxCount} index={i} />
        ))}
      </ScrollView>
      {/* Bottom legend */}
      <Text style={tl.legend}>Son 6 ay · {dreams.length} rüya kayıt</Text>
    </View>
  );
}
const tl = StyleSheet.create({
  wrap:     { gap: 12 },
  scroll:   { paddingHorizontal: 4, gap: 14, alignItems: 'flex-end', paddingBottom: 4 },
  col:      { alignItems: 'center', gap: 7, minWidth: 42 },
  dot:      { width: 10, height: 10, borderRadius: 5 },
  barTrack: { height: 76, justifyContent: 'flex-end' },
  bar:      { width: 4, borderRadius: 2 },
  count:    { fontSize: 10, fontWeight: '800' },
  label:    { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.3 },
  legend:   { fontSize: 10, color: Colors.textMuted, textAlign: 'center', opacity: 0.55 },
  emoLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 0.3, marginTop: 1, textAlign: 'center' },
});

// ── 3. Symbol Constellation ───────────────────────────────────────────────────

function SymbolNode({ symbol, index }: { symbol: string; index: number }) {
  const breathe = useRef(new Animated.Value(0)).current;
  const dur     = 3000 + (index * 190) % 1800;
  const del     = (index * 380) % 3200;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(del),
      Animated.timing(breathe, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [breathe, dur, del]);

  const scale  = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });
  const glowOp = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.50] });

  const size  = index < 3 ? 68 : index < 6 ? 56 : 46;
  const emoji = SYMBOL_EMOJI[symbol] ?? '·';
  const freq  = Math.max(1, 9 - index);

  return (
    <View style={[sn.wrap, { width: size + 20 }]}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[sn.glow, { width: size, height: size, borderRadius: size / 2, opacity: glowOp, transform: [{ scale }] }]} />
        <View style={[sn.orb, { width: size - 8, height: size - 8, borderRadius: (size - 8) / 2 }]}>
          <Text style={{ fontSize: index < 3 ? 24 : index < 6 ? 18 : 14 }}>{emoji}</Text>
        </View>
      </View>
      <Text style={sn.label} numberOfLines={1}>{SYMBOL_TR[symbol] ?? symbol}</Text>
      <View style={sn.freqRow}>
        {Array.from({ length: Math.min(freq, 5) }).map((_, fi) => (
          <View key={fi} style={[sn.dot, { opacity: 0.28 + fi * 0.15 }]} />
        ))}
      </View>
    </View>
  );
}
const sn = StyleSheet.create({
  wrap:    { alignItems: 'center', gap: 6 },
  glow:    { position: 'absolute', backgroundColor: Colors.primary },
  orb:     { backgroundColor: 'rgba(108,99,255,0.08)', borderWidth: 1, borderColor: 'rgba(108,99,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  label:   { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.38)', letterSpacing: 0.3, textAlign: 'center', maxWidth: 72 },
  freqRow: { flexDirection: 'row', gap: 3 },
  dot:     { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary },
});

// ── 4. Emotional Waves ────────────────────────────────────────────────────────

function EmotionWaveRow({ emotion, rank, total, index }: {
  emotion: string; rank: number; total: number; index: number;
}) {
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(index * 320),
      Animated.timing(wave, { toValue: 1, duration: 2800 + index * 220, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(wave, { toValue: 0, duration: 2800 + index * 220, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [wave, index]);

  const color = EMOTION_COLOR[emotion] ?? Colors.primary;
  const label = EMOTION_TR[emotion] ?? emotion;

  // Dominance ratio: rank 0 = 100%, last rank = ~40%
  const dominance = (total - rank) / total;
  const maxBarW   = W - 48 - 115; // label(88) + dot(7) + 2 gaps(20)
  const baseW     = Math.max(24, dominance * maxBarW);

  const barOp = wave.interpolate({ inputRange: [0, 1], outputRange: [0.50, 0.90] });
  const scX   = wave.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.00] });

  return (
    <View style={em.row}>
      <View style={[em.dot, { backgroundColor: color }]} />
      <Text style={em.label}>{label}</Text>
      <View style={em.track}>
        <Animated.View
          style={[em.bar, {
            width: baseW,
            backgroundColor: color,
            opacity: barOp,
            transform: [{ scaleX: scX }],
          }]}
        />
      </View>
    </View>
  );
}

function EmotionalWaves({ emotions }: { emotions: string[] }) {
  const top = emotions.slice(0, 7);
  return (
    <View style={em.wrap}>
      {top.map((e, i) => (
        <EmotionWaveRow key={e} emotion={e} rank={i} total={top.length} index={i} />
      ))}
    </View>
  );
}
const em = StyleSheet.create({
  wrap:  { gap: 16 },
  row:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot:   { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  label: { width: 88, fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.42)', flexShrink: 0 },
  track: { flex: 1, height: 3, overflow: 'hidden' },
  bar:   { height: 3, borderRadius: 2 },
});

// ── 5. Archetype Evolution ────────────────────────────────────────────────────

function ArchetypeEvolution({ identity }: { identity: DreamIdentity }) {
  const dims = [
    { label: 'Lucid',      value: identity.lucidScore,          color: '#A78BFA' },
    { label: 'Dönüşüm',   value: identity.transformationScore, color: '#60A5FA' },
    { label: 'Hayranlık', value: identity.wonderScore,          color: '#FBBF24' },
    { label: 'Bağlantı',  value: identity.connectionScore,      color: '#34D399' },
  ];

  return (
    <View style={av.wrap}>
      <View style={av.cardRow}>
        <View style={av.card}>
          <View style={[av.cardGlow, { backgroundColor: Colors.primary }]} />
          <Text style={av.emoji}>{identity.primaryArchetypeEmoji || '🌙'}</Text>
          <Text style={av.name} numberOfLines={1}>{identity.primaryArchetypeName || '—'}</Text>
          <View style={av.track}>
            <View style={[av.fill, { width: `${toPct(identity.primaryArchetypeScore)}%`, backgroundColor: Colors.primary }]} />
          </View>
          <Text style={av.score}>{toPct(identity.primaryArchetypeScore)}%</Text>
        </View>
        <View style={[av.card, av.cardSec]}>
          <View style={[av.cardGlow, { backgroundColor: Colors.textMuted, opacity: 0.05 }]} />
          <Text style={[av.emoji, { fontSize: 26 }]}>{identity.secondaryArchetypeEmoji || '✦'}</Text>
          <Text style={[av.name, { color: Colors.textSecondary, fontSize: 12 }]} numberOfLines={1}>{identity.secondaryArchetypeName || '—'}</Text>
          <View style={av.track}>
            <View style={[av.fill, { width: `${toPct(identity.secondaryArchetypeScore)}%`, backgroundColor: Colors.textMuted }]} />
          </View>
          <Text style={[av.score, { color: Colors.textSecondary, fontSize: 18 }]}>{toPct(identity.secondaryArchetypeScore)}%</Text>
        </View>
      </View>
      <View style={av.bars}>
        {dims.map(d => (
          <View key={d.label} style={av.barRow}>
            <Text style={av.barLbl}>{d.label}</Text>
            <View style={av.barTrack}>
              <View style={[av.barFill, { width: `${toPct(d.value)}%`, backgroundColor: d.color }]} />
            </View>
            <Text style={[av.barVal, { color: d.color }]}>{toPct(d.value)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const av = StyleSheet.create({
  wrap:     { gap: 20 },
  cardRow:  { flexDirection: 'row', gap: 12 },
  card:     { flex: 1, padding: 16, borderRadius: 20, backgroundColor: 'rgba(108,99,255,0.07)', borderWidth: 1, borderColor: 'rgba(108,99,255,0.22)', alignItems: 'center', gap: 8, overflow: 'hidden' },
  cardSec:  { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' },
  cardGlow: { position: 'absolute', top: -24, width: 80, height: 80, borderRadius: 40, opacity: 0.08 },
  emoji:    { fontSize: 32 },
  name:     { fontSize: 13, fontWeight: '800', color: Colors.primary, letterSpacing: -0.2, textAlign: 'center' },
  track:    { width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' },
  fill:     { height: 3, borderRadius: 2 },
  score:    { fontSize: 22, fontWeight: '900', color: Colors.primary },
  bars:     { gap: 14 },
  barRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  barLbl:   { width: 76, fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.30)' },
  barTrack: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' },
  barFill:  { height: 3, borderRadius: 2 },
  barVal:   { width: 28, fontSize: 11, fontWeight: '800', textAlign: 'right' },
});

// ── 6. AI Reflection ──────────────────────────────────────────────────────────

function buildReflection(identity: DreamIdentity): string {
  if (identity.personalitySummary) return identity.personalitySummary;
  const archetype  = identity.primaryArchetypeName;
  const topEmotion = EMOTION_TR[identity.dominantEmotions[0] ?? ''] ?? identity.dominantEmotions[0] ?? '';
  const topTheme   = identity.dominantThemes[0] ?? '';
  const topSymbol  = SYMBOL_TR[identity.dominantSymbols[0] ?? ''] ?? identity.dominantSymbols[0] ?? '';
  if (!archetype && !topEmotion && !topTheme) {
    return 'Rüyaların birikdikçe bilinçaltın konuşmaya başlar…';
  }
  const parts: string[] = [];
  if (archetype)   parts.push(`${archetype} arketipiyle şekillenen bilinçaltın`);
  if (topEmotion)  parts.push(`en çok ${topEmotion.toLowerCase()} duygusunu taşıyor`);
  if (topTheme)    parts.push(`"${topTheme}" teması rüyalarında tekrar ediyor`);
  if (topSymbol)   parts.push(`${topSymbol} sembolü sık beliriyor`);
  const score = toPct(identity.resonanceScore);
  if (score > 10)  parts.push(`rezonans skorun %${score}`);
  return parts.join(', ') + '.';
}

function AIReflection({ identity }: { identity: DreamIdentity }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const pulseOp = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.12] });

  return (
    <View style={ar.wrap}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.primary, opacity: pulseOp, borderRadius: 20 }]} />
      <View style={ar.header}>
        <Ionicons name="sparkles-outline" size={12} color="rgba(167,139,250,0.75)" />
        <Text style={ar.label}>BİLİNÇALTI YANSIMALARI</Text>
      </View>
      <Text style={ar.body}>
        {buildReflection(identity)}
      </Text>
      {identity.dominantThemes.length > 0 && (
        <View style={ar.tags}>
          {identity.dominantThemes.slice(0, 6).map((t, i) => (
            <View key={i} style={ar.tag}>
              <Text style={ar.tagTxt}>{t}</Text>
            </View>
          ))}
        </View>
      )}
      {identity.dominantEmotions.length > 0 && (
        <View style={ar.emoRow}>
          {identity.dominantEmotions.slice(0, 4).map((em, i) => {
            const color = EMOTION_COLOR[em] ?? Colors.primary;
            return (
              <View key={i} style={[ar.emoBadge, { borderColor: `${color}44` }]}>
                <View style={[ar.emoDot, { backgroundColor: color }]} />
                <Text style={[ar.emoTxt, { color }]}>{EMOTION_TR[em] ?? em}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
const ar = StyleSheet.create({
  wrap:     { padding: 20, borderRadius: 20, backgroundColor: '#06041C', borderWidth: 1, borderColor: 'rgba(167,139,250,0.12)', gap: 14, overflow: 'hidden' },
  header:   { flexDirection: 'row', alignItems: 'center', gap: 7 },
  label:    { fontSize: 9, fontWeight: '900', letterSpacing: 2.5, color: 'rgba(167,139,250,0.55)' },
  body:     { fontSize: 15, color: 'rgba(255,255,255,0.58)', lineHeight: 24, fontStyle: 'italic' },
  muted:    { fontSize: 13, color: 'rgba(255,255,255,0.25)', lineHeight: 22, fontStyle: 'italic' },
  tags:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag:      { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(167,139,250,0.08)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.18)' },
  tagTxt:   { fontSize: 11, fontWeight: '700', color: 'rgba(196,181,253,0.75)' },
  emoRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emoBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.02)' },
  emoDot:   { width: 5, height: 5, borderRadius: 3 },
  emoTxt:   { fontSize: 10, fontWeight: '700' },
});

// ── 7. Personal Resonance ─────────────────────────────────────────────────────

function PersonalResonance({ connections }: { connections: ConnectionSummary[] }) {
  const router = useRouter();

  if (connections.length === 0) {
    return (
      <View style={re.empty}>
        <Text style={re.emptyTitle}>Henüz kesişen bilinç yok</Text>
        <Text style={re.emptySub}>Daha fazla rüya paylaştıkça bilinçler kesişmeye başlar</Text>
      </View>
    );
  }

  return (
    <View style={re.list}>
      {connections.slice(0, 5).map((c, i) => {
        const color = RESONANCE_COLOR[c.topResonanceLevel] ?? Colors.primary;
        const level = RESONANCE_TR[c.topResonanceLevel] ?? '—';
        const name  = c.displayName ?? c.username;
        return (
          <Pressable
            key={c.userId}
            style={({ pressed }) => [re.row, { opacity: pressed ? 0.74 : 1 }]}
            onPress={() => router.push(`/user/${c.userId}` as any)}
          >
            <View style={[re.line, { backgroundColor: color, opacity: 0.80 - i * 0.12 }]} />
            <Avatar name={name} size={40} />
            <View style={re.info}>
              <View style={re.nameRow}>
                <Text style={re.name} numberOfLines={1}>{name}</Text>
                <View style={[re.badge, { borderColor: `${color}44` }]}>
                  <Text style={[re.badgeTxt, { color }]}>{level}</Text>
                </View>
              </View>
              {c.sharedThemes.length > 0 && (
                <Text style={re.themes} numberOfLines={1}>{c.sharedThemes.slice(0, 2).join(' · ')}</Text>
              )}
            </View>
            <Text style={[re.score, { color }]}>{Math.round(c.topMatchScore)}%</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
const re = StyleSheet.create({
  list:       { gap: 10 },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: Colors.border },
  line:       { width: 3, height: 38, borderRadius: 2 },
  info:       { flex: 1, gap: 4 },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name:       { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  badge:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
  badgeTxt:   { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  themes:     { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  score:      { fontSize: 18, fontWeight: '900' },
  empty:      { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center' },
  emptySub:   { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
});

// ── 8. Recurring Dreams ───────────────────────────────────────────────────────

function RecurringChip({ text, color, emoji }: { text: string; color: string; emoji?: string }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dur  = 3200 + Math.random() * 1400;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const op = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.52, 1.00] });

  return (
    <Animated.View style={[rc.chip, { borderColor: `${color}40`, opacity: op }]}>
      {emoji
        ? <Text style={rc.chipEmoji}>{emoji}</Text>
        : <View style={[rc.chipDot, { backgroundColor: color }]} />}
      <Text style={[rc.chipTxt, { color }]}>{text}</Text>
    </Animated.View>
  );
}

function RecurringDreams({ identity }: { identity: DreamIdentity }) {
  const hasThemes    = identity.dominantThemes.length > 0;
  const hasSymbols   = identity.dominantSymbols.length > 0;
  const hasLocations = identity.dominantLocations.length > 0;

  if (!hasThemes && !hasSymbols && !hasLocations) {
    return (
      <View style={rc.empty}>
        <Text style={rc.emptyTxt}>Tekrarlayan örüntüler rüyalar biriktikçe belirginleşir</Text>
      </View>
    );
  }

  return (
    <View style={rc.wrap}>
      {hasThemes && (
        <View style={rc.group}>
          <Text style={rc.groupLbl}>TEKRARLAYAN TEMALAR</Text>
          <View style={rc.chips}>
            {identity.dominantThemes.slice(0, 6).map((t, i) => (
              <RecurringChip key={i} text={t} color={THEME_PALETTE[i % THEME_PALETTE.length] ?? Colors.primary} />
            ))}
          </View>
        </View>
      )}

      {hasSymbols && (
        <View style={rc.group}>
          <Text style={rc.groupLbl}>TEKRARLAYAN SEMBOLLER</Text>
          <View style={rc.chips}>
            {identity.dominantSymbols.slice(0, 6).map((sym, i) => (
              <RecurringChip key={i} text={SYMBOL_TR[sym] ?? sym} color={Colors.primary} emoji={SYMBOL_EMOJI[sym] ?? '·'} />
            ))}
          </View>
        </View>
      )}

      {hasLocations && (
        <View style={rc.group}>
          <Text style={rc.groupLbl}>TEKRARLAYAN MEKANLAR</Text>
          <View style={rc.chips}>
            {identity.dominantLocations.slice(0, 6).map((loc, i) => (
              <RecurringChip key={i} text={LOCATION_TR[loc] ?? loc} color="#34D399" emoji="📍" />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
const rc = StyleSheet.create({
  wrap:     { gap: 24 },
  group:    { gap: 12 },
  groupLbl: { fontSize: 9, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  chips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.02)' },
  chipDot:  { width: 6, height: 6, borderRadius: 3 },
  chipEmoji:{ fontSize: 13 },
  chipTxt:  { fontSize: 12, fontWeight: '700' },
  empty:    { alignItems: 'center', paddingVertical: 20 },
  emptyTxt: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
});

// ── 2b. Dream Evolution ───────────────────────────────────────────────────────

function DreamEvolution({ dreams }: { dreams: Dream[] }) {
  const evolution = useMemo(() => {
    const withMood = [...dreams]
      .filter(d => d.moodScore !== null)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (withMood.length < 4) return null;
    const third    = Math.max(1, Math.floor(withMood.length / 3));
    const avgMood  = (arr: typeof withMood) =>
      arr.reduce((s, d) => s + (d.moodScore ?? 0), 0) / arr.length;
    const firstAvg = avgMood(withMood.slice(0, third));
    const lastAvg  = avgMood(withMood.slice(-third));
    if (Math.abs(firstAvg - lastAvg) < 5) return null;
    return {
      first:     moodToEmotion(firstAvg),
      current:   moodToEmotion(lastAvg),
      direction: lastAvg > firstAvg ? 'up' : 'down',
    };
  }, [dreams]);

  if (!evolution) return null;

  const { first, current, direction } = evolution;
  const changeColor = direction === 'up' ? '#34D399' : '#60A5FA';
  const changeLabel = direction === 'up' ? 'Olgunlaşma' : 'Derinleşme';

  return (
    <View style={ev.row}>
      <View style={ev.node}>
        <Text style={ev.nodeLbl}>İLK RÜYALAR</Text>
        <View style={[ev.dot, { backgroundColor: first.color }]} />
        <Text style={[ev.emotion, { color: first.color }]}>{first.label}</Text>
      </View>
      <View style={ev.mid}>
        <Ionicons name="arrow-forward-outline" size={16} color={changeColor} style={{ opacity: 0.65 }} />
        <Text style={[ev.changeLbl, { color: changeColor }]}>{changeLabel}</Text>
      </View>
      <View style={ev.node}>
        <Text style={ev.nodeLbl}>ŞİMDİ</Text>
        <View style={[ev.dot, { backgroundColor: current.color }]} />
        <Text style={[ev.emotion, { color: current.color }]}>{current.label}</Text>
      </View>
    </View>
  );
}
const ev = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  node:      { flex: 1, alignItems: 'center', gap: 7, paddingVertical: 14, paddingHorizontal: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(108,99,255,0.14)' },
  nodeLbl:   { fontSize: 8, fontWeight: '900', letterSpacing: 1.8, color: 'rgba(255,255,255,0.25)' },
  dot:       { width: 10, height: 10, borderRadius: 5 },
  emotion:   { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  mid:       { alignItems: 'center', gap: 4 },
  changeLbl: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' },
});

// ── Loading skeleton ──────────────────────────────────────────────────────────

function JournalSkeleton() {
  const op = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(op, { toValue: 0.55, duration: 900, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0.25, duration: 900, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [op]);
  return (
    <Animated.View style={{ opacity: op, paddingHorizontal: 24, paddingTop: 20, gap: 16 }}>
      {[160, 110, 140, 100, 130, 110, 150, 120].map((h, i) => (
        <View key={i} style={{ height: h, borderRadius: 18, backgroundColor: Colors.surface }} />
      ))}
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DreamJournalScreen() {
  const router = useRouter();

  const { data: identity, isLoading: identLoading } = useQuery({
    queryKey: ['identity', 'me'],
    queryFn:  getMyIdentity,
    staleTime: 5 * 60 * 1000,
  });

  // Two pages for a wider timeline window.
  const { data: page1 } = useQuery({
    queryKey: ['dreams', 'me', 'journal', 1],
    queryFn:  () => getMyDreams(1),
    staleTime: 5 * 60 * 1000,
    enabled:  !!identity,
  });
  const { data: page2 } = useQuery({
    queryKey: ['dreams', 'me', 'journal', 2],
    queryFn:  () => getMyDreams(2),
    staleTime: 5 * 60 * 1000,
    enabled:  (page1?.meta.pages ?? 0) > 1,
  });

  const { data: connections } = useQuery({
    queryKey: ['matches', 'connections'],
    queryFn:  getMyConnections,
    staleTime: 5 * 60 * 1000,
    enabled:  !!identity,
  });

  const allDreams = useMemo(() => [
    ...(page1?.items ?? []),
    ...(page2?.items ?? []),
  ], [page1, page2]);

  const activeDreams = useMemo(() => {
    const days = new Set(allDreams.map(d => d.createdAt.slice(0, 10)));
    return days.size;
  }, [allDreams]);

  const hasSymbols  = (identity?.dominantSymbols.length  ?? 0) > 0;
  const hasEmotions = (identity?.dominantEmotions.length ?? 0) > 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <AmbientField />

      {/* Header */}
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <BackIcon size={20} color={Colors.primary} />
        </Pressable>
        <View style={s.titleWrap}>
          <Text style={s.title}>Rüya Günlüğü</Text>
          <Text style={s.subtitle}>BİLİNÇALTI ARŞİVİ</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {identLoading || !identity ? (
        <JournalSkeleton />
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* 1 — Consciousness Journey */}
          <SectionDivider label="BİLİNÇ YOLCULUĞU" />
          <ConsciousnessJourney identity={identity} activeDreams={activeDreams} />

          {/* 2 — Dream Timeline + Evolution */}
          <>
            <View style={s.gap} />
            <SectionDivider label="RÜYA ZAMANÇİZGİSİ" />
            <DreamTimeline dreams={allDreams} />
            <DreamEvolution dreams={allDreams} />
          </>

          {/* 3 — Symbol Constellation */}
          {hasSymbols && (
            <>
              <View style={s.gap} />
              <SectionDivider label="SEMBOL KONSTELASYONu" />
              <View style={s.cloud}>
                {identity.dominantSymbols.slice(0, 9).map((sym, i) => (
                  <SymbolNode key={sym} symbol={sym} index={i} />
                ))}
              </View>
            </>
          )}

          {/* 4 — Emotional Waves */}
          {hasEmotions && (
            <>
              <View style={s.gap} />
              <SectionDivider label="DUYGUSAL DALGALAR" />
              <EmotionalWaves emotions={identity.dominantEmotions} />
            </>
          )}

          {/* 5 — Archetype Evolution */}
          <>
            <View style={s.gap} />
            <SectionDivider label="ARKETİP EVRİMİ" />
            <ArchetypeEvolution identity={identity} />
          </>

          {/* 6 — AI Reflection */}
          <>
            <View style={s.gap} />
            <AIReflection identity={identity} />
          </>

          {/* 7 — Personal Resonance */}
          {connections !== undefined && (
            <>
              <View style={s.gap} />
              <SectionDivider label="KİŞİSEL REZONANS" />
              <PersonalResonance connections={connections} />
            </>
          )}

          {/* 8 — Recurring Dreams */}
          <>
            <View style={s.gap} />
            <SectionDivider label="TEKRARLAYAN RÜYALAR" />
            <RecurringDreams identity={identity} />
          </>

          <View style={{ height: 72 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(15,15,35,0.70)' },
  titleWrap: { alignItems: 'center', gap: 2 },
  title:     { fontSize: 20, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle:  { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 2.5 },
  scroll:    { paddingHorizontal: 24, paddingTop: 8 },
  gap:       { height: 44 },
  cloud:     { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
});
