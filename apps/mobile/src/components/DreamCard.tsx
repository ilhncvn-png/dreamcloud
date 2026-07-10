import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, CategoryColors, CategoryLabels } from '@/constants/colors';
import type { Dream } from '@/types/dream.types';
import LikeSaveBar from './LikeSaveBar';
import Avatar from './Avatar';
import { PrivateIcon, FollowersIcon } from '@/design/icons';

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'şimdi';
  if (minutes < 60) return `${minutes}dk`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}s`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}g`;
  const months = Math.floor(days / 30);
  return `${months}ay`;
}

interface DreamCardProps {
  dream: Dream;
  authorName?: string | undefined;
  onPress?: (() => void) | undefined;
  feedQueryKey?: unknown[] | undefined;
  showVisibility?: boolean | undefined;
}

export default function DreamCard({
  dream,
  authorName,
  onPress,
  feedQueryKey,
  showVisibility = false,
}: DreamCardProps) {
  const router = useRouter();
  const cat = CategoryColors[dream.category];
  const displayName = authorName ?? dream.author?.username ?? 'Anonim';
  const authorId = dream.author?.id ?? dream.userId;
  const avatarUri = dream.author?.avatarUrl ?? null;

  function handleAuthorPress() {
    if (authorId) router.push(`/user/${authorId}`);
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.88 : 1 }]}
      onPress={onPress}
      accessibilityRole="button"
    >
      {/* Left category accent bar */}
      <View style={[styles.categoryAccent, { backgroundColor: cat.accent }]} />

      <View style={styles.inner}>
        {/* Author row — top of card */}
        <Pressable
          style={styles.authorRow}
          onPress={handleAuthorPress}
          hitSlop={4}
        >
          {__DEV__ && console.log('[DreamCard] author avatarUri:', avatarUri)}
          <Avatar
            key={avatarUri ?? 'no-avatar'}
            uri={avatarUri}
            name={displayName}
            size={32}
          />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName} numberOfLines={1}>{displayName}</Text>
            <View style={styles.authorMeta}>
              <View style={[styles.categoryPill, { backgroundColor: cat.bg }]}>
                <Text style={[styles.categoryLabel, { color: cat.text }]}>
                  {CategoryLabels[dream.category]}
                </Text>
              </View>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.time}>{formatRelativeTime(dream.createdAt)}</Text>
            </View>
          </View>
          {showVisibility && dream.visibility !== 'public' && (
            <View style={styles.visibilityIcon}>
              {dream.visibility === 'private'
                ? <PrivateIcon size={14} color={Colors.textMuted} />
                : <FollowersIcon size={14} color={Colors.textMuted} />}
            </View>
          )}
        </Pressable>

        {/* Title */}
        {dream.title ? (
          <Text style={styles.title} numberOfLines={2}>{dream.title}</Text>
        ) : null}

        {/* Content */}
        <Text style={styles.content} numberOfLines={dream.title ? 3 : 4}>
          {dream.content}
        </Text>

        {/* Tags */}
        {dream.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {dream.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
            {dream.tags.length > 3 && (
              <Text style={styles.tagOverflow}>+{dream.tags.length - 3}</Text>
            )}
          </View>
        )}

        {/* Stats bar */}
        <LikeSaveBar dream={dream} queryKey={feedQueryKey} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  categoryAccent: {
    width: 3,
  },
  inner: {
    flex: 1,
    padding: 12,
    gap: 8,
  },

  // Author
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorInfo: {
    flex: 1,
    gap: 3,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.1,
  },
  authorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryPill: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  dot: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  time: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  visibilityIcon: {
    marginLeft: 4,
    justifyContent: 'center',
  },

  // Content
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 21,
    letterSpacing: 0.1,
  },
  content: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    alignItems: 'center',
  },
  tag: {
    backgroundColor: Colors.primaryGlow,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  tagOverflow: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
