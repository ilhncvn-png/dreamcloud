import { Animated, Dimensions, Easing, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import { getMyMatches } from '@/api/matches.api';
import { getMyClusters, getAllClusters } from '@/api/clusters.api';
import { getSignalsToday } from '@/api/signals.api';
import { getMyConnections as getDreamConnections } from '@/api/connections.api';
import {
  THEME_LABELS, EMOTION_LABELS, SYMBOL_CATEGORY_LABELS, ARCHETYPE_LABELS, labelOf,
} from '@/utils/resonance-labels';
import type { DreamMatch, ResonanceLevel } from '@/types/match.types';
import type { ClusterMembership } from '@/types/cluster.types';
import type { DreamSignals, SignalItem } from '@/types/signal.types';

const W = Dimensions.get('window').width;

// ── Shared constants ──────────────────────────────────────────────────────────

const LEVEL_TR: Record<ResonanceLevel, string> = {
  signal: 'Sinyal', resonance: 'Yankı', strong: 'Uyum', deep: 'Derin Rezonans', mirror: 'Ayna',
};
const LEVEL_COLOR: Record<ResonanceLevel, string> = {
  signal: '#60A5FA', resonance: '#A78BFA', strong: '#6C63FF', deep: '#F472B6', mirror: '#FBBF24',
};

const ARCH_ICON: Record<string, string> = {
  shadow: '🌑', anima: '🌙', animus: '☀️', wise_elder: '🦉',
  trickster: '🃏', guide: '🌟', hero: '⚔️', child: '🌱',
  great_mother: '🌊', explorer: '🧭', guardian: '🛡',
};

const ARCHETYPE_DESC: Record<string, string> = {
  shadow:      'Bilinçdışındaki gizlenmiş yönler seni şekillendiriyor.',
  anima:       'Dişil enerji ve duygu derinliği öne çıkıyor.',
  animus:      'Eril güç ve iradi netlik baskın.',
  wise_elder:  'Deneyim ve bilgelik seni bu gruba bağlıyor.',
  trickster:   'Düzeni sorgulayan ve dönüştüren enerji aktif.',
  guide:       'Yol gösterme ve işaret etme dürtüsü güçlü.',
  hero:        'Zorlukları aşma ve eylem dürtüsü belirgin.',
  child:       'Masumiyet, yeniden doğuş ve potansiyel aktif.',
  great_mother:'Koruyucu ve besleyici arketipin enerjisi.',
  explorer:    'Bilinmeyene atılım ve keşif teması baskın.',
  guardian:    'Koruma, sınır ve güvenlik enerjisi öne çıkıyor.',
};

const SYM_ICON_MAP: Record<string, string> = {
  threshold: '🚪', shadow: '🌑', flood: '🌊', guide: '🌟', flying: '🌤',
  transformation: '⚡', labyrinth: '🌀', fire: '🔥', mirror_self: '🪞',
  abyss: '🕳', falling: '💫', child: '🌱', water: '💧', key: '🗝',
  light: '✨', sea: '🌊', old_house: '🏠', animal: '🦁', tree: '🌳',
  door: '🚪', chase: '🏃', vehicle: '🚂',
};

const EMOTION_COLOR: Record<string, string> = {
  fear: '#EF4444', joy: '#FBBF24', peace: '#22D3EE', loneliness: '#818CF8',
  wonder: '#A78BFA', sadness: '#60A5FA', anger: '#F97316', nostalgia: '#F472B6',
  love: '#FB7185', anxiety: '#F87171', excitement: '#34D399', grief: '#3B82F6',
  confusion: '#94A3B8', calm: '#06B6D4', awe: '#8B5CF6', dread: '#DC2626',
  serenity: '#67E8F9',
};

// ── Shared helpers ─────────────────────────────────────────────────────────────

function freqMap(
  matches: DreamMatch[],
  key: 'sharedSymbols' | 'sharedThemes' | 'sharedEmotions' | 'sharedArchetypes',
): Map<string, number> {
  const m = new Map<string, number>();
  for (const match of matches)
    for (const v of match[key]) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

function topEntries(m: Map<string, number>, n: number): [string, number][] {
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function topKey(m: Map<string, number>): string | null {
  let best: [string, number] | null = null;
  for (const [k, v] of m) if (!best || v > best[1]) best = [k, v];
  return best?.[0] ?? null;
}

function trunc(text: string, maxLen: number): string {
  return text.length <= maxLen ? text : text.slice(0, maxLen).trimEnd() + '…';
}

function ResSep() {
  return <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 24 }} />;
}

// ── Animated background ────────────────────────────────────────────────────────

function SubconsciousField() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 13000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 13000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const op1 = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.09] });
  const sc1 = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.03] });
  const op2 = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.02, 0.05] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[sf.orb1, { opacity: op1, transform: [{ scale: sc1 }] }]} />
      <Animated.View style={[sf.orb2, { opacity: op2 }]} />
    </View>
  );
}
const sf = StyleSheet.create({
  orb1: { position: 'absolute', width: W * 1.4, height: W * 1.4, borderRadius: W * 0.7, top: -W * 0.4, left: -W * 0.2, backgroundColor: '#6C63FF' },
  orb2: { position: 'absolute', width: W * 0.9, height: W * 0.9, borderRadius: W * 0.45, bottom: 80, right: -W * 0.35, backgroundColor: '#A78BFA' },
});

// ── S1: My Consciousness Profile ───────────────────────────────────────────────

