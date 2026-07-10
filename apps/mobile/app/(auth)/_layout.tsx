import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  // On web, Expo exports static HTML for each auth route. Reanimated's
  // useAnimatedStyle returns different styles during the SSG pass than on the
  // client, which triggers React error #418 (hydration mismatch).
  // Gating the Stack behind a client-only flag keeps the SSG shell minimal
  // (just the dark background) and lets all animations run on the client only.
  const [mounted, setMounted] = useState(Platform.OS !== 'web');

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <View style={styles.root}>
      {mounted && <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060614' },
});
