import { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserProfile, toggleFollow, getUserDreams } from '@/api/users.api';
import { useAuthStore } from '@/store/auth.store';
import DreamCard from '@/components/DreamCard';
import DreamCardSkeleton from '@/components/DreamCardSkeleton';
import Avatar from '@/components/Avatar';
import EmptyState from '@/components/EmptyState';
import { Colors } from '@/constants/colors';
import { BackIcon, MoonIcon } from '@/design/icons';
import type { Dream, DreamsPage } from '@/types/dream.types';

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);
  const queryClient = useQueryClient();
  const { user: me } = useAuthStore();

  const profileKey = ['user', 'profile', id];

  const { data: profile, isLoading: profileLoading, isError } = useQuery({
    queryKey: profileKey,
    queryFn: () => getUserProfile(id),
    enabled: !!id,
  });

  const {
    data: dreamsData,
    isLoading: dreamsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['user', 'dreams', id],
    queryFn: ({ pageParam }) => getUserDreams(id, pageParam as number | undefined),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage: DreamsPage) => {
      const { page, pages } = lastPage.meta;
      return page < pages ? page + 1 : undefined;
    },
    enabled: !!id,
  });

  const { mutate: follow, isPending } = useMutation({
    mutationFn: () => toggleFollow(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: profileKey });
      const prev = queryClient.getQueryData(profileKey);
      queryClient.setQueryData(profileKey, (old: typeof profile) => {
        if (!old) return old;
        const toggled = !old.isFollowing;
        return {
          ...old,
          isFollowing: toggled,
          followerCount: toggled ? old.followerCount + 1 : Math.max(0, old.followerCount - 1),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) queryClient.setQueryData(profileKey, ctx.prev);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: profileKey });
    },
  });

  const isOwnProfile = me?.sub === id;
  const dreams: Dream[] = dreamsData?.pages.flatMap((p) => p.items) ?? [];
  const feedQueryKey = ['user', 'dreams', id];

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: Dream }) => (
      <DreamCard
        dream={item}
        onPress={() => { router.push(`/dream/${item.id}`); }}
        feedQueryKey={feedQueryKey}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, id],
  );

  const keyExtractor = useCallback((item: Dream) => item.id, []);

  const displayName = profile?.displayName ?? profile?.username ?? '';

  const ListHeader = useMemo(() => (
    <View>
      {profileLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <MoonIcon size={48} color={Colors.textMuted} />
          <Text style={styles.errorTitle}>Kullanıcı bulunamadı</Text>
          <Pressable style={styles.retryButton} onPress={goBack}>
            <Text style={styles.retryText}>Geri Dön</Text>
          </Pressable>
        </View>
      ) : profile ? (
        <View style={styles.profileHero}>
          <Avatar
            uri={profile.avatarUrl}
            name={displayName || '?'}
            size={88}
            withRing
          />

          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.usernameText}>@{profile.username}</Text>

          {profile.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatBox value={profile.followerCount} label="Takipçi" />
            <View style={styles.statDivider} />
            <StatBox value={profile.followingCount} label="Takip" />
            <View style={styles.statDivider} />
            <StatBox value={profile.totalDreams} label="Rüya" />
          </View>

          {isOwnProfile ? (
            <Pressable
              style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => { router.push('/profile/edit'); }}
            >
              <Text style={styles.editBtnText}>Profili Düzenle</Text>
            </Pressable>
          ) : (
            <View style={styles.actionRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.followButton,
                  profile.isFollowing && styles.followButtonActive,
                  { opacity: pressed || isPending ? 0.75 : 1 },
                ]}
                onPress={() => { follow(); }}
                disabled={isPending}
                accessibilityRole="button"
                accessibilityLabel={profile.isFollowing ? 'Takibi bırak' : 'Takip et'}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.followButtonText,
                      profile.isFollowing && styles.followButtonTextActive,
                    ]}
                  >
                    {profile.isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
                  </Text>
                )}
              </Pressable>
            </View>
          )}

          <Text style={styles.joinText}>
            {new Date(profile.createdAt).toLocaleDateString('tr-TR', {
              month: 'long',
              year: 'numeric',
            })} tarihinden beri
          </Text>
        </View>
      ) : null}

      {/* Dreams section header */}
      {!profileLoading && !isError && profile && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rüyalar</Text>
          {profile.totalDreams > 0 && (
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{profile.totalDreams}</Text>
            </View>
          )}
        </View>
      )}

      {dreamsLoading && (
        <View style={{ paddingTop: 4 }}>
          <DreamCardSkeleton count={3} />
        </View>
      )}
    </View>
  ), [profile, profileLoading, isError, displayName, isPending, isOwnProfile, dreamsLoading, router, follow]);

  const ListFooter = isFetchingNextPage ? (
    <ActivityIndicator size="small" color={Colors.primary} style={styles.footerLoader} />
  ) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Geri git"
        >
          <BackIcon size={24} color={Colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {profile?.displayName ?? profile?.username ?? 'Profil'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={dreams}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={
          !dreamsLoading && !profileLoading ? (
            <EmptyState
              icon={<MoonIcon size={52} color={Colors.textMuted} />}
              title="Henüz rüya yok"
              subtitle="Bu kullanıcı henüz rüya paylaşmadı."
            />
          ) : null
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !dreamsLoading}
            onRefresh={() => { void refetch(); }}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 32,
    color: Colors.primary,
    fontWeight: '300',
    lineHeight: 36,
    marginTop: -2,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  headerRight: { width: 40 },

  listContent: { paddingBottom: 40 },

  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  errorTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  retryButton: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retryText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  profileHero: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 8,
    paddingHorizontal: 24,
    gap: 0,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
    marginTop: 14,
    marginBottom: 4,
  },
  usernameText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
    marginBottom: 10,
  },
  bio: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    maxWidth: 280,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginTop: 12,
    marginBottom: 16,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border },

  actionRow: { width: '100%', gap: 10, marginBottom: 8 },
  followButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  followButtonActive: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  followButtonText: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  followButtonTextActive: { color: Colors.primary },

  editBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    marginBottom: 8,
  },
  editBtnText: { fontSize: 15, fontWeight: '700', color: Colors.primary, letterSpacing: 0.2 },

  joinText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 8,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sectionBadge: {
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  footerLoader: { paddingVertical: 20 },
});