function MyConsciousnessProfile({ matches }: { matches: DreamMatch[] }) {
  if (matches.length === 0) return null;

  const archFreq = freqMap(matches, 'sharedArchetypes');
  const emFreq   = freqMap(matches, 'sharedEmotions');
  const symFreq  = freqMap(matches, 'sharedSymbols');
  const topArch  = topEntries(archFreq, 1)[0];
  const topEm    = topKey(emFreq);
  const topSym   = topKey(symFreq);
  const avgScore = Math.round(matches.reduce((s, m) => s + m.matchScore, 0) / matches.length);
  const archKey  = topArch?.[0];
  const archIcon = archKey ? (ARCH_ICON[archKey] ?? '◎') : '◎';
  const archDesc = archKey ? (ARCHETYPE_DESC[archKey] ?? 'Bilinçaltı sinyalin şekilleniyor.') : 'Rüya verisi birikirken profil oluşuyor.';
  const emLabel  = topEm  ? (EMOTION_LABELS[topEm]  ?? topEm)  : '—';
  const symLabel = topSym ? (SYMBOL_CATEGORY_LABELS[topSym] ?? topSym) : '—';

  const breatheA = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const lp = Animated.loop(Animated.sequence([
      Animated.timing(breatheA, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breatheA, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    lp.start(); return () => lp.stop();
  }, [breatheA]);
  const sc = breatheA.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.10] });
  const op = breatheA.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.40] });

  return (
    <View style={mcp.wrap}>
      <Text style={mcp.sLabel}>BİLİNÇ PROFİLİM</Text>
      <View style={{ alignItems: 'center', gap: 20 }}>
        {/* Archetype orb */}
        <View style={{ width: 110, height: 110, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: '#6C63FF', opacity: op, transform: [{ scale: sc }] }} />
          <View style={{ width: 74, height: 74, borderRadius: 37, borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.45)', backgroundColor: 'rgba(4,3,15,0.60)', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Text style={{ fontSize: 30, lineHeight: 36 }}>{archIcon}</Text>
          </View>
        </View>
        <Text style={mcp.archDesc}>{archDesc}</Text>
        {/* Data row */}
        <View style={mcp.dataRow}>
          {[
            { val: `${avgScore}%`, key: 'REZONANS' },
            { val: emLabel,        key: 'DUYGU'    },
            { val: symLabel,       key: 'SEMBOL'   },
          ].map((d, i) => (
            <View key={i} style={[mcp.dataItem, i > 0 && { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.06)' }]}>
              <Text style={mcp.dataVal} numberOfLines={1}>{d.val}</Text>
              <Text style={mcp.dataKey}>{d.key}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
const mcp = StyleSheet.create({
  wrap:    { paddingHorizontal: 24, paddingBottom: 8, paddingTop: 8, gap: 18 },
  sLabel:  { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.5, color: 'rgba(167,139,250,0.45)' },
  archDesc:{ fontSize: 13, color: 'rgba(255,255,255,0.42)', lineHeight: 19, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 16 },
  dataRow: { flexDirection: 'row', width: '100%' },
  dataItem:{ flex: 1, alignItems: 'center', gap: 5 },
  dataVal: { fontSize: 16, fontWeight: '900', color: 'rgba(255,255,255,0.88)', letterSpacing: -0.2 },
  dataKey: { fontSize: 8, fontWeight: '900', letterSpacing: 1.8, color: 'rgba(255,255,255,0.26)' },
});

// ── S2: Nearby Minds ──────────────────────────────────────────────────────────

interface NearbyMind {
  userId: string;
  username: string;
  displayName: string | null;
  topScore: number;
  topSymbol: string | null;
  topEmotion: string | null;
  matchCount: number;
}

function deriveNearbyMinds(matches: DreamMatch[]): NearbyMind[] {
  const userMap = new Map<string, {
    username: string; displayName: string | null;
    scores: number[]; symbols: Map<string, number>; emotions: Map<string, number>;
  }>();
  for (const m of matches) {
    const uid = m.matchingUserId;
    if (!userMap.has(uid)) {
      userMap.set(uid, {
        username: m.matchingUserUsername, displayName: m.matchingUserDisplayName,
        scores: [], symbols: new Map(), emotions: new Map(),
      });
    }
    const u = userMap.get(uid)!;
    u.scores.push(m.matchScore);
    for (const s of m.sharedSymbols)  u.symbols.set(s,  (u.symbols.get(s)  ?? 0) + 1);
    for (const e of m.sharedEmotions) u.emotions.set(e, (u.emotions.get(e) ?? 0) + 1);
  }
  return [...userMap.entries()]
    .map(([userId, u]) => ({
      userId,
      username: u.username,
      displayName: u.displayName,
      topScore: Math.round(Math.max(...u.scores)),
      topSymbol: topKey(u.symbols),
      topEmotion: topKey(u.emotions),
      matchCount: u.scores.length,
    }))
    .sort((a, b) => b.topScore - a.topScore)
    .slice(0, 6);
}

function MindOrb({ mind, onPress }: { mind: NearbyMind; onPress: () => void }) {
  const breatheA = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const lp = Animated.loop(Animated.sequence([
      Animated.timing(breatheA, { toValue: 1, duration: 3800 + mind.topScore * 18, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breatheA, { toValue: 0, duration: 3800 + mind.topScore * 18, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    lp.start(); return () => lp.stop();
  }, [breatheA, mind.topScore]);
  const sc = breatheA.interpolate({ inputRange: [0, 1], outputRange: [0.90, 1.08] });
  const op = breatheA.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.35] });
  const emColor = mind.topEmotion ? (EMOTION_COLOR[mind.topEmotion] ?? '#6C63FF') : '#6C63FF';
  const initials = (mind.displayName ?? mind.username).slice(0, 2).toUpperCase();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [nm.orb, { opacity: pressed ? 0.75 : 1 }]}>
      <View style={{ width: 54, height: 54, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', width: 54, height: 54, borderRadius: 27, backgroundColor: emColor, opacity: op, transform: [{ scale: sc }] }} />
        <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: `${emColor}55`, backgroundColor: 'rgba(4,3,15,0.65)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '900', color: 'rgba(255,255,255,0.88)' }}>{initials}</Text>
        </View>
      </View>
      <Text style={nm.orbPct}>{mind.topScore}%</Text>
      <Text style={nm.orbName} numberOfLines={1}>{mind.displayName ?? mind.username}</Text>
      {(mind.topSymbol || mind.topEmotion) && (
        <Text style={nm.orbHint} numberOfLines={1}>
          {mind.topSymbol
            ? labelOf(SYMBOL_CATEGORY_LABELS, mind.topSymbol)
            : labelOf(EMOTION_LABELS, mind.topEmotion ?? '')}
        </Text>
      )}
    </Pressable>
  );
}

function NearbyMindsSection({ matches }: { matches: DreamMatch[] }) {
  const router = useRouter();
  const minds  = useMemo(() => deriveNearbyMinds(matches), [matches]);
  if (minds.length === 0) return null;

  return (
    <View style={nm.wrap}>
      <Text style={nm.sLabel}>YAKINDAKI BİLİNÇLER</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={nm.row}>
        {minds.map(mind => (
          <MindOrb key={mind.userId} mind={mind} onPress={() => router.push(`/user/${mind.userId}` as any)} />
        ))}
      </ScrollView>
    </View>
  );
}
const nm = StyleSheet.create({
  wrap:    { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  sLabel:  { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  row:     { flexDirection: 'row', gap: 20, paddingRight: 24 },
  orb:     { alignItems: 'center', gap: 8, width: 64 },
  orbPct:  { fontSize: 13, fontWeight: '900', color: '#A78BFA' },
  orbName: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.40)', textAlign: 'center' },
  orbHint: { fontSize: 9,  fontWeight: '600', color: 'rgba(255,255,255,0.22)', textAlign: 'center' },
});

// ── S2b: Match Explanation — "Neden Bağlıyız" ────────────────────────────────

function MatchExplanationList({ matches }: { matches: DreamMatch[] }) {
  const byUser = useMemo(() => {
    const m = new Map<string, {
      name: string; scores: number[];
      symbols: Map<string,number>; emotions: Map<string,number>; archetypes: Map<string,number>;
      level: ResonanceLevel;
    }>();
    for (const match of matches) {
      const uid = match.matchingUserId;
      if (!m.has(uid)) {
        m.set(uid, {
          name:      match.matchingUserDisplayName ?? match.matchingUserUsername,
          scores:    [], symbols: new Map(), emotions: new Map(), archetypes: new Map(),
          level:     match.resonanceLevel,
        });
      }
      const u = m.get(uid)!;
      u.scores.push(match.matchScore);
      for (const s of match.sharedSymbols)    u.symbols.set(s,    (u.symbols.get(s)    ?? 0) + 1);
      for (const e of match.sharedEmotions)   u.emotions.set(e,   (u.emotions.get(e)   ?? 0) + 1);
      for (const a of match.sharedArchetypes) u.archetypes.set(a, (u.archetypes.get(a) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([uid, u]) => ({
        uid,
        name:    u.name,
        score:   Math.round(Math.max(...u.scores)),
        level:   u.level,
        topSym:  topKey(u.symbols),
        topEm:   topKey(u.emotions),
        topArch: topKey(u.archetypes),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [matches]);

  if (byUser.length === 0) return null;

  return (
    <View style={mel.wrap}>
      <Text style={mel.sLabel}>NEDEN BAĞLIYIZ</Text>
      {byUser.map(u => {
        const color = LEVEL_COLOR[u.level] ?? '#6C63FF';
        const bullets = [
          u.topSym  ? `${SYM_ICON_MAP[u.topSym]  ?? '◦'} ${labelOf(SYMBOL_CATEGORY_LABELS, u.topSym)} sembolü`   : null,
          u.topEm   ? `◦ ${labelOf(EMOTION_LABELS,   u.topEm)} duygusu`                                            : null,
          u.topArch ? `◎ ${labelOf(ARCHETYPE_LABELS, u.topArch)} arketipi`                                         : null,
        ].filter(Boolean) as string[];
        return (
          <View key={u.uid} style={[mel.card, { borderColor: `${color}25` }]}>
            <View style={mel.header}>
              <Text style={mel.name}>Sen ve {u.name}:</Text>
              <View style={[mel.badge, { borderColor: `${color}40`, backgroundColor: `${color}10` }]}>
                <Text style={[mel.badgeTxt, { color }]}>{u.score}%</Text>
              </View>
            </View>
            {bullets.length > 0 && (
              <View style={mel.bullets}>
                {bullets.map((b, i) => (
                  <Text key={i} style={mel.bullet}>{b}</Text>
                ))}
              </View>
            )}
            <Text style={mel.footer}>taşıyorsunuz.</Text>
          </View>
        );
      })}
    </View>
  );
}
const mel = StyleSheet.create({
  wrap:     { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  sLabel:   { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  card:     { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10, backgroundColor: 'rgba(255,255,255,0.02)' },
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name:     { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.82)', flex: 1 },
  badge:    { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTxt: { fontSize: 14, fontWeight: '900' },
  bullets:  { gap: 6, paddingLeft: 4 },
  bullet:   { fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 20 },
  footer:   { fontSize: 12, color: 'rgba(255,255,255,0.28)', fontStyle: 'italic' },
});

// ── Ortak Bilinç Alanı ────────────────────────────────────────────────────────

function SharedConsciousnessField({ matches }: { matches: DreamMatch[] }) {
  const symFreq = freqMap(matches, 'sharedSymbols');
  const thmFreq = freqMap(matches, 'sharedThemes');
  const emFreq  = freqMap(matches, 'sharedEmotions');
  const topSyms = topEntries(symFreq, 3);
  const topThms = topEntries(thmFreq, 3);
  const topEms  = topEntries(emFreq,  3);
  if (topSyms.length === 0 && topThms.length === 0 && topEms.length === 0) return null;

  return (
    <View style={scf.wrap}>
      <Text style={scf.sLabel}>ORTAK BİLİNÇ ALANI</Text>
      <Text style={scf.sub}>Bu bilinçlerin kesiştiği sembolik merkez.</Text>
      {topSyms.length > 0 && (
        <View style={scf.group}>
          <Text style={scf.groupLbl}>SEMBOLLER</Text>
          <View style={scf.chips}>
            {topSyms.map(([k]) => (
              <View key={k} style={scf.chip}>
                <Text style={scf.chipIcon}>{SYM_ICON_MAP[k] ?? '·'}</Text>
                <Text style={scf.chipTxt}>{labelOf(SYMBOL_CATEGORY_LABELS, k)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {topThms.length > 0 && (
        <View style={scf.group}>
          <Text style={scf.groupLbl}>TEMALAR</Text>
          <View style={scf.chips}>
            {topThms.map(([k]) => (
              <View key={k} style={[scf.chip, { borderColor: 'rgba(167,139,250,0.28)' }]}>
                <Text style={[scf.chipTxt, { color: '#A78BFA' }]}>{labelOf(THEME_LABELS, k)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {topEms.length > 0 && (
        <View style={scf.group}>
          <Text style={scf.groupLbl}>DUYGULAR</Text>
          <View style={scf.chips}>
            {topEms.map(([k]) => {
              const color = EMOTION_COLOR[k] ?? '#6C63FF';
              return (
                <View key={k} style={[scf.chip, { borderColor: `${color}35` }]}>
                  <View style={[scf.emoDot, { backgroundColor: color }]} />
                  <Text style={[scf.chipTxt, { color }]}>{labelOf(EMOTION_LABELS, k)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
const scf = StyleSheet.create({
  wrap:     { paddingHorizontal: 24, paddingVertical: 24, gap: 18 },
  sLabel:   { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sub:      { fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 19, marginTop: -8 },
  group:    { gap: 10 },
  groupLbl: { fontSize: 8, fontWeight: '900', letterSpacing: 2, color: 'rgba(255,255,255,0.20)' },
  chips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(96,165,250,0.22)' },
  chipIcon: { fontSize: 14 },
  chipTxt:  { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  emoDot:   { width: 6, height: 6, borderRadius: 3 },
});

// ── Emotional Proximity ───────────────────────────────────────────────────────

function EmotionalProximity({ matches }: { matches: DreamMatch[] }) {
  const emFreq = freqMap(matches, 'sharedEmotions');
  const top    = topEntries(emFreq, 5);
  if (top.length === 0) return null;
  const maxCnt = top[0]?.[1] ?? 1;

  return (
    <View style={ep.wrap}>
      <Text style={ep.sLabel}>DUYGUSAL YAKINLIK</Text>
      <Text style={ep.sub}>Bilinçlerin kesiştiği duygusal frekanslar.</Text>
      <View style={ep.list}>
        {top.map(([k, cnt]) => {
          const color = EMOTION_COLOR[k] ?? '#6C63FF';
          const label = labelOf(EMOTION_LABELS, k);
          const pct   = Math.round((cnt / maxCnt) * 100);
          return (
            <View key={k} style={ep.row}>
              <View style={[ep.dot, { backgroundColor: color }]} />
              <Text style={ep.label} numberOfLines={1}>{label}</Text>
              <View style={ep.track}>
                <View style={[ep.bar, { width: `${pct}%`, backgroundColor: color }]} />
              </View>
              <Text style={[ep.cnt, { color }]}>{cnt}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
const ep = StyleSheet.create({
  wrap:   { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  sLabel: { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sub:    { fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 19, marginTop: -4 },
  list:   { gap: 14 },
  row:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot:    { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  label:  { width: 82, fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.40)', flexShrink: 0 },
  track:  { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  bar:    { height: 3, borderRadius: 2, opacity: 0.82 },
  cnt:    { width: 22, fontSize: 11, fontWeight: '800', textAlign: 'right' },
});

// ── Collective Field Tonight ──────────────────────────────────────────────────

function CollectiveFieldTonight({ signals }: { signals: DreamSignals | undefined }) {
  if (!signals) return null;
  const topSyms = [...signals.symbols].sort((a, b) => b.count - a.count).slice(0, 4);
  const topEms  = [...signals.emotions].sort((a, b) => b.count - a.count).slice(0, 4);
  if (topSyms.length === 0 && topEms.length === 0) return null;

  return (
    <View style={cft.wrap}>
      <Text style={cft.sLabel}>BU GECENİN ALANI</Text>
      {topSyms.length > 0 && (
        <View style={cft.group}>
          <Text style={cft.groupLbl}>HAKİM SEMBOLLER</Text>
          <View style={cft.chips}>
            {topSyms.map(s => (
              <View key={s.name} style={cft.chip}>
                <Text style={cft.chipIcon}>{SYM_ICON_MAP[s.name] ?? '·'}</Text>
                <Text style={cft.chipTxt}>{labelOf(SYMBOL_CATEGORY_LABELS, s.name)}</Text>
                <Text style={cft.chipCnt}>{s.count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {topEms.length > 0 && (
        <View style={cft.group}>
          <Text style={cft.groupLbl}>HAKİM DUYGULAR</Text>
          <View style={cft.chips}>
            {topEms.map(s => {
              const color = EMOTION_COLOR[s.name] ?? '#A78BFA';
              return (
                <View key={s.name} style={[cft.chip, { borderColor: `${color}35` }]}>
                  <View style={[cft.emoDot, { backgroundColor: color }]} />
                  <Text style={[cft.chipTxt, { color }]}>{labelOf(EMOTION_LABELS, s.name)}</Text>
                  <Text style={[cft.chipCnt, { color: `${color}88` }]}>{s.count}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
const cft = StyleSheet.create({
  wrap:     { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  sLabel:   { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  group:    { gap: 10 },
  groupLbl: { fontSize: 8, fontWeight: '900', letterSpacing: 2, color: 'rgba(255,255,255,0.18)' },
  chips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.20)' },
  chipIcon: { fontSize: 13 },
  chipTxt:  { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.72)' },
  chipCnt:  { fontSize: 10, fontWeight: '800', color: 'rgba(167,139,250,0.50)' },
  emoDot:   { width: 6, height: 6, borderRadius: 3 },
});

// ── S3: Shared Symbols ────────────────────────────────────────────────────────

function SharedSymbols({ matches }: { matches: DreamMatch[] }) {
  const symFreq = freqMap(matches, 'sharedSymbols');
  const top = topEntries(symFreq, 8);
  if (top.length === 0) return null;

  return (
    <View style={ss.wrap}>
      <Text style={ss.sLabel}>ORTAK SEMBOLLER</Text>
      <Text style={ss.sSub}>Bilinçaltının paylaştığı arketipik imgeler.</Text>
      <View style={ss.chips}>
        {top.map(([k, cnt]) => (
          <View key={k} style={ss.chip}>
            <Text style={ss.icon}>{SYM_ICON_MAP[k] ?? '·'}</Text>
            <Text style={ss.label}>{labelOf(SYMBOL_CATEGORY_LABELS, k)}</Text>
            <Text style={ss.cnt}>{cnt}×</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const ss = StyleSheet.create({
  wrap:  { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  sLabel:{ fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sSub:  { fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 19, marginTop: -4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.20)' },
  icon:  { fontSize: 18 },
  label: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.78)' },
  cnt:   { fontSize: 10, fontWeight: '800', color: 'rgba(167,139,250,0.55)', marginLeft: 2 },
});

// ── S4: Shared Emotions ───────────────────────────────────────────────────────

function EmotionOrbNode({ k, cnt, maxCnt, index }: { k: string; cnt: number; maxCnt: number; index: number }) {
  const color    = EMOTION_COLOR[k] ?? '#6C63FF';
  const size     = 36 + Math.round((cnt / maxCnt) * 32);
  const breatheA = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const dur = 3200 + index * 600;
    const lp  = Animated.loop(Animated.sequence([
      Animated.timing(breatheA, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breatheA, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    lp.start(); return () => lp.stop();
  }, [breatheA, index]);
  const sc = breatheA.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });
  const op = breatheA.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.45] });

  return (
    <View style={[se.emoNode, { width: size + 24, alignItems: 'center', gap: 8 }]}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: op, transform: [{ scale: sc }] }} />
        <View style={{ width: size * 0.72, height: size * 0.72, borderRadius: size * 0.36, backgroundColor: `${color}22`, borderWidth: 1, borderColor: `${color}55`, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: size * 0.22, fontWeight: '900', color: 'rgba(255,255,255,0.92)' }}>{cnt}</Text>
        </View>
      </View>
      <Text style={[se.emoLabel, { color }]} numberOfLines={1}>{labelOf(EMOTION_LABELS, k)}</Text>
    </View>
  );
}

function SharedEmotions({ matches }: { matches: DreamMatch[] }) {
  const emFreq = freqMap(matches, 'sharedEmotions');
  const top    = topEntries(emFreq, 5);
  if (top.length === 0) return null;
  const maxCnt = top[0]?.[1] ?? 1;

  return (
    <View style={se.wrap}>
      <Text style={se.sLabel}>ORTAK DUYGULAR</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={se.cloud}>
        {top.map(([k, cnt], i) => (
          <EmotionOrbNode key={k} k={k} cnt={cnt} maxCnt={maxCnt} index={i} />
        ))}
      </ScrollView>
    </View>
  );
}
const se = StyleSheet.create({
  wrap:     { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  sLabel:   { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  cloud:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 24, paddingVertical: 8 },
  emoNode:  {},
  emoLabel: { fontSize: 10, fontWeight: '800', textAlign: 'center' },
});

// ── S6: AI Interpretation (Why you resonate) ──────────────────────────────────

function WhyResonate({ matches, clusters }: {
  matches:  DreamMatch[];
  clusters: ClusterMembership[];
}) {
  if (matches.length === 0) return null;

  const symFreq  = freqMap(matches, 'sharedSymbols');
  const emFreq   = freqMap(matches, 'sharedEmotions');
  const thmFreq  = freqMap(matches, 'sharedThemes');
  const archFreq = freqMap(matches, 'sharedArchetypes');

  const topSym  = topEntries(symFreq, 1)[0];
  const topEm   = topEntries(emFreq, 1)[0];
  const topThm  = topEntries(thmFreq, 1)[0];
  const topArch = topEntries(archFreq, 1)[0];

  const parts: string[] = [];
  if (topSym && topSym[1] >= 2)
    parts.push(`Bilinçaltın "${labelOf(SYMBOL_CATEGORY_LABELS, topSym[0])}" sembolü etrafında ${topSym[1]} farklı rüyacıyla rezonans kurdu.`);
  if (topEm && topEm[1] >= 2)
    parts.push(`"${labelOf(EMOTION_LABELS, topEm[0])}" duygusu sizi birbirinize bağlayan ortak frekanstır.`);
  if (topThm)
    parts.push(`"${labelOf(THEME_LABELS, topThm[0])}" teması seni bu bilinç grubunda ayırt eden güçlü sinyal.`);
  if (topArch && topArch[1] >= 2)
    parts.push(`"${labelOf(ARCHETYPE_LABELS, topArch[0])}" arketipi ${topArch[1]} farklı rüyada aynı anda yüzeye çıktı.`);

  const text = parts.length > 0
    ? parts.join(' ')
    : `Bu gece ${matches.length} rüya arasında derin bilinçaltı bağlantıları tespit edildi.`;

  const topCluster = [...clusters].sort((a, b) => b.membershipScore - a.membershipScore)[0];

  return (
    <View style={wr.wrap}>
      <View style={wr.headerRow}>
        <Ionicons name="sparkles-outline" size={11} color="rgba(167,139,250,0.65)" />
        <Text style={wr.sLabel}>NEDEN REZONANS KURUYORSUN</Text>
      </View>
      <Text style={wr.body}>{text}</Text>
      {topCluster && (
        <Text style={wr.clusterHint}>
          Sen ve bu bilinçler "{topCluster.cluster.name}" kümesini paylaşıyor.
        </Text>
      )}
    </View>
  );
}
const wr = StyleSheet.create({
  wrap:        { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  headerRow:   { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sLabel:      { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(167,139,250,0.45)' },
  body:        { fontSize: 15, color: 'rgba(255,255,255,0.58)', lineHeight: 26, fontStyle: 'italic', borderLeftWidth: 2, borderLeftColor: 'rgba(167,139,250,0.28)', paddingLeft: 14 },
  clusterHint: { fontSize: 12, color: 'rgba(167,139,250,0.45)', fontStyle: 'italic', paddingLeft: 16 },
});

// ── S7: Collective Position ────────────────────────────────────────────────────

function CollectivePosition({ clusters, onPress }: {
  clusters: ClusterMembership[];
  onPress:  (id: string) => void;
}) {
  const top = [...clusters].sort((a, b) => b.membershipScore - a.membershipScore)[0];
  const breatheA = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const lp = Animated.loop(Animated.sequence([
      Animated.timing(breatheA, { toValue: 1, duration: 6500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breatheA, { toValue: 0, duration: 6500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    lp.start(); return () => lp.stop();
  }, [breatheA]);
  const sc = breatheA.interpolate({ inputRange: [0, 1], outputRange: [0.90, 1.12] });
  const op = breatheA.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.28] });

  if (!top) return null;
  const archKey  = top.cluster.primaryArchetype ?? '';
  const archIcon = ARCH_ICON[archKey] ?? '◎';
  const score    = Math.round(top.membershipScore);

  return (
    <Pressable style={({ pressed }) => [cp.wrap, { opacity: pressed ? 0.82 : 1 }]} onPress={() => onPress(top.cluster.id)}>
      <Text style={cp.sLabel}>KOLEKTİF KONUM</Text>
      <View style={{ alignItems: 'center', gap: 18 }}>
        <View style={{ width: 90, height: 90, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: '#6C63FF', opacity: op, transform: [{ scale: sc }] }} />
          <View style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(108,99,255,0.45)', backgroundColor: 'rgba(4,3,15,0.65)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 28, lineHeight: 34 }}>{archIcon}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={cp.name}>{top.cluster.name}</Text>
          <Text style={cp.meta}>{top.cluster.memberCount} bilinç  ·  {score}% uyum</Text>
        </View>
        <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.20)" />
      </View>
    </Pressable>
  );
}
const cp = StyleSheet.create({
  wrap:   { paddingHorizontal: 24, paddingVertical: 24, gap: 18, alignItems: 'center' },
  sLabel: { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)', alignSelf: 'flex-start' },
  name:   { fontSize: 18, fontWeight: '900', color: 'rgba(255,255,255,0.88)', letterSpacing: -0.3, textAlign: 'center' },
  meta:   { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '600', textAlign: 'center' },
});

// ── PRESERVED: Tonight's Strongest Resonance ──────────────────────────────────

function buildResonanceHeadline(matches: DreamMatch[], signals: DreamSignals | undefined): string {
  const symFreq = freqMap(matches, 'sharedSymbols');
  const topSyms = topEntries(symFreq, 3);
  const topSym  = topSyms[0];
  if (topSym && topSym[1] >= 2) {
    const names = topSyms.map(([k]) => labelOf(SYMBOL_CATEGORY_LABELS, k).toLowerCase());
    const str   = names.length >= 3 ? `${names[0]}, ${names[1]} ve ${names[2]}`
                : names.length === 2 ? `${names[0]} ve ${names[1]}` : (names[0] ?? '');
    return `${topSym[1]} rüya ${str} sembolleri üzerinden kolektif bir rezonans yaşadı.`;
  }
  const thmFreq = freqMap(matches, 'sharedThemes');
  const topThm  = topEntries(thmFreq, 1)[0];
  if (topThm && topThm[1] >= 2)
    return `${topThm[1]} rüya "${labelOf(THEME_LABELS, topThm[0])}" teması etrafında bir araya geldi.`;
  if (matches.length > 0)
    return `Bu gece ${matches.length} rüya arasında gizli bağlantılar tespit edildi.`;
  const topSigThm = [...(signals?.themes ?? [])].sort((a, b) => b.count - a.count)[0];
  if (topSigThm)
    return `Bu gece kolektif bilinç "${labelOf(THEME_LABELS, topSigThm.name)}" temasında en güçlü rezonansı yaşıyor.`;
  return 'Bu gece kolektif bilinç aktif. Rüyalar birbirini sessizce buluyor.';
}

function TonightStrongestResonance({ matches, signals }: {
  matches: DreamMatch[];
  signals: DreamSignals | undefined;
}) {
  const headline   = buildResonanceHeadline(matches, signals);
  const topEmotion = [...(signals?.emotions ?? [])].sort((a, b) => b.count - a.count)[0];
  const topTheme   = [...(signals?.themes   ?? [])].sort((a, b) => b.count - a.count)[0];
  const topSymbol  = [...(signals?.symbols  ?? [])].sort((a, b) => b.count - a.count)[0];
  const trio = [
    topEmotion && { key: 'e', tag: 'DUYGU',  label: labelOf(EMOTION_LABELS, topEmotion.name),       color: '#F472B6' },
    topTheme   && { key: 't', tag: 'TEMA',   label: labelOf(THEME_LABELS, topTheme.name),            color: '#A78BFA' },
    topSymbol  && { key: 's', tag: 'SEMBOL', label: labelOf(SYMBOL_CATEGORY_LABELS, topSymbol.name), color: '#60A5FA' },
  ].filter(Boolean) as { key: string; tag: string; label: string; color: string }[];

  return (
    <View style={rh.wrap}>
      <Text style={rh.eyebrow}>BU GECENİN EN GÜÇLÜ REZONANSI</Text>
      <View style={rh.accentLine} />
      <Text style={rh.headline}>{headline}</Text>
      {trio.length > 0 && (
        <View style={rh.trio}>
          {trio.map((t, i) => (
            <View key={t.key} style={[rh.trioItem, i > 0 && rh.trioBorder]}>
              <Text style={[rh.trioTag, { color: t.color }]}>{t.tag}</Text>
              <Text style={rh.trioLabel}>{t.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
const rh = StyleSheet.create({
  wrap:       { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28 },
  eyebrow:    { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(167,139,250,0.50)', marginBottom: 12 },
  accentLine: { width: 40, height: 1.5, backgroundColor: '#A78BFA', marginBottom: 20, opacity: 0.65 },
  headline:   { fontSize: 22, fontWeight: '700', color: 'rgba(255,255,255,0.92)', lineHeight: 32, letterSpacing: -0.4 },
  trio:       { flexDirection: 'row', marginTop: 24 },
  trioItem:   { flex: 1, gap: 8 },
  trioBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.06)', paddingLeft: 18 },
  trioTag:    { fontSize: 8, fontWeight: '900', letterSpacing: 1.8 },
  trioLabel:  { fontSize: 18, fontWeight: '900', color: 'rgba(255,255,255,0.88)', letterSpacing: -0.4, lineHeight: 22 },
});

// ── PRESERVED: Dream Resonance ────────────────────────────────────────────────

function DreamResonanceCard({ match, onPress }: { match: DreamMatch; onPress: () => void }) {
  const score = Math.round(match.matchScore);
  const color = LEVEL_COLOR[match.resonanceLevel];
  const sigs  = [
    ...match.sharedThemes.slice(0,  2).map(t => labelOf(THEME_LABELS, t)),
    ...match.sharedSymbols.slice(0, 2).map(s => labelOf(SYMBOL_CATEGORY_LABELS, s)),
    ...match.sharedEmotions.slice(0, 1).map(e => labelOf(EMOTION_LABELS, e)),
  ].filter(Boolean).slice(0, 4);

  const calcDate  = new Date(match.calculatedAt);
  const now       = new Date();
  const isTonight = calcDate.getFullYear() === now.getFullYear()
    && calcDate.getMonth() === now.getMonth()
    && calcDate.getDate()  === now.getDate();

  return (
    <Pressable style={({ pressed }) => [dr.card, { opacity: pressed ? 0.80 : 1 }]} onPress={onPress}>
      {isTonight && (
        <View style={dr.nightBadge}>
          <Text style={dr.nightTxt}>◆ BU GECE</Text>
        </View>
      )}
      <View style={dr.dreamBlock}>
        <Text style={dr.dreamTag}>SENİN RÜYAN</Text>
        <Text style={dr.dreamTitle} numberOfLines={2}>{match.myDreamTitle || 'Başlıksız Rüya'}</Text>
      </View>
      <View style={dr.connector}>
        <View style={[dr.connLine, { backgroundColor: `${color}40` }]} />
        <View style={[dr.connBadge, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
          <Text style={[dr.connScore, { color }]}>{score}%</Text>
          <Text style={[dr.connLevel, { color: `${color}80` }]}>{LEVEL_TR[match.resonanceLevel]}</Text>
        </View>
        <View style={[dr.connLine, { backgroundColor: `${color}40` }]} />
      </View>
      <View style={dr.dreamBlock}>
        <Text style={dr.dreamTag}>BAĞLANTILI RÜYA</Text>
        <Text style={dr.dreamSnip} numberOfLines={3}>{trunc(match.matchingDreamContent, 110)}</Text>
      </View>
      {sigs.length > 0 && (
        <View style={dr.sigsRow}>
          {sigs.map((s, i) => (
            <View key={i} style={[dr.sigChip, { borderColor: `${color}35` }]}>
              <Text style={[dr.sigChipText, { color: `${color}CC` }]}>{s}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

function DreamResonanceSection({ matches, onMatchPress }: {
  matches:      DreamMatch[];
  onMatchPress: (m: DreamMatch) => void;
}) {
  const top = [...matches].sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
  if (top.length === 0) return null;
  return (
    <View style={dr.wrap}>
      <Text style={dr.sLabel}>RÜYA REZONANSI</Text>
      <Text style={dr.sSub}>En güçlü rüya bağlantılarınız. Anonim · sembol tabanlı.</Text>
      <View style={dr.list}>
        {top.map(m => <DreamResonanceCard key={m.id} match={m} onPress={() => onMatchPress(m)} />)}
      </View>
    </View>
  );
}
const dr = StyleSheet.create({
  wrap:        { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  sLabel:      { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sSub:        { fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 19, marginTop: -4 },
  list:        { gap: 0 },
  card:        { paddingVertical: 20, gap: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  dreamBlock:  { gap: 6 },
  dreamTag:    { fontSize: 8, fontWeight: '900', letterSpacing: 1.8, color: 'rgba(255,255,255,0.28)' },
  dreamTitle:  { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.85)', lineHeight: 21 },
  dreamSnip:   { fontSize: 13, color: 'rgba(255,255,255,0.48)', lineHeight: 20, fontStyle: 'italic' },
  connector:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  connLine:    { flex: 1, height: 1 },
  connBadge:   { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', gap: 2 },
  connScore:   { fontSize: 18, fontWeight: '900', lineHeight: 20 },
  connLevel:   { fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  sigsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sigChip:     { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  sigChipText: { fontSize: 10, fontWeight: '700' },
  nightBadge:  { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(167,139,250,0.12)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.30)', marginBottom: 4 },
  nightTxt:    { fontSize: 8, fontWeight: '900', letterSpacing: 1.5, color: '#A78BFA' },
});

// ── PRESERVED: Dream Echoes ───────────────────────────────────────────────────

function DreamEchoes({ matches }: { matches: DreamMatch[] }) {
  const symFreq  = freqMap(matches, 'sharedSymbols');
  const thmFreq  = freqMap(matches, 'sharedThemes');
  const echoes: { label: string; count: number; type: 'symbol' | 'theme' }[] = [];
  for (const [k, cnt] of topEntries(symFreq, 4)) {
    if (cnt < 2) break;
    echoes.push({ label: labelOf(SYMBOL_CATEGORY_LABELS, k), count: cnt, type: 'symbol' });
  }
  for (const [k, cnt] of topEntries(thmFreq, 3)) {
    if (cnt < 2) break;
    echoes.push({ label: labelOf(THEME_LABELS, k), count: cnt, type: 'theme' });
  }
  const top = echoes.slice(0, 5);
  if (top.length === 0) return null;

  return (
    <View style={echo.wrap}>
      <Text style={echo.sLabel}>RÜYA YANKISI</Text>
      <Text style={echo.sSub}>Tekrar tekrar yüzeye çıkan bilinçdışı imgeler.</Text>
      <View style={echo.list}>
        {top.map((e, i) => (
          <View key={i} style={echo.item}>
            <Text style={echo.bullet}>◌</Text>
            <View style={echo.body}>
              <Text style={echo.itemLabel}>"{e.label}"</Text>
              <Text style={echo.itemDesc}>
                {e.count >= 5 ? 'Beş' : e.count >= 3 ? 'Birden fazla' : 'İki'} farklı rüyada aynı{' '}
                {e.type === 'symbol' ? 'sembol' : 'tema'} belirdi.
                {e.count >= 4 ? ' Kolektif bilinç bu imgede birleşiyor.' : ''}
              </Text>
            </View>
            <Text style={echo.cnt}>{e.count}×</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const echo = StyleSheet.create({
  wrap:      { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  sLabel:    { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sSub:      { fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 19, marginTop: -4 },
  list:      { gap: 0 },
  item:      { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  bullet:    { fontSize: 18, color: '#A78BFA', opacity: 0.60, marginTop: 1 },
  body:      { flex: 1, gap: 4 },
  itemLabel: { fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.85)' },
  itemDesc:  { fontSize: 12.5, color: 'rgba(255,255,255,0.42)', lineHeight: 19 },
  cnt:       { fontSize: 16, fontWeight: '900', color: 'rgba(255,255,255,0.28)', minWidth: 28, textAlign: 'right', marginTop: 2 },
});

// ── PRESERVED: Collective Constellations ──────────────────────────────────────

function ConstellationBlock({ m, onPress }: { m: ClusterMembership; onPress: () => void }) {
  const chain: string[] = [];
  if (m.cluster.primarySymbol)  chain.push(labelOf(SYMBOL_CATEGORY_LABELS, m.cluster.primarySymbol).toUpperCase());
  if (m.cluster.primaryTheme)   chain.push(labelOf(THEME_LABELS,           m.cluster.primaryTheme).toUpperCase());
  if (m.cluster.primaryEmotion) chain.push(labelOf(EMOTION_LABELS,         m.cluster.primaryEmotion).toUpperCase());
  if (chain.length < 2) return null;

  return (
    <Pressable style={({ pressed }) => [cnst.block, { opacity: pressed ? 0.78 : 1 }]} onPress={onPress}>
      <Text style={cnst.name} numberOfLines={2}>{m.cluster.name}</Text>
      <View style={cnst.chain}>
        {chain.map((node, i) => (
          <View key={node}>
            <Text style={[cnst.node, { opacity: 1 - i * 0.14 }]}>{node}</Text>
            {i < chain.length - 1 && <Text style={cnst.arrow}>↓</Text>}
          </View>
        ))}
      </View>
      <Text style={cnst.meta}>{m.cluster.dreamCount} rüya</Text>
    </Pressable>
  );
}

function CollectiveConstellations({ clusters, onClusterPress }: {
  clusters:       ClusterMembership[];
  onClusterPress: (id: string) => void;
}) {
  const top = clusters.filter(m => m.cluster.dreamCount > 0).slice(0, 4);
  if (top.length === 0) return null;
  return (
    <View style={cnst.wrap}>
      <Text style={cnst.sLabel}>KOLEKTİF KONSTELASYONLAr</Text>
      <Text style={cnst.sSub}>Rüya sembollerinin birbirine bağlandığı örüntü zincirleri.</Text>
      <View style={cnst.grid}>
        {top.map(m => (
          <ConstellationBlock key={m.cluster.id} m={m} onPress={() => onClusterPress(m.cluster.id)} />
        ))}
      </View>
    </View>
  );
}
const cnst = StyleSheet.create({
  wrap:   { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  sLabel: { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sSub:   { fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 19, marginTop: -4 },
  grid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  block:  { width: (W - 48 - 24) / 2, gap: 12 },
  name:   { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.38)', lineHeight: 14 },
  chain:  { gap: 2 },
  node:   { fontSize: 13, fontWeight: '900', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 },
  arrow:  { fontSize: 13, color: 'rgba(167,139,250,0.40)', fontWeight: '900' },
  meta:   { fontSize: 10, color: 'rgba(255,255,255,0.22)', fontWeight: '600' },
});

// ── PRESERVED: Unexplained Connections ────────────────────────────────────────

function UnexplainedConnections({ matches }: { matches: DreamMatch[] }) {
  const mysteries: { text: string; color: string }[] = [];
  const deepMatches = matches.filter(m => m.resonanceLevel === 'deep' || m.resonanceLevel === 'mirror');
  if (deepMatches.length >= 2) {
    const symFreq = freqMap(deepMatches, 'sharedSymbols');
    const top     = topEntries(symFreq, 1)[0];
    if (top && top[1] >= 2)
      mysteries.push({ text: `${top[1]} birbirinden bağımsız rüyacı aynı "${labelOf(SYMBOL_CATEGORY_LABELS, top[0])}" imgesini deneyimledi.`, color: '#FBBF24' });
  }
  if (deepMatches.length > 0)
    mysteries.push({ text: `${deepMatches.length} rüya arasında açıklanamayan bir ayna rezonansı tespit edildi.`, color: '#A78BFA' });
  const highScore = matches.filter(m => m.matchScore >= 80);
  if (highScore.length >= 2) {
    const thmFreq = freqMap(highScore, 'sharedThemes');
    const top     = topEntries(thmFreq, 1)[0];
    if (top)
      mysteries.push({ text: `${highScore.length} rüya "%80 üzerinde" benzerlik gösterdi. Ortak nokta: "${labelOf(THEME_LABELS, top[0])}".`, color: '#60A5FA' });
  }
  const archFreq = freqMap(matches, 'sharedArchetypes');
  const topArch  = topEntries(archFreq, 1)[0];
  if (topArch && topArch[1] >= 3)
    mysteries.push({ text: `"${labelOf(ARCHETYPE_LABELS, topArch[0])}" arketipi ${topArch[1]} farklı rüyada bağımsız olarak ortaya çıktı.`, color: '#34D399' });
  if (mysteries.length === 0) return null;

  return (
    <View style={myst.wrap}>
      <Text style={myst.sLabel}>AÇIKLANAMAYAN BAĞLANTILAR</Text>
      <Text style={myst.sSub}>Kolektif bilinçdışı bu gece açıklanamayan örüntüler örüyor.</Text>
      <View style={myst.list}>
        {mysteries.map((m, i) => (
          <View key={i} style={myst.item}>
            <Text style={[myst.bullet, { color: m.color }]}>◎</Text>
            <Text style={myst.text}>{m.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const myst = StyleSheet.create({
  wrap:   { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  sLabel: { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sSub:   { fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 19, marginTop: -4 },
  list:   { gap: 0 },
  item:   { flexDirection: 'row', gap: 14, alignItems: 'flex-start', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  bullet: { fontSize: 16, lineHeight: 22, opacity: 0.80, marginTop: 1 },
  text:   { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.68)', lineHeight: 22 },
});

// ── PRESERVED: Collective Resonance Map ───────────────────────────────────────

const ZONE_DEFS = [
  { key: 'threshold', name: 'Eşik Bölgesi',    emoji: '🚪', themeKey: 'threshold',     symKey: 'door',   emKey: 'anxiety'  },
  { key: 'shadow',    name: 'Gölge Bölgesi',    emoji: '🌑', themeKey: 'pursuit',       symKey: 'shadow', emKey: 'fear'     },
  { key: 'transform', name: 'Dönüşüm Bölgesi', emoji: '⚡', themeKey: 'transformation', symKey: 'fire',   emKey: 'wonder'   },
  { key: 'sacred',    name: 'Kutsal Bölge',      emoji: '⛰', themeKey: 'ascent',        symKey: 'light',  emKey: 'awe'      },
  { key: 'discovery', name: 'Keşif Bölgesi',    emoji: '✨', themeKey: 'discovery',     symKey: 'guide',  emKey: 'wonder'   },
  { key: 'ocean',     name: 'Rüya Okyanusu',    emoji: '🌊', themeKey: 'water',         symKey: 'sea',    emKey: 'sadness'  },
];

function CollectiveResonanceMap({ matches, onZonePress }: {
  matches:     DreamMatch[];
  onZonePress: (clusterId: string | undefined) => void;
}) {
  const { data: clusters = [] } = useQuery({
    queryKey: ['clusters', 'all'], queryFn: getAllClusters, staleTime: 5 * 60 * 1000,
  });
  const thmFreq = freqMap(matches, 'sharedThemes');
  const symFreq = freqMap(matches, 'sharedSymbols');
  const emFreq  = freqMap(matches, 'sharedEmotions');
  const maxC    = Math.max(...[...thmFreq.values(), ...symFreq.values(), ...emFreq.values()], 1);

  const zones = ZONE_DEFS.map(def => {
    const activity = Math.min(1,
      ((thmFreq.get(def.themeKey) ?? 0) + (symFreq.get(def.symKey) ?? 0) + (emFreq.get(def.emKey) ?? 0))
      / (maxC * 1.5)
    );
    const cluster = clusters.find(c => c.primaryTheme === def.themeKey || c.primarySymbol === def.symKey);
    return { ...def, activity, topEm: labelOf(EMOTION_LABELS, def.emKey), topSym: labelOf(SYMBOL_CATEGORY_LABELS, def.symKey), clusterId: cluster?.id };
  }).sort((a, b) => b.activity - a.activity);

  return (
    <View style={rzm.wrap}>
      <Text style={rzm.sLabel}>KOLEKTİF REZONANS HARİTASI</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={rzm.cloud}>
        {zones.map((z, idx) => {
          const active = z.activity > 0.20;
          const size   = 48 + Math.round(z.activity * 28);
          return (
            <Pressable key={z.key} onPress={() => onZonePress(z.clusterId)}
              style={({ pressed }) => [{ alignItems: 'center', gap: 8, opacity: pressed ? 0.75 : (active ? 1 : 0.38) }]}>
              <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: active ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: active ? 'rgba(167,139,250,0.35)' : 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: size * 0.40 }}>{z.emoji}</Text>
              </View>
              <Text style={[rzm.zoneName, { opacity: active ? 0.88 : 0.35 }]} numberOfLines={2}>{z.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
const rzm = StyleSheet.create({
  wrap:     { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  sLabel:   { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  cloud:    { flexDirection: 'row', alignItems: 'center', gap: 16, paddingRight: 24, paddingVertical: 8 },
  zoneName: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4, color: 'rgba(255,255,255,0.80)', textAlign: 'center', maxWidth: 70 },
});

// ── PRESERVED: Dream Chains ───────────────────────────────────────────────────

function DreamChains({ matches, onMatchPress }: {
  matches:      DreamMatch[];
  onMatchPress: (m: DreamMatch) => void;
}) {
  const chain = useMemo(
    () => [...matches].sort((a, b) => new Date(a.calculatedAt).getTime() - new Date(b.calculatedAt).getTime()).slice(0, 5),
    [matches],
  );
  if (chain.length < 2) return null;

  return (
    <View style={dch.wrap}>
      <Text style={dch.sLabel}>RÜYA ZİNCİRİ</Text>
      <Text style={dch.sSub}>Rüyalarınızın birbiriyle bağlandığı kolektif iz.</Text>
      <View style={dch.chain}>
        {chain.map((m, i) => {
          const top1  = m.sharedThemes[0]  ? labelOf(THEME_LABELS, m.sharedThemes[0])            : null;
          const top2  = m.sharedSymbols[0] ? labelOf(SYMBOL_CATEGORY_LABELS, m.sharedSymbols[0]) : null;
          const color = LEVEL_COLOR[m.resonanceLevel];
          return (
            <View key={m.id}>
              <Pressable style={({ pressed }) => [dch.node, { borderColor: `${color}35`, opacity: pressed ? 0.78 : 1 }]} onPress={() => onMatchPress(m)}>
                <Text style={dch.nodeTitle} numberOfLines={2}>{m.myDreamTitle || 'Rüya'}</Text>
                <Text style={[dch.nodeMeta, { color: `${color}90` }]}>{[top1, top2].filter(Boolean).join(' · ')}</Text>
              </Pressable>
              {i < chain.length - 1 && (
                <View style={dch.arrowWrap}>
                  <View style={dch.arrowLine} />
                  <Text style={dch.arrowTxt}>↓</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
const dch = StyleSheet.create({
  wrap:      { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  sLabel:    { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sSub:      { fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 19, marginTop: -4 },
  chain:     { gap: 0 },
  node:      { borderWidth: 1, borderRadius: 12, backgroundColor: '#05041A', padding: 14, gap: 5 },
  nodeTitle: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.82)' },
  nodeMeta:  { fontSize: 10, fontWeight: '600' },
  arrowWrap: { alignItems: 'center', paddingVertical: 4 },
  arrowLine: { width: 1, height: 8, backgroundColor: 'rgba(167,139,250,0.22)' },
  arrowTxt:  { fontSize: 14, color: 'rgba(167,139,250,0.45)', fontWeight: '900' },
});

// ── PRESERVED: First Appearances ──────────────────────────────────────────────

function FirstAppearances({ signals }: { signals: DreamSignals | undefined }) {
  const newSigs = [
    ...(signals?.themes     ?? []).filter(s => s.trend === 'new').map(s => ({ ...s, cat: 'theme'     })),
    ...(signals?.symbols    ?? []).filter(s => s.trend === 'new').map(s => ({ ...s, cat: 'symbol'    })),
    ...(signals?.emotions   ?? []).filter(s => s.trend === 'new').map(s => ({ ...s, cat: 'emotion'   })),
    ...(signals?.archetypes ?? []).filter(s => s.trend === 'new').map(s => ({ ...s, cat: 'archetype' })),
  ];
  if (newSigs.length === 0) return null;

  return (
    <View style={fa.wrap}>
      <Text style={fa.sLabel}>İLK KEZ GÖRÜNENLER</Text>
      <Text style={fa.sSub}>Bu gece kolektif bilinçte ilk kez yüzeye çıkan sinyaller.</Text>
      <View style={fa.flow}>
        {newSigs.map((s, i) => {
          const lbl = s.cat === 'symbol'    ? labelOf(SYMBOL_CATEGORY_LABELS, s.name)
                    : s.cat === 'theme'     ? labelOf(THEME_LABELS, s.name)
                    : s.cat === 'emotion'   ? labelOf(EMOTION_LABELS, s.name)
                    : labelOf(ARCHETYPE_LABELS, s.name);
          return (
            <View key={`${s.cat}-${s.name}`} style={fa.item}>
              <Text style={fa.star}>✦</Text>
              <Text style={[fa.label, { fontSize: i === 0 ? 20 : i < 2 ? 16 : 13, opacity: i === 0 ? 0.90 : i < 3 ? 0.65 : 0.38 }]}>{lbl}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
const fa = StyleSheet.create({
  wrap:   { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  sLabel: { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sSub:   { fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 19, marginTop: -4 },
  flow:   { gap: 14 },
  item:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  star:   { fontSize: 12, color: '#FBBF24', opacity: 0.70 },
  label:  { fontWeight: '800', color: 'rgba(255,255,255,0.88)' },
});

// ── PRESERVED: Resonance Timeline ─────────────────────────────────────────────

function ResonanceTimeline({ signals }: { signals: DreamSignals | undefined }) {
  type Tagged = SignalItem & { cat: string };
  const all: Tagged[] = [
    ...(signals?.themes   ?? []).map(s => ({ ...s, cat: 'theme'   })),
    ...(signals?.emotions ?? []).map(s => ({ ...s, cat: 'emotion' })),
    ...(signals?.symbols  ?? []).map(s => ({ ...s, cat: 'symbol'  })),
  ].filter(s => s.count > 0);

  const lbl = (s: Tagged) =>
    s.cat === 'theme'  ? labelOf(THEME_LABELS, s.name)
    : s.cat === 'symbol' ? labelOf(SYMBOL_CATEGORY_LABELS, s.name)
    : labelOf(EMOTION_LABELS, s.name);

  const slots = [
    { id: 'evening',  name: 'Akşam',        icon: '🌆', sigs: all.filter(s => s.trend === 'falling').slice(0, 2).map(lbl) },
    { id: 'midnight', name: 'Gece Yarısı',  icon: '🌑', sigs: all.filter(s => s.trend === 'stable' && s.count > 5).slice(0, 2).map(lbl) },
    { id: 'deep',     name: 'Derin Uyku',   icon: '🌌', sigs: all.filter(s => s.trend === 'stable' && s.count <= 5).slice(0, 2).map(lbl) },
    { id: 'predawn',  name: 'Sabah Öncesi', icon: '🌅', sigs: all.filter(s => s.trend === 'rising' || s.trend === 'new').slice(0, 2).map(lbl) },
  ];
  if (!slots.some(s => s.sigs.length > 0)) return null;

  return (
    <View style={rtl.wrap}>
      <Text style={rtl.sLabel}>REZONANS ZAMANÇİZELGESİ</Text>
      <Text style={rtl.sSub}>Gecenin farklı evrelerinde hangi bağlantılar güçlendi?</Text>
      <View style={rtl.slots}>
        {slots.map((slot, i) => (
          <View key={slot.id} style={rtl.slot}>
            <Text style={rtl.icon}>{slot.icon}</Text>
            <View style={rtl.line}>
              <View style={rtl.dot} />
              {i < slots.length - 1 && <View style={rtl.connector} />}
            </View>
            <View style={rtl.body}>
              <Text style={rtl.slotName}>{slot.name}</Text>
              {slot.sigs.length > 0
                ? <Text style={rtl.slotSigs}>{slot.sigs.join('  ·  ')}</Text>
                : <Text style={rtl.slotEmpty}>Sessiz</Text>}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
const rtl = StyleSheet.create({
  wrap:      { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  sLabel:    { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sSub:      { fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 19, marginTop: -4 },
  slots:     { gap: 0, paddingTop: 8 },
  slot:      { flexDirection: 'row', gap: 14, alignItems: 'flex-start', minHeight: 64 },
  icon:      { fontSize: 20, width: 28, marginTop: 2 },
  line:      { alignItems: 'center', width: 12 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: '#A78BFA', marginTop: 6, opacity: 0.65 },
  connector: { flex: 1, width: 1, backgroundColor: 'rgba(167,139,250,0.18)', minHeight: 36, marginTop: 4 },
  body:      { flex: 1, paddingBottom: 20, gap: 6 },
  slotName:  { fontSize: 11, fontWeight: '900', letterSpacing: 1, color: 'rgba(255,255,255,0.48)' },
  slotSigs:  { fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.82)', lineHeight: 22 },
  slotEmpty: { fontSize: 13, color: 'rgba(255,255,255,0.20)', fontStyle: 'italic' },
});

// ── PRESERVED: Collective Question ────────────────────────────────────────────

function buildCollectiveQuestion(signals: DreamSignals | undefined, matches: DreamMatch[]): string {
  const allSigs    = [...(signals?.themes ?? []).map(s => ({ ...s, cat: 'theme' })), ...(signals?.symbols ?? []).map(s => ({ ...s, cat: 'symbol' }))];
  const topNew     = allSigs.find(s => s.trend === 'new');
  const topRising  = allSigs.filter(s => s.trend === 'rising').sort((a, b) => b.trendPct - a.trendPct)[0];
  const topFalling = (signals?.themes ?? []).filter(s => s.trend === 'falling').sort((a, b) => b.trendPct - a.trendPct)[0];
  const symFreq    = freqMap(matches, 'sharedSymbols');
  const emFreq     = freqMap(matches, 'sharedEmotions');
  const topSym     = topEntries(symFreq, 1)[0];
  const topEm      = topEntries(emFreq, 1)[0];

  if (topNew) {
    const lbl = topNew.cat === 'theme' ? labelOf(THEME_LABELS, topNew.name) : labelOf(SYMBOL_CATEGORY_LABELS, topNew.name);
    return `"${lbl}" sinyali bu gece ilk kez ortaya çıkıyor. Kolektif bilinçte ne değişiyor?`;
  }
  if (topRising && topFalling) {
    const r = topRising.cat === 'theme' ? labelOf(THEME_LABELS, topRising.name) : labelOf(SYMBOL_CATEGORY_LABELS, topRising.name);
    return `"${labelOf(THEME_LABELS, topFalling.name)}" zayıflarken "${r}" neden güçleniyor? Bu gece bilinçdışında ne dönüşüyor?`;
  }
  if (topSym && topSym[1] >= 3)
    return `Neden "${labelOf(SYMBOL_CATEGORY_LABELS, topSym[0])}" bu gece birbirinden bağımsız rüyalarda tekrar tekrar beliriyor?`;
  if (topEm && topEm[1] >= 3)
    return `Bu gece ${topEm[1]} farklı rüyacı aynı "${labelOf(EMOTION_LABELS, topEm[0])}" duygusunu yaşadı. Kolektif tetikleyici ne?`;
  const topThm = [...(signals?.themes ?? [])].sort((a, b) => b.count - a.count)[0];
  if (topThm)
    return `"${labelOf(THEME_LABELS, topThm.name)}" teması neden bu gece kolektif bilinçde bu kadar güçlü rezonans yaratıyor?`;
  return 'Bu gece kolektif bilinç nereye doğru akıyor? Hangi gizli örüntü henüz adlandırılmamayı bekliyor?';
}

function TonightCollectiveQuestion({ signals, matches }: { signals: DreamSignals | undefined; matches: DreamMatch[] }) {
  const question = buildCollectiveQuestion(signals, matches);
  return (
    <View style={cq.wrap}>
      <Text style={cq.sLabel}>BU GECENİN KOLEKTİF SORUSU</Text>
      <View style={cq.bar} />
      <Text style={cq.question}>{question}</Text>
      <Text style={cq.footer}>— Bilinç Gözlemevi</Text>
    </View>
  );
}
const cq = StyleSheet.create({
  wrap:     { paddingHorizontal: 24, paddingVertical: 28, paddingBottom: 48, gap: 16 },
  sLabel:   { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  bar:      { width: 24, height: 2, backgroundColor: 'rgba(167,139,250,0.45)' },
  question: { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.80)', lineHeight: 28, letterSpacing: -0.3, fontStyle: 'italic' },
  footer:   { fontSize: 11, color: 'rgba(255,255,255,0.22)', fontStyle: 'italic', fontWeight: '600', marginTop: 4 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function MatchesScreen() {
  const router = useRouter();

  const matchesQ   = useQuery({ queryKey: ['matches', 'my-matches'], queryFn: () => getMyMatches({ limit: 50 }), staleTime: 2 * 60 * 1000 });
  const clustersQ  = useQuery({ queryKey: ['clusters', 'me'],        queryFn: getMyClusters,     staleTime: 5 * 60 * 1000 });
  const signalsQ   = useQuery({ queryKey: ['signals', 'today'],      queryFn: getSignalsToday,   staleTime: 10 * 60 * 1000 });
  const dreamConnQ = useQuery({ queryKey: ['connections', 'me'],     queryFn: getDreamConnections, staleTime: 5 * 60 * 1000 });

  const matches = useMemo(() => {
    const seen = new Set<string>();
    return (matchesQ.data?.items ?? []).filter(m => {
      if (seen.has(m.matchingDreamId)) return false;
      seen.add(m.matchingDreamId);
      return true;
    });
  }, [matchesQ.data]);

  const clusters  = clustersQ.data ?? [];
  const signals   = signalsQ.data;
  const isLoading = matchesQ.isLoading;

  const onMatchPress   = (m: DreamMatch) => router.push(`/match/${m.id}` as any);
  const onClusterPress = (id: string)    => router.push(`/dream-clusters?id=${id}` as any);
  const onZonePress    = (clusterId: string | undefined) => {
    if (clusterId) router.push(`/dream-clusters?id=${clusterId}` as any);
    else           router.push('/dream-clusters' as any);
  };

  return (
    <SafeAreaView style={sc.container} edges={['top']}>
      <SubconsciousField />

      <View style={sc.header}>
        <Text style={sc.title}>REZONANS</Text>
        <Text style={sc.subtitle}>Kolektif Bilinçdışı Bağlantı Ağı</Text>
      </View>

      {isLoading ? (
        <View style={sc.loader}><ActivityIndicator color="#A78BFA" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sc.scroll}>

          {/* ── Empty state ── */}
          {!isLoading && matches.length === 0 && (
            <View style={sc.empty}>
              <Text style={sc.emptyTitle}>
                {'Bu gece bilinç alanında sana yakın\nbir rezonans bulunamadı.'}
              </Text>
              <Text style={sc.emptySub}>
                Yeni rüyalar paylaştıkça bilinçler kesişmeye başlar.
              </Text>
            </View>
          )}

          {/* ── NEW: Personal consciousness layer ── */}
          <MyConsciousnessProfile matches={matches} />
          <ResSep />
          <NearbyMindsSection matches={matches} />
          {matches.length > 0 && <ResSep />}
          <MatchExplanationList matches={matches} />
          <ResSep />
          <SharedConsciousnessField matches={matches} />
          <ResSep />
          <SharedSymbols matches={matches} />
          <ResSep />
          <SharedEmotions matches={matches} />
          <ResSep />
          <EmotionalProximity matches={matches} />
          <ResSep />
          <ResonanceTimeline signals={signals} />
          {signals && <ResSep />}
          <WhyResonate matches={matches} clusters={clusters} />
          {matches.length > 0 && <ResSep />}
          <CollectivePosition clusters={clusters} onPress={onClusterPress} />

          {/* ── PRESERVED: Collective intelligence layer ── */}
          <ResSep />
          <TonightStrongestResonance matches={matches} signals={signals} />
          <ResSep />
          <CollectiveFieldTonight signals={signals} />
          {signals && <ResSep />}
          <DreamResonanceSection matches={matches} onMatchPress={onMatchPress} />
          {matches.length > 0 && <ResSep />}
          <DreamEchoes matches={matches} />
          {matches.length > 0 && <ResSep />}
          <CollectiveConstellations clusters={clusters} onClusterPress={onClusterPress} />
          {clusters.length > 0 && <ResSep />}
          <UnexplainedConnections matches={matches} />
          <ResSep />
          <CollectiveResonanceMap matches={matches} onZonePress={onZonePress} />
          <ResSep />
          <DreamChains matches={matches} onMatchPress={onMatchPress} />
          {matches.length >= 2 && <ResSep />}
          <FirstAppearances signals={signals} />
          <ResSep />
          <TonightCollectiveQuestion signals={signals} matches={matches} />

          {(dreamConnQ.data?.total ?? 0) > 0 && (
            <>
              <ResSep />
              <View style={sc.connLinkWrap}>
                <Pressable
                  style={({ pressed }) => [sc.connLinkBtn, { opacity: pressed ? 0.75 : 1 }]}
                  onPress={() => router.push('/dream-connections')}
                >
                  <Ionicons name="git-network-outline" size={13} color="rgba(255,255,255,0.28)" />
                  <Text style={sc.connLinkText}>{dreamConnQ.data!.total} Karşılıklı Rüya Bağlantısı</Text>
                  <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.22)" />
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const sc = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#02010F' },
  header:       { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20, gap: 4 },
  title:        { fontSize: 9, fontWeight: '900', letterSpacing: 4, color: 'rgba(167,139,250,0.55)' },
  subtitle:     { fontSize: 22, fontWeight: '800', color: 'rgba(255,255,255,0.88)', letterSpacing: -0.4 },
  loader:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:       { paddingBottom: 0 },
  connLinkWrap: { paddingHorizontal: 24, paddingVertical: 20 },
  connLinkBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  connLinkText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.30)', fontWeight: '600' },
  empty:        { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8, alignItems: 'center', gap: 10 },
  emptyTitle:   { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 24 },
  emptySub:     { fontSize: 12, color: 'rgba(255,255,255,0.22)', textAlign: 'center', lineHeight: 20, fontStyle: 'italic' },
});
