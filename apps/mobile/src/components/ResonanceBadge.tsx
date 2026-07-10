import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ResonanceLevel } from '@/types/match.types';

interface Props {
  level: ResonanceLevel;
  score: number;
  size?: 'sm' | 'lg';
}

const CONFIG: Record<ResonanceLevel, {
  label: string;
  sublabel: string;
  color: string;
  glow: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  stars: number;
}> = {
  signal:    { label: 'SİNYAL',    sublabel: 'Zayıf Rezonans',    color: '#60A5FA', glow: 'rgba(96,165,250,0.18)',   icon: 'radio-outline',          stars: 1 },
  resonance: { label: 'REZONANS',  sublabel: 'Orta Rezonans',     color: '#A78BFA', glow: 'rgba(167,139,250,0.18)', icon: 'pulse-outline',          stars: 2 },
  strong:    { label: 'GÜÇLÜ',     sublabel: 'Güçlü Rezonans',    color: '#6C63FF', glow: 'rgba(108,99,255,0.20)',  icon: 'flash-outline',          stars: 3 },
  deep:      { label: 'DERİN',     sublabel: 'Derin Rezonans',    color: '#F472B6', glow: 'rgba(244,114,182,0.20)', icon: 'infinite-outline',       stars: 4 },
  mirror:    { label: 'AYNA',      sublabel: 'Mükemmel Rezonans', color: '#FBBF24', glow: 'rgba(251,191,36,0.22)',  icon: 'sparkles-outline',       stars: 5 },
};

const MAX_SCORE = 100;

export default function ResonanceBadge({ level, score, size = 'sm' }: Props) {
  const cfg  = CONFIG[level] ?? CONFIG.signal;
  const isLg = size === 'lg';

  return (
    <View style={[styles.wrapper, isLg && styles.wrapperLg]}>
      {/* Glow ring */}
      <View style={[
        styles.ring,
        isLg ? styles.ringLg : styles.ringSm,
        { borderColor: cfg.color, backgroundColor: cfg.glow },
      ]}>
        <Ionicons name={cfg.icon} size={isLg ? 28 : 16} color={cfg.color} />
      </View>

      {/* Text */}
      <View style={styles.textBlock}>
        <Text style={[styles.level, { color: cfg.color }, isLg && styles.levelLg]}>
          {cfg.label}
        </Text>
        {isLg && (
          <Text style={[styles.sublabel, { color: cfg.color }]}>{cfg.sublabel}</Text>
        )}
      </View>

      {/* Stars */}
      <View style={styles.stars}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Ionicons
            key={i}
            name="star"
            size={isLg ? 11 : 8}
            color={i < cfg.stars ? cfg.color : 'rgba(255,255,255,0.12)'}
          />
        ))}
      </View>
    </View>
  );
}

// Score bar used in the detail screen
export function ResonanceScoreBar({ score, level }: { score: number; level: ResonanceLevel }) {
  const cfg  = CONFIG[level] ?? CONFIG.signal;
  const pct  = Math.min(score / MAX_SCORE, 1);

  return (
    <View style={bar.wrapper}>
      <View style={bar.track}>
        <View style={[bar.fill, { width: `${pct * 100}%` as any, backgroundColor: cfg.color }]} />
        {/* Threshold markers */}
        {[0.25, 0.45, 0.65, 0.85].map((pos) => (
          <View key={pos} style={[bar.marker, { left: `${pos * 100}%` as any }]} />
        ))}
      </View>
      <View style={bar.labels}>
        <Text style={bar.labelText}>Sinyal</Text>
        <Text style={bar.labelText}>Rezonans</Text>
        <Text style={bar.labelText}>Güçlü</Text>
        <Text style={bar.labelText}>Derin</Text>
        <Text style={bar.labelText}>Ayna</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrapperLg: { gap: 12 },

  ring: {
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSm: { width: 32, height: 32 },
  ringLg: { width: 56, height: 56 },

  textBlock: { gap: 1 },
  level:    { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  levelLg:  { fontSize: 16 },
  sublabel: { fontSize: 11, fontWeight: '500', opacity: 0.8 },

  stars: { flexDirection: 'row', gap: 2 },
});

const bar = StyleSheet.create({
  wrapper: { gap: 6 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'visible',
    position: 'relative',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  marker: {
    position: 'absolute',
    top: -2,
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
  },
});
