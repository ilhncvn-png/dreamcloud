import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors } from '@/constants/colors';

function ShimmerBlock({
  width,
  height,
  borderRadius = 6,
  opacity,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  opacity: Animated.Value;
}) {
  return (
    <Animated.View
      style={[
        styles.block,
        { width: width as number, height, borderRadius, opacity },
      ]}
    />
  );
}

function SkeletonCard({ opacity }: { opacity: Animated.Value }) {
  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.inner}>
        <View style={styles.topRow}>
          <ShimmerBlock width={60} height={20} borderRadius={10} opacity={opacity} />
          <ShimmerBlock width={80} height={16} borderRadius={8} opacity={opacity} />
        </View>
        <ShimmerBlock width={'90%'} height={20} opacity={opacity} />
        <ShimmerBlock width={'70%'} height={16} opacity={opacity} />
        <ShimmerBlock width={'95%'} height={14} opacity={opacity} />
        <ShimmerBlock width={'80%'} height={14} opacity={opacity} />
        <View style={styles.footer}>
          <ShimmerBlock width={22} height={22} borderRadius={11} opacity={opacity} />
          <ShimmerBlock width={70} height={12} opacity={opacity} />
        </View>
      </View>
    </View>
  );
}

export default function DreamCardSkeleton({ count = 4 }: { count?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} opacity={opacity} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: Colors.border,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  accent: {
    width: 4,
    backgroundColor: Colors.border,
  },
  inner: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
});
