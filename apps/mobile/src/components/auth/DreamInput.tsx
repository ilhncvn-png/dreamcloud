import React, { useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Platform, type TextInputProps } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export interface DreamInputProps extends TextInputProps {
  label: string;
  error?: string;
  suffix?: React.ReactNode;
}

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

export default function DreamInput({
  label,
  error,
  suffix,
  onFocus,
  onBlur,
  ...rest
}: DreamInputProps) {
  const focus = useSharedValue(0);
  const isErr = useSharedValue(error ? 1 : 0);

  useEffect(() => {
    isErr.value = withTiming(error ? 1 : 0, { duration: 200 });
  }, [error, isErr]);

  const wrapStyle = useAnimatedStyle(() => {
    const normalBorder = interpolateColor(
      focus.value,
      [0, 1],
      ['rgba(123,111,255,0.18)', 'rgba(123,111,255,0.72)'],
    );
    const borderColor = isErr.value > 0.5 ? 'rgba(255,74,94,0.65)' : normalBorder;
    const shadowOpacity = isErr.value > 0.5 ? 0 : focus.value * 0.2;
    return { borderColor, shadowOpacity };
  });

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { fontFamily: MONO }]}>{label}</Text>
      <Animated.View style={[styles.wrap, wrapStyle]}>
        <TextInput
          style={styles.input}
          placeholderTextColor="rgba(232,232,255,0.2)"
          onFocus={(e) => {
            focus.value = withTiming(1, { duration: 220 });
            onFocus?.(e);
          }}
          onBlur={(e) => {
            focus.value = withTiming(0, { duration: 220 });
            onBlur?.(e);
          }}
          {...rest}
        />
        {suffix != null && <View style={styles.suffix}>{suffix}</View>}
      </Animated.View>
      {error != null && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: {
    fontSize: 9,
    letterSpacing: 1.7,
    color: 'rgba(123,111,255,0.58)',
    textTransform: 'uppercase',
    marginLeft: 2,
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6,6,20,0.82)',
    borderWidth: 1,
    borderRadius: 14,
    shadowColor: '#7B6FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
    elevation: 0,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: 'rgba(232,232,255,0.93)',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  suffix: { paddingRight: 12, paddingLeft: 4 },
  errorText: {
    fontSize: 11,
    color: 'rgba(255,90,110,0.88)',
    marginLeft: 4,
    letterSpacing: 0.2,
  },
});
