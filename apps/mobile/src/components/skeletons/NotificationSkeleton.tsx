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
      style={[styles.block, { width: width as number, height, borderRadius, opacity }]}
    />
  );
}

function SkeletonItem({ opacity }: { opacity: Animated.Value }) {
  return (
    <View style={styles.item}>
      <ShimmerBlock width={44} height={44} borderRadius={22} opacity={opacity} />
      <View style={styles.content}>
        <ShimmerBlock width={'70%'} height={14} opacity={opacity} />
        <ShimmerBlock width={'90%'} height={12} opacity={opacity} />
        <ShimmerBlock width={60} height={10} opacity={opacity} />
      </View>
    </View>
  );
}

export default function NotificationSkeleton({ count = 6 }: { count?: number }) {
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
        <SkeletonItem key={i} opacity={opacity} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: Colors.border },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  content: { flex: 1, gap: 8 },
});
