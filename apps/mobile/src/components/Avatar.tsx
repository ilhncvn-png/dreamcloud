import { useState, useEffect } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
  withRing?: boolean;
  onPress?: () => void;
}

export default function Avatar({ uri, name, size = 40, withRing = false, onPress }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Reset error when URI changes so a corrected URL is retried
  useEffect(() => {
    setImgError(false);
  }, [uri]);

  const initial = ((name.trim()[0]) ?? '?').toUpperCase();
  const showImage = !!uri && !imgError;

  const inner = showImage ? (
    <Image
      source={{ uri }}
      style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      onError={(e) => {
        if (__DEV__) console.warn('[Avatar] image load error for uri:', uri, e.nativeEvent?.error);
        setImgError(true);
      }}
    />
  ) : (
    <View
      style={[
        styles.initials,
        { width: size, height: size, borderRadius: size / 2 },
        withRing && { backgroundColor: Colors.primaryDark },
      ]}
    >
      <Text style={[styles.initialsText, { fontSize: size * 0.38 }]}>{initial}</Text>
    </View>
  );

  const container = withRing ? (
    <View
      style={[
        styles.ring,
        { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 },
      ]}
    >
      {inner}
    </View>
  ) : (
    inner
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
        hitSlop={8}
      >
        {container}
      </Pressable>
    );
  }

  return <>{container}</>;
}

const styles = StyleSheet.create({
  ring: {
    padding: 3,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    backgroundColor: Colors.surface,
  },
  initials: {
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
});
