import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface Props {
  message: string;
}

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

export default function AuthErrorCard({ message }: Props) {
  const ty = useSharedValue(-14);
  const op = useSharedValue(0);

  useEffect(() => {
    ty.value = withSpring(0, { damping: 15, stiffness: 220 });
    op.value = withSpring(1, { damping: 15 });
  }, [message, ty, op]);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.dot} />
        <Text style={[styles.tag, { fontFamily: MONO }]}>AUTHENTICATION FAILED</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,74,94,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,74,94,0.32)',
    borderRadius: 14,
    padding: 14,
    gap: 7,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4A5E',
    shadowColor: '#FF4A5E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 2,
  },
  tag: {
    fontSize: 9,
    letterSpacing: 1.7,
    color: 'rgba(255,74,94,0.65)',
    textTransform: 'uppercase',
  },
  message: {
    fontSize: 13,
    color: 'rgba(255,100,120,0.9)',
    lineHeight: 19,
    marginLeft: 14,
  },
});
