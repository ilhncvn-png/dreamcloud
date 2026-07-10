import { useRef, useEffect, useState } from 'react';
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
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getWeatherNow } from '@/api/weather.api';
import type { DreamTrace, DreamWeather, TraceType } from '@/types/weather.types';
import { Colors } from '@/constants/colors';

// ── Layout constants ──────────────────────────────────────────────────────────

const { width: W, height: SCREEN_H } = Dimensions.get('window');
const PANEL_H    = 200;
const FIELD_H    = SCREEN_H - PANEL_H - 100; // 100 for header
const CX         = W / 2;
const CY         = FIELD_H * 0.48;
const R_INNER    = 95;
const R_OUTER    = 145;
const INNER_ANGS = [-90, 30, 150];
const OUTER_ANGS = [-45, 45, 135, 225];

// ── Color map ─────────────────────────────────────────────────────────────────

const NODE_COLORS: Record<TraceType | string, string> = {
  theme:     '#A78BFA',
  emotion:   '#F472B6',
  symbol:    '#60A5FA',
  archetype: '#FBBF24',
  location:  '#34D399',
  figure:    '#FBBF24',
};

// ── Node type ─────────────────────────────────────────────────────────────────

type CNode = {
  id:     string;
  label:  string;
  type:   string;
  count:  number;
  users:  number;
  ring:   'center' | 'inner' | 'outer';
  x:      number;
  y:      number;
  size:   number;
  color:  string;
  trace:  DreamTrace;
};

// ── Build nodes from weather data ─────────────────────────────────────────────

function buildNodes(weather: DreamWeather): CNode[] {
  const nodes: CNode[] = [];
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const center = weather.dominantTrace ?? weather.topTraces[0] ?? null;
  if (!center) return nodes;

  nodes.push({
    id:    center.id,
    label: center.label,
    type:  center.type,
    count: center.currentCount,
    users: center.activeUsers,
    ring:  'center',
    x:     CX,
    y:     CY,
    size:  68,
    color: NODE_COLORS[center.type] ?? '#A78BFA',
    trace: center,
  });

  const emotions = weather.topTraces.filter(t => t.type === 'emotion' && t.id !== center.id).slice(0, 3);
  INNER_ANGS.forEach((ang, i) => {
    const t = emotions[i];
    if (!t) return;
    const rad = toRad(ang);
    nodes.push({
      id:    t.id,
      label: t.label,
      type:  t.type,
      count: t.currentCount,
      users: t.activeUsers,
      ring:  'inner',
      x:     CX + Math.cos(rad) * R_INNER,
      y:     CY + Math.sin(rad) * R_INNER,
      size:  48,
      color: NODE_COLORS[t.type] ?? '#F472B6',
      trace: t,
    });
  });

  const outer = weather.topTraces
    .filter(t => t.type !== 'emotion' && t.id !== center.id)
    .slice(0, 4);
  OUTER_ANGS.forEach((ang, i) => {
    const t = outer[i];
    if (!t) return;
    const rad = toRad(ang);
    nodes.push({
      id:    t.id,
      label: t.label,
      type:  t.type,
      count: t.currentCount,
      users: t.activeUsers,
      ring:  'outer',
      x:     CX + Math.cos(rad) * R_OUTER,
      y:     CY + Math.sin(rad) * R_OUTER,
      size:  38,
      color: NODE_COLORS[t.type] ?? '#60A5FA',
      trace: t,
    });
  });

  return nodes;
}

// ── Connection line ───────────────────────────────────────────────────────────

