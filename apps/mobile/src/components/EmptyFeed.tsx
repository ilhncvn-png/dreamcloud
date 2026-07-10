import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors } from '@/constants/colors';
import { MoonIcon } from '@/design/icons';

interface EmptyFeedProps {
  onCreatePress?: () => void;
}

export default function EmptyFeed({ onCreatePress }: EmptyFeedProps) {
  return (
    <View style={styles.container}>
      <View style={styles.illustration}>
        <View style={styles.moonWrapper}>
          <MoonIcon size={64} color={Colors.textPrimary} />
        </View>
        <View style={styles.starsRow}>
          <Text style={styles.star}>✦</Text>
          <Text style={[styles.star, styles.starLarge]}>✦</Text>
          <Text style={styles.star}>✦</Text>
        </View>
      </View>

      <Text style={styles.title}>Henüz rüya yok</Text>
      <Text style={styles.subtitle}>
        Her gece uyurken hayal kuruyorsun.{'\n'}Onları burada saklamaya başla.
      </Text>

      {onCreatePress && (
        <Pressable
          style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]}
          onPress={onCreatePress}
        >
          <Text style={styles.buttonText}>İlk Rüyayı Kaydet</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
    gap: 16,
  },
  illustration: {
    alignItems: 'center',
    marginBottom: 8,
  },
  moonWrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: -8,
  },
  star: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  starLarge: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
});
