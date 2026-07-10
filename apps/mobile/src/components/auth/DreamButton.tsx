import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface DreamButtonProps {
  onPress: () => void;
  title: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
}

export default function DreamButton({
  onPress,
  title,
  loading = false,
  disabled = false,
  variant = 'primary',
}: DreamButtonProps) {
  const scale = useSharedValue(1);
  const shadowOpac = useSharedValue(0.42);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpac.value,
  }));

  function handlePressIn() {
    scale.value = withSpring(0.972, { damping: 16, stiffness: 320 });
    shadowOpac.value = withSpring(0.18, { damping: 16 });
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 16, stiffness: 320 });
    shadowOpac.value = withSpring(0.42, { damping: 16 });
  }

  if (variant === 'ghost') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [styles.ghost, pressed && styles.ghostPressed]}
        accessibilityRole="button"
      >
        <Text style={styles.ghostText}>{title}</Text>
      </Pressable>
    );
  }

  return (
    <Animated.View style={[styles.shadow, animStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={styles.pressable}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={disabled ? ['#3D3566', '#3D3566'] : ['#7B6FFF', '#9B6FFF', '#CC80FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {loading ? (
            <View style={styles.row}>
              <ActivityIndicator color="rgba(255,255,255,0.75)" size="small" />
              <Text style={styles.text}>İŞLENİYOR</Text>
            </View>
          ) : (
            <Text style={[styles.text, disabled && styles.textDisabled]}>{title}</Text>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 14,
    shadowColor: '#7B6FFF',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 22,
    elevation: 10,
    marginTop: 4,
  },
  pressable: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  textDisabled: { opacity: 0.55 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ghost: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  ghostPressed: { opacity: 0.6 },
  ghostText: {
    color: 'rgba(232,232,255,0.4)',
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