function ConnLine({ from, to, color }: { from: CNode; to: CNode; color: string }) {
  const dx  = to.x - from.x;
  const dy  = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ang = `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left:     (from.x + to.x) / 2 - len / 2,
        top:      (from.y + to.y) / 2 - 0.5,
        width:    len,
        height:   1,
        backgroundColor: color,
        opacity:  0.15,
        transform: [{ rotate: ang }],
      }}
    />
  );
}

// ── Single constellation node ─────────────────────────────────────────────────

function ConstellationNode({
  node,
  selected,
  breathe,
  onPress,
}: {
  node:     CNode;
  selected: boolean;
  breathe:  Animated.Value;
  onPress:  () => void;
}) {
  const CONTAINER_W = 90;
  const glow = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.80] });
  const ring = breathe.interpolate({ inputRange: [0, 1], outputRange: [node.size * 0.5, node.size * 0.85] });

  return (
    <Pressable
      onPress={onPress}
      style={{
        position: 'absolute',
        left:     node.x - CONTAINER_W / 2,
        top:      node.y - node.size / 2,
        width:    CONTAINER_W,
        alignItems: 'center',
      }}
    >
      {/* Glow ring (behind circle) */}
      <Animated.View
        pointerEvents="none"
        style={{
          position:    'absolute',
          width:       ring,
          height:      ring,
          borderRadius: Animated.divide(ring, 2) as unknown as number,
          backgroundColor: node.color,
          opacity:     glow,
          top:         node.size / 2,
          transform:   [{ translateY: -1 }],
          alignSelf:   'center',
          marginTop:   -(node.size * 0.85) / 2,
        }}
      />
      {/* Node circle */}
      <View
        style={{
          width:        node.size,
          height:       node.size,
          borderRadius: node.size / 2,
          backgroundColor: `${node.color}${selected ? '55' : '28'}`,
          borderWidth:  selected ? 1.5 : StyleSheet.hairlineWidth,
          borderColor:  node.color,
          alignItems:   'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontSize:   node.ring === 'center' ? 10 : 8.5,
            fontWeight: '800',
            color:      node.color,
            letterSpacing: 0.3,
          }}
          numberOfLines={1}
        >
          {node.count}
        </Text>
      </View>
      {/* Label below circle — never breaks */}
      <Text
        numberOfLines={1}
        style={{
          marginTop:    5,
          fontSize:     node.ring === 'center' ? 11 : 9.5,
          fontWeight:   node.ring === 'center' ? '700' : '600',
          color:        selected ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.60)',
          letterSpacing: 0.1,
          width:        CONTAINER_W,
          textAlign:    'center',
        }}
      >
        {node.label}
      </Text>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CollectiveResonanceScreen() {
  const { data: weather, isLoading } = useQuery({
    queryKey:  ['weather', 'now'],
    queryFn:   getWeatherNow,
    staleTime: 5 * 60 * 1000,
    retry:     1,
  });

  const [selected, setSelected] = useState<CNode | null>(null);

  // 3 breathe animations at different tempos per ring
  const bCenter = useRef(new Animated.Value(0)).current;
  const bInner  = useRef(new Animated.Value(0)).current;
  const bOuter  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const mk = (v: Animated.Value, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ]),
      );
    const a1 = mk(bCenter, 4200);
    const a2 = mk(bInner,  3500);
    const a3 = mk(bOuter,  2900);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [bCenter, bInner, bOuter]);

  const nodes = weather ? buildNodes(weather) : [];
  const center = nodes.find(n => n.ring === 'center');

  const breatheFor = (ring: 'center' | 'inner' | 'outer') =>
    ring === 'center' ? bCenter : ring === 'inner' ? bInner : bOuter;

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back} hitSlop={14}>
          <Ionicons name="arrow-back-outline" size={18} color={Colors.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Kolektif Rezonans</Text>
          {weather ? (
            <Text style={s.headerSub}>
              {weather.weatherTitle}
              {'  ·  '}
              {weather.totalDreamers} rüyacı
            </Text>
          ) : null}
        </View>
      </View>

      {/* Constellation field */}
      <View style={[s.field, { height: FIELD_H }]}>
        {isLoading && (
          <Text style={s.loadingText}>Rezonans alanı hesaplanıyor…</Text>
        )}

        {/* Connection lines — drawn before nodes so they appear behind */}
        {center && nodes.filter(n => n !== center).map(n => (
          <ConnLine key={`line-${n.id}`} from={center} to={n} color={center.color} />
        ))}

        {/* Nodes — outer first so center renders on top */}
        {[...nodes].reverse().map(node => (
          <ConstellationNode
            key={node.id}
            node={node}
            selected={selected?.id === node.id}
            breathe={breatheFor(node.ring)}
            onPress={() => setSelected(prev => prev?.id === node.id ? null : node)}
          />
        ))}
      </View>

      {/* Bottom panel */}
      <View style={[s.panel, { height: PANEL_H }]}>
        {selected ? (
          <NodeDetail node={selected} onClose={() => setSelected(null)} />
        ) : (
          <WeatherSummaryPanel weather={weather} isLoading={isLoading} />
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Node detail panel ─────────────────────────────────────────────────────────

function NodeDetail({ node, onClose }: { node: CNode; onClose: () => void }) {
  const TYPE_LABELS: Record<string, string> = {
    theme:     'TEMA',
    emotion:   'DUYGU',
    symbol:    'SEMBOL',
    archetype: 'ARKETİP',
    location:  'MEKAN',
    figure:    'FİGÜR',
  };

  return (
    <View style={nd.wrap}>
      <View style={nd.topRow}>
        <View style={[nd.typeChip, { borderColor: `${node.color}40`, backgroundColor: `${node.color}12` }]}>
          <Text style={[nd.typeText, { color: node.color }]}>
            {TYPE_LABELS[node.type] ?? node.type.toUpperCase()}
          </Text>
        </View>
        <Text style={nd.label} numberOfLines={1}>{node.label}</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={16} color={Colors.textMuted} />
        </Pressable>
      </View>

      <View style={nd.statsRow}>
        <View style={nd.stat}>
          <Text style={[nd.statVal, { color: node.color }]}>{node.count}</Text>
          <Text style={nd.statLbl}>rüya</Text>
        </View>
        <View style={nd.sep} />
        <View style={nd.stat}>
          <Text style={[nd.statVal, { color: node.color }]}>{node.users}</Text>
          <Text style={nd.statLbl}>rüyacı</Text>
        </View>
        <View style={nd.sep} />
        <View style={nd.stat}>
          <Text style={[nd.statVal, { color: 'rgba(255,255,255,0.55)' }]}>
            {node.ring === 'center' ? 'BASKIN' : node.ring === 'inner' ? 'ETKİN' : 'AKTİF'}
          </Text>
          <Text style={nd.statLbl}>etki</Text>
        </View>
      </View>

      <Pressable
        style={[nd.cta, { borderColor: `${node.color}35` }]}
        onPress={() =>
          router.push({
            pathname: '/traces/[type]/[name]',
            params: { type: node.type, name: node.trace.name },
          })
        }
      >
        <Text style={[nd.ctaText, { color: node.color }]}>Bu izi keşfet</Text>
        <Ionicons name="arrow-forward" size={11} color={node.color} />
      </Pressable>
    </View>
  );
}

// ── Weather summary panel ─────────────────────────────────────────────────────

function WeatherSummaryPanel({
  weather,
  isLoading,
}: {
  weather:   DreamWeather | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <View style={ws.wrap}>
        <Text style={ws.placeholder}>Sinyaller hesaplanıyor…</Text>
      </View>
    );
  }
  if (!weather) return null;

  return (
    <ScrollView
      style={ws.scroll}
      contentContainerStyle={ws.wrap}
      showsVerticalScrollIndicator={false}
    >
      <Text style={ws.hint}>Bir düğüme dokunarak detayları görüntüleyin</Text>
      <Text style={ws.summary}>{weather.weatherSummary}</Text>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: '#04030F' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  back:        { padding: 4 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  headerSub:   { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  field:       { position: 'relative', overflow: 'hidden' },
  loadingText: {
    position: 'absolute', alignSelf: 'center', top: '40%',
    fontSize: 13, color: Colors.textMuted,
  },

  panel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(99,91,255,0.18)',
    backgroundColor: '#06041A',
  },
});

const nd = StyleSheet.create({
  wrap:    { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  topRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeChip:{ borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  typeText:{ fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  label:   { flex: 1, fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  statsRow:{ flexDirection: 'row', alignItems: 'center', gap: 20 },
  stat:    { alignItems: 'center', gap: 2 },
  statVal: { fontSize: 20, fontWeight: '800' },
  statLbl: { fontSize: 10, color: Colors.textMuted, letterSpacing: 0.3 },
  sep:     { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: 'rgba(255,255,255,0.10)' },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: 10,
    paddingVertical: 7, paddingHorizontal: 12,
  },
  ctaText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
});

const ws = StyleSheet.create({
  scroll:      { flex: 1 },
  wrap:        { paddingHorizontal: 20, paddingTop: 16, gap: 6 },
  hint:        { fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: 0.5 },
  summary:     { fontSize: 13.5, color: 'rgba(255,255,255,0.72)', lineHeight: 21 },
  placeholder: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginTop: 30 },
});
