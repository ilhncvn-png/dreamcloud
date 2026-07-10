import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/api/notifications.api';
import { NotificationsIcon } from '@/design/icons';
import Avatar from '@/components/Avatar';
import EmptyState from '@/components/EmptyState';
import NotificationSkeleton from '@/components/skeletons/NotificationSkeleton';
import type { Notification, NotificationType } from '@/types/notification.types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TypeConfig {
  iconName: IoniconName;
  color: string;
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Az önce';
  if (mins < 60) return `${mins}dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}s önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}g önce`;
  return new Date(isoString).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function getDateGroup(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) return 'Bu Hafta';
  return 'Daha Önce';
}

const TYPE_CONFIG: Record<NotificationType, TypeConfig> = {
  like:             { iconName: 'heart-outline',          color: '#F472B6' },
  save:             { iconName: 'bookmark-outline',       color: Colors.primary },
  comment:          { iconName: 'chatbubble-outline',     color: '#60A5FA' },
  follow:           { iconName: 'person-add-outline',     color: '#4CAF87' },
  dream_mention:    { iconName: 'eye-outline',            color: '#F472B6' },
  dream_match:      { iconName: 'sparkles-outline',       color: Colors.primary },
  dream_connection: { iconName: 'git-compare-outline',   color: '#4CAF87' },
  shared_symbol:    { iconName: 'shapes-outline',         color: '#60A5FA' },
  shared_location:  { iconName: 'location-outline',       color: '#4CAF87' },
  high_resonance:   { iconName: 'flash-outline',          color: '#FBBF24' },
  signal_trending:  { iconName: 'trending-up-outline',    color: '#A78BFA' },
  dream_milestone:  { iconName: 'trophy-outline',         color: '#FBBF24' },
  interpretation:   { iconName: 'bulb-outline',           color: '#FBBF24' },
  system:           { iconName: 'notifications-outline',  color: Colors.textMuted },
};

const FALLBACK_CONFIG: TypeConfig = { iconName: 'notifications-outline', color: Colors.textMuted };

type ListItem =
  | { kind: 'header'; label: string; key: string }
  | { kind: 'notif'; data: Notification; key: string };

function NotifItem({
  notif,
  onPress,
}: {
  notif: Notification;
  onPress: (notif: Notification) => void;
}) {
  const conf = TYPE_CONFIG[notif.type] ?? FALLBACK_CONFIG;
  const actorName = notif.actor?.username ?? '';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.notifItem,
        !notif.isRead && styles.notifUnread,
        { opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={() => { onPress(notif); }}
    >
      {/* Actor avatar or type icon */}
      <View style={styles.avatarWrapper}>
        {notif.actor ? (
          <Avatar
            uri={notif.actor.avatarUrl ?? null}
            name={actorName || '?'}
            size={44}
          />
        ) : (
          <View style={[styles.iconBox, { borderColor: `${conf.color}40`, backgroundColor: `${conf.color}12` }]}>
            <Ionicons name={conf.iconName} size={20} color={conf.color} />
          </View>
        )}
        {notif.actor && (
          <View style={[styles.typeTag, { borderColor: `${conf.color}50`, backgroundColor: Colors.background }]}>
            <Ionicons name={conf.iconName} size={10} color={conf.color} />
          </View>
        )}
        {!notif.isRead && <View style={styles.unreadDot} />}
      </View>

      <View style={styles.notifContent}>
        <Text style={styles.notifTitle} numberOfLines={1}>
          {notif.title}
        </Text>
        <Text style={styles.notifBody} numberOfLines={2}>
          {notif.body}
        </Text>
        <Text style={styles.notifTime}>{timeAgo(notif.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam = 1 }) => getNotifications(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: (_data, id) => {
      qc.setQueryData(['notifications'], (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((n) =>
              n.id === id ? { ...n, isRead: true } : n,
            ),
          })),
        };
      });
      void qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      qc.setQueryData(['notifications'], (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((n) => ({ ...n, isRead: true })),
          })),
        };
      });
      void qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const allNotifs = data?.pages.flatMap((p) => p.items) ?? [];
  const unreadCount = allNotifs.filter((n) => !n.isRead).length;

  function handlePress(notif: Notification) {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }

    const matchTypes: Notification['type'][] = [
      'dream_match', 'dream_connection', 'shared_symbol', 'shared_location', 'high_resonance',
    ];

    if (notif.type === 'dream_mention' && notif.dreamId) {
      router.push(`/dream/${notif.dreamId}`);
    } else if (matchTypes.includes(notif.type) && notif.matchId) {
      router.push(`/match/${notif.matchId}`);
    } else if (notif.type === 'signal_trending') {
      router.push('/(tabs)/signals');
    } else if (notif.dreamId) {
      router.push(`/dream/${notif.dreamId}`);
    } else if (notif.actor && notif.type === 'follow') {
      router.push(`/user/${notif.actor.id}`);
    }
  }

  // Build grouped list with date headers
  const listItems: ListItem[] = [];
  let lastGroup = '';
  for (const notif of allNotifs) {
    const group = getDateGroup(notif.createdAt);
    if (group !== lastGroup) {
      listItems.push({ kind: 'header', label: group, key: `header-${group}` });
      lastGroup = group;
    }
    listItems.push({ kind: 'notif', data: notif, key: notif.id });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Bildirimler</Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <Pressable
              style={({ pressed }) => [styles.markAllBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => { markAllMutation.mutate(); }}
              disabled={markAllMutation.isPending}
            >
              <Text style={styles.markAllText}>Tümünü oku</Text>
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            onPress={() => { router.push('/notification-settings'); }}
          >
            <Ionicons name="settings-outline" size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <NotificationSkeleton count={6} />
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            if (item.kind === 'header') {
              return (
                <View style={styles.dateHeader}>
                  <Text style={styles.dateHeaderText}>{item.label}</Text>
                </View>
              );
            }
            return <NotifItem notif={item.data} onPress={handlePress} />;
          }}
          ListEmptyComponent={
            <EmptyState
              icon={<NotificationsIcon size={52} color={Colors.textMuted} />}
              title="Henüz bildirim yok"
              subtitle="Biri rüyanı beğendiğinde veya yorum yaptığında burada görürsünüz."
            />
          }
          ListFooterComponent={
            <View>
              {isFetchingNextPage && (
                <NotificationSkeleton count={2} />
              )}
              {hasNextPage && !isFetchingNextPage && (
                <Pressable
                  style={({ pressed }) => [styles.loadMoreBtn, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => { void fetchNextPage(); }}
                >
                  <Text style={styles.loadMoreText}>Daha fazla yükle</Text>
                </Pressable>
              )}
              <View style={{ height: 24 }} />
            </View>
          }
          contentContainerStyle={listItems.length === 0 ? styles.emptyFlex : undefined}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isLoading}
              onRefresh={() => { void refetch(); }}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  screenTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primaryGlow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  markAllText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

  dateHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  dateHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  notifUnread: {
    backgroundColor: 'rgba(108, 99, 255, 0.06)',
  },

  avatarWrapper: {
    position: 'relative',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeTag: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.background,
  },

  notifContent: { flex: 1, gap: 3 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  notifBody: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  notifTime: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  emptyFlex: { flexGrow: 1 },

  loadMoreBtn: { alignItems: 'center', paddingVertical: 14 },
  loadMoreText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});
