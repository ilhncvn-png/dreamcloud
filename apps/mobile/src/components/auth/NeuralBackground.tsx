import React, { useEffect } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, Line, RadialGradient, Stop } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

function seeded(n: number): number {
  return Math.abs((((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1) + 1) % 1);
}

// ── Deterministic static data ────────────────────────────────────────────────
const STARS = Array.from({ length: 38 }, (_, i) => ({
  cx: seeded(i * 3 + 1) * 100,
  cy: seeded(i * 3 + 2) * 100,
  r: 0.28 + seeded(i * 3 + 3) * 0.72,
  op: 0.07 + seeded(i * 7 + 4) * 0.38,
}));

const LINES: { x1: number; y1: number; x2: number; y2: number; op: number }[] = [];
for (let i = 0; i < STARS.length; i++) {
  for (let j = i + 1; j < STARS.length; j++) {
    if (LINES.length >= 22) break;
    const dx = STARS[i].cx - STARS[j].cx;
    const dy = STARS[i].cy - STARS[j].cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 14)
      LINES.push({
        x1: STARS[i].cx,
        y1: STARS[i].cy,
        x2: STARS[j].cx,
        y2: STARS[j].cy,
        op: 0.03 + (1 - d / 14) * 0.055,
      });
  }
}
const GRID_H = Array.from({ length: 6 }, (_, i) => (i + 1) * (100 / 7));
const GRID_V = Array.from({ length: 9 }, (_, i) => (i + 1) * (100 / 10));

// ── Floating orb configs ─────────────────────────────────────────────────────
const ORBS = [
  { id: 0, x: 0.14, y: 0.2, size: 150, color: '#7B6FFF', op: 0.1, dur: 8200, del: 0 },
  { id: 1, x: 0.8, y: 0.58, size: 210, color: '#CC80FF', op: 0.065, dur: 10500, del: 1400 },
  { id: 2, x: 0.9, y: 0.16, size: 110, color: '#00CFFF', op: 0.085, dur: 7000, del: 700 },
  { id: 3, x: 0.26, y: 0.84, size: 130, color: '#9B6FFF', op: 0.075, dur: 9200, del: 2600 },
] as const;

const RING_DELAYS = [0, 2300, 4600] as const;

// ── FloatingOrb ──────────────────────────────────────────────────────────────
function FloatingOrb({ x, y, size, color, op, dur, del }: (typeof ORBS)[number]) {
  const float = useSharedValue(0);
  const breathe = useSharedValue(0.65);

  useEffect(() => {
    float.value = withDelay(
      del,
      withRepeat(withTiming(1, { duration: dur, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    breathe.value = withDelay(
      del + 300,
      withRepeat(
        withTiming(1, { duration: Math.round(dur * 0.72), easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: breathe.value * op,
    transform: [{ translateY: float.value * -16 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: x * W - size / 2,
          top: y * H - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

// ── PulseRing ────────────────────────────────────────────────────────────────
function PulseRing({ del }: { del: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      del,
      withRepeat(withTiming(1, { duration: 7500, easing: Easing.out(Easing.quad) }), -1, false),
    );
  }, []);

  const maxSize = Math.min(W, H) * 0.88;

  const style = useAnimatedStyle(() => ({
    opacity: (1 - progress.value) * 0.22,
    transform: [{ scale: 0.04 + progress.value * 0.96 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: W / 2 - maxSize / 2,
          top: H * 0.36 - maxSize / 2,
          width: maxSize,
          height: maxSize,
          borderRadius: maxSize / 2,
          borderWidth: 1,
          borderColor: 'rgba(123,111,255,0.55)',
        },
        style,
      ]}
    />
  );
}

// ── NeuralBackground ─────────────────────────────────────────────────────────
export default React.memo(function NeuralBackground() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Static SVG layer: grid · stars · constellation lines */}
      <Svg
        style={StyleSheet.absoluteFillObject}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <RadialGradient id="bgGlow" cx="50%" cy="36%" r="54%">
            <Stop offset="0%" stopColor="#7B6FFF" stopOpacity="0.06" />
            <Stop offset="55%" stopColor="#CC80FF" stopOpacity="0.022" />
            <Stop offset="100%" stopColor="#060614" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="50" cy="36" rx="56" ry="54" fill="url(#bgGlow)" />
        {GRID_H.map((y, i) => (
          <Line
            key={`h${i}`}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="rgba(123,111,255,0.02)"
            strokeWidth="0.07"
          />
        ))}
        {GRID_V.map((x, i) => (
          <Line
            key={`v${i}`}
            x1={x}
            y1="0"
            x2={x}
            y2="100"
            stroke="rgba(123,111,255,0.016)"
            strokeWidth="0.065"
          />
        ))}
        {LINES.map((l, i) => (
          <Line
            key={i}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={`rgba(204,128,255,${l.op})`}
            strokeWidth="0.07"
          />
        ))}
        {STARS.map((s, i) => (
          <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={`rgba(232,220,255,${s.op})`} />
        ))}
      </Svg>

      {/* Animated floating orbs */}
      {ORBS.map((orb) => (
        <FloatingOrb key={orb.id} {...orb} />
      ))}

      {/* Pulse rings from center */}
      {RING_DELAYS.map((del, i) => (
        <PulseRing key={i} del={del} />
      ))}
    </View>
  );
});
