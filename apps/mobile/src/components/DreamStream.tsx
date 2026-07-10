import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Avatar from '@/components/Avatar';
import { Colors } from '@/constants/colors';

// Elegant ring: 2px gradient border, compact avatar
const OUTER = 62;
const INNER = 58;
const AV    = 52;

// Softer, less saturated gradients
const RING_COLORS: Record<string, [string, string, string] | undefined> = {
  lucid:     ['#A78BFA', '#DDD6FE', '#8B5CF6'],
  beautiful: ['#F9A8D4', '#FBCFE8', '#EC4899'],
  nightmare: ['#FCA5A5', '#FED7D7', '#F87171'],
  normal:    ['#93C5FD', '#DBEAFE', '#60A5FA'],
  fantasy:   ['#FCD34D', '#FEF3C7', '#F59E0B'],
};

const DEFAULT_RING: [string, string, string] = ['#A5B4FC', '#E0E7FF', '#818CF8'];

export interface StreamItemData {
  userId:    string;
  username:  string;
  avatarUrl: string | null;
  dreamId:   string;
  category:  string;
}

function StreamItem({
  item,
  onPress,
}: {
  item:    StreamItemData;
  onPress: () => void;
}) {
  const colors = RING_COLORS[item.category] ?? DEFAULT_RING;

  return (
    <Pressable
      style={({ pressed }) => [styles.item, { opacity: pressed ? 0.72 : 1 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`@${item.username}'nın rüyasını gör`}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ring}
      >
        <View style={styles.ringGap}>
          <Avatar uri={item.avatarUrl} name={item.username} size={AV} />
        </View>
      </LinearGradient>
      <Text style={styles.username} numberOfLines={1}>
        @{item.username}
      </Text>
    </Pressable>
  );
}

export default function DreamStream({ items }: { items: StreamItemData[] }) {
  const router = useRouter();

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Aktif Rüyalar</Text>
        <View style={styles.sectionLine} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {items.map((item) => (
          <StreamItem
            key={item.userId}
            item={item}
            onPress={() => { router.push(`/dream/${item.dreamId}`); }}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingBottom: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 7,
    paddingBottom: 6,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  item: {
    alignItems: 'center',
    width: OUTER + 4,
  },
  ring: {
    width: OUTER,
    height: OUTER,
    borderRadius: OUTER / 2,
    padding: (OUTER - INNER) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringGap: {
    width: INNER,
    height: INNER,
    borderRadius: INNER / 2,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: 9,
    fontWeight: '500',
    color: Colors.textMuted,
    marginTop: 4,
    maxWidth: OUTER + 4,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
