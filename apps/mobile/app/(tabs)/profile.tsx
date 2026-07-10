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
import { useRouter } from 'expo-router';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth.store';
import { getMyProfile } from '@/api/users.api';
import { getMyDreams } from '@/api/dreams.api';
import DreamCard from '@/components/DreamCard';
import DreamCardSkeleton from '@/components/DreamCardSkeleton';
import EmptyState from '@/components/EmptyState';
import Avatar from '@/components/Avatar';
import { Colors } from '@/constants/colors';
import { SettingsIcon, MoonIcon } from '@/design/icons';
import type { Dream, DreamsPage } from '@/types/dream.types';
import type { DreamPreferences } from '@/types/user.types';

// ── Emoji maps ─────────────────────────────────────────────────────────────────

const ARCHETYPE_EMOJI: Record<string, string> = {
  'Kahraman': '⚔️', 'Gölge': '🌑', 'Bilge': '🦉', 'Yaratıcı': '🎨',
  'Kaşif': '🗺️', 'Bakıcı': '🌸', 'Asi': '⚡', 'Büyücü': '✨',
  'Çocuk': '🌟', 'Trickster': '🎭',
};
const ENERGY_EMOJI: Record<string, string> = {
  'Ateş': '🔥', 'Su': '💧', 'Toprak': '🌿', 'Hava': '💨',
  'Işık': '☀️', 'Gölge': '🌑', 'Yıldız': '⭐', 'Ay': '🌙',
};
const MOOD_EMOJI: Record<string, string> = {
  'Macera': '🗺️', 'Huzur': '🕊️', 'Kaos': '🌀', 'Melankoli': '🌧️',
  'Neşe': '✨', 'Korku': '👁️', 'Gizemli': '🌙', 'Nostaljik': '📜',
  'Karmaşık': '🎭', 'Nötr': '⚖️',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DreamBadge({ emoji, label }: { emoji: string; label: string }) {
  return (
    <View style={styles.dreamBadge}>
      <Text style={styles.dreamBadgeEmoji}>{emoji}</Text>
      <Text style={styles.dreamBadgeLabel}>{label}</Text>
    </View>
  );
}

function IdentityGridItem({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <View style={styles.identityGridItem}>
      <Text style={styles.identityGridItemEmoji}>{emoji}</Text>
      <View style={styles.identityGridItemContent}>
        <Text style={styles.identityGridItemLabel}>{label}</Text>
        <Text style={styles.identityGridItemValue}>{value}</Text>
      </View>
    </View>
  );
}

function IdentityDetailRow({ iconName, label, value }: {
  iconName: string; label: string; value: string;
}) {
  return (
    <View style={styles.identityDetailRow}>
      <Ionicons name={iconName as any} size={14} color={Colors.primary} />
      <Text style={styles.identityDetailLabel}>{label}</Text>
      <Text style={styles.identityDetailValue}>{value}</Text>
    </View>
  );
}

function PrivacyPill({ iconName, label, active }: {
  iconName: string; label: string; active: boolean;
}) {
  return (
    <View style={[styles.privacyPill, active && styles.privacyPillActive]}>
      <Ionicons
        name={iconName as any}
        size={10}
        color={active ? Colors.primary : Colors.textMuted}
      />
      <Text style={[styles.privacyPillText, active && styles.privacyPillTextActive]}>
        {label}
      </Text>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function OwnProfileScreen() {
  const router = useRouter();
  const { user: me } = useAuthStore();
  const userId = me?.sub ?? '';

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: getMyProfile,
    enabled: !!userId,
    staleTime: 0,
  });

  const {
    data,
    isLoading: dreamsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['dreams', 'me'],
    queryFn: ({ pageParam }) => getMyDreams(pageParam as number | undefined),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage: DreamsPage) => {
      const { page, pages } = lastPage.meta;
      return page < pages ? page + 1 : undefined;
    },
    enabled: !!userId,
    staleTime: 0,
  });

  const dreams: Dream[] = data?.pages.flatMap((p) => p.items) ?? [];
  const dreamCount = data?.pages[0]?.meta.total ?? 0;

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const feedQueryKey = ['dreams', 'me'];
  const displayName = profile?.displayName ?? profile?.username ?? me?.email ?? '';
  const username = profile?.username ?? me?.email ?? '';

  const renderItem = useCallback(
    ({ item }: { item: Dream }) => (
      <DreamCard
        dream={item}
        onPress={() => { router.push(`/dream/${item.id}`); }}
        feedQueryKey={feedQueryKey}
        showVisibility
      />
    ),
    [router],
  );

  const keyExtractor = useCallback((item: Dream) => item.id, []);

  const ListHeader = useMemo(() => {
    const prefs       = ((profile?.preferences ?? {}) as DreamPreferences);
    const archetype   = prefs.dreamArchetype  ?? '';
    const energy      = prefs.dreamEnergy     ?? '';
    const mood        = prefs.dreamMood       ?? '';
    const symbol      = prefs.favoriteSymbol  ?? '';
    const frequency   = prefs.dreamFrequency  ?? '';
    const lucid       = prefs.lucidExperience ?? '';
    const themes      = prefs.commonThemes    ?? [];
    const statement   = prefs.personalStatement ?? '';
    const language    = prefs.language        ?? '';
    const location    = profile?.locationCity ?? '';

    const hasBadges   = !!(archetype || energy || mood);
    const hasIdentity = !!(archetype || energy || mood || symbol || frequency || lucid || themes.length);

    // Build grid items for 2-column layout (max 4)
    const gridItems: { emoji: string; label: string; value: string }[] = [];
    if (archetype) gridItems.push({ emoji: ARCHETYPE_EMOJI[archetype] ?? '🌙', label: 'Arketip', value: archetype });
    if (energy)    gridItems.push({ emoji: ENERGY_EMOJI[energy]       ?? '⚡', label: 'Enerji',  value: energy });
    if (mood)      gridItems.push({ emoji: MOOD_EMOJI[mood]           ?? '🎭', label: 'Ruh Hali', value: mood });
    if (symbol)    gridItems.push({ emoji: '✦',                               label: 'Sembol',   value: symbol });

    return (
      <View>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          {profileLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 56 }} />
          ) : profile ? (
            <>
              {__DEV__ && console.log('[Profile] avatarUrl:', profile.avatarUrl)}

              {/* Avatar with layered glow */}
              <View style={styles.avatarGlowOuter}>
                <View style={styles.avatarGlowInner}>
                  <Avatar
                    key={profile.avatarUrl ?? 'no-avatar'}
                    uri={profile.avatarUrl}
                    name={displayName}
                    size={96}
                    withRing
                  />
                </View>
              </View>

              {/* Name */}
              <Text style={styles.displayName}>{displayName}</Text>
              <Text style={styles.usernameText}>@{username}</Text>

              {/* Dream signature badges */}
              {hasBadges && (
                <View style={styles.badgeRow}>
                  {archetype && (
                    <DreamBadge emoji={ARCHETYPE_EMOJI[archetype] ?? '🌙'} label={archetype} />
                  )}
                  {energy && (
                    <DreamBadge emoji={ENERGY_EMOJI[energy] ?? '⚡'} label={energy} />
                  )}
                  {mood && (
                    <DreamBadge emoji={MOOD_EMOJI[mood] ?? '🎭'} label={mood} />
                  )}
                </View>
              )}

              {/* Bio */}
              {profile.bio ? (
                <Text style={styles.bio}>{profile.bio}</Text>
              ) : (
                <Pressable
                  onPress={() => { router.push('/profile/edit'); }}
                  style={({ pressed }) => [styles.addBioBtn, { opacity: pressed ? 0.65 : 1 }]}
                >
                  <Text style={styles.addBioBtnText}>+ Bio ekle</Text>
                </Pressable>
              )}

              {/* Personal statement — italicised quote */}
              {!!statement && (
                <Text style={styles.statement}>"{statement}"</Text>
              )}

              {/* Location · Language */}
              {(!!location || !!language) && (
                <View style={styles.metaRow}>
                  {!!location && (
                    <View style={styles.metaChip}>
                      <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
                      <Text style={styles.metaChipText}>{location}</Text>
                    </View>
                  )}
                  {!!language && (
                    <View style={styles.metaChip}>
                      <Ionicons name="language-outline" size={11} color={Colors.textMuted} />
                      <Text style={styles.metaChipText}>{language}</Text>
                    </View>
                  )}
                </View>
              )}
            </>
          ) : null}
        </View>

        {/* ── STATS ─────────────────────────────────────────────────────────── */}
        {!!profile && (
          <View style={styles.statsCard}>
            <StatItem value={dreamCount} label="Rüya" />
            <View style={styles.statDivider} />
            <StatItem value={profile!.followerCount} label="Takipçi" />
            <View style={styles.statDivider} />
            <StatItem value={profile!.followingCount} label="Takip" />
          </View>
        )}

        {/* ── DREAM IDENTITY CARD ───────────────────────────────────────────── */}
        {hasIdentity && (
          <View style={styles.identityCard}>
            {/* Card header */}
            <View style={styles.identityCardHeader}>
              <View style={styles.identityCardHeaderLeft}>
                <Text style={styles.identityCardHeaderEmoji}>🌙</Text>
                <Text style={styles.identityCardHeaderTitle}>Rüya Kimliği</Text>
              </View>
              <Pressable
                onPress={() => { router.push('/dream-identity'); }}
                style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
                hitSlop={8}
              >
                <Text style={styles.identityCardHeaderLink}>Detay →</Text>
              </Pressable>
            </View>

            {/* 2-column grid for first 4 identity traits */}
            {gridItems.length > 0 && (
              <View style={styles.identityGrid}>
                <View style={styles.identityGridRow}>
                  {gridItems[0] && (
                    <IdentityGridItem {...gridItems[0]} />
                  )}
                  {gridItems[1] && (
                    <IdentityGridItem {...gridItems[1]} />
                  )}
                </View>
                {gridItems.length > 2 && (
                  <View style={styles.identityGridRow}>
                    {gridItems[2] && (
                      <IdentityGridItem {...gridItems[2]} />
                    )}
                    {gridItems[3] && (
                      <IdentityGridItem {...gridItems[3]} />
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Full-width detail rows */}
            {!!frequency && (
              <IdentityDetailRow
                iconName="moon-outline"
                label="Rüya Sıklığı"
                value={frequency}
              />
            )}
            {!!lucid && (
              <IdentityDetailRow
                iconName="sparkles-outline"
                label="Lucid Deneyim"
                value={lucid}
              />
            )}

            {/* Common themes */}
            {themes.length > 0 && (
              <View style={styles.themesSection}>
                <Text style={styles.themesLabel}>Yaygın Temalar</Text>
                <View style={styles.themeTagRow}>
                  {themes.map((t) => (
                    <View key={t} style={styles.themeTag}>
                      <Text style={styles.themeTagText}>#{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── PRIVACY & DISCOVERY INDICATORS ───────────────────────────────── */}
        {!!profile && (
          <View style={styles.privacyRow}>
            <PrivacyPill
              iconName={profile.isPublic ? 'globe-outline' : 'lock-closed-outline'}
              label={profile.isPublic ? 'Herkese Açık' : 'Gizli Profil'}
              active={true}
            />
            {prefs.allowDreamMatching === true && (
              <PrivacyPill
                iconName="git-compare-outline"
                label="Rüya Eşleşme"
                active={true}
              />
            )}
            {prefs.allowSeenInDreams === true && (
              <PrivacyPill
                iconName="eye-outline"
                label="Rüyamda Görün"
                active={true}
              />
            )}
            {prefs.anonymousDiscovery === true && (
              <PrivacyPill
                iconName="person-outline"
                label="Anonim Keşif"
                active={true}
              />
            )}
          </View>
        )}

        {/* ── EDIT BUTTON ───────────────────────────────────────────────────── */}
        {!!profile && (
          <View style={styles.actionsArea}>
            <Pressable
              style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => { router.push('/profile/edit'); }}
            >
              <Ionicons name="pencil-outline" size={15} color={Colors.primary} />
              <Text style={styles.editBtnText}>Profili Düzenle</Text>
            </Pressable>
          </View>
        )}

        {/* ── DREAMS SECTION HEADER ─────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Rüyalarım</Text>
            {dreamCount > 0 && (
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{dreamCount}</Text>
              </View>
            )}
          </View>
        </View>

        {dreamsLoading && (
          <View style={{ paddingTop: 8 }}>
            <DreamCardSkeleton count={3} />
          </View>
        )}
      </View>
    );
  }, [profile, profileLoading, displayName, username, dreamCount, dreamsLoading, router]);

  const ListFooter = isFetchingNextPage ? (
    <ActivityIndicator size="small" color={Colors.primary} style={styles.footerLoader} />
  ) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
        <Pressable
          style={({ pressed }) => [styles.settingsButton, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => { router.push('/settings'); }}
          accessibilityRole="button"
          accessibilityLabel="Ayarlar"
        >
          <SettingsIcon size={22} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <FlatList
        data={dreams}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={
          !dreamsLoading ? (
            <EmptyState
              icon={<MoonIcon size={52} color={Colors.textMuted} />}
              title="Henüz rüya yok"
              subtitle="İlk rüyanı paylaşmaya başla"
              action={{
                label: 'Rüya Ekle',
                onPress: () => { router.push('/(tabs)/add-dream'); },
              }}
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
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  listContent: { paddingBottom: 48 },
  footerLoader: { paddingVertical: 20 },

  // ── Header bar ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle:   { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  settingsButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // ── Hero ──
  hero: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },

  // Layered purple glow rings around avatar
  avatarGlowOuter: {
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: 'rgba(108, 99, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  avatarGlowInner: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(108, 99, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  displayName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  usernameText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
    letterSpacing: 0.1,
    marginBottom: 13,
  },

  // Dream signature badges (archetype · energy · mood)
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  dreamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(108, 99, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.28)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dreamBadgeEmoji: { fontSize: 12 },
  dreamBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.3,
  },

  bio: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 10,
    maxWidth: 280,
  },
  addBioBtn:    { marginBottom: 10, paddingVertical: 4 },
  addBioBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  statement: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 10,
    maxWidth: 260,
    letterSpacing: 0.1,
  },

  // Location · Language chips
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  metaChipText: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },

  // ── Stats card ──
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  statItem:  { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border },

  // ── Dream Identity Card ──
  identityCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.22)',
    overflow: 'hidden',
  },
  identityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: 'rgba(108, 99, 255, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108, 99, 255, 0.14)',
  },
  identityCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  identityCardHeaderEmoji: { fontSize: 15 },
  identityCardHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  identityCardHeaderLink: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },

  // 2-column grid
  identityGrid: {
    padding: 10,
    gap: 8,
  },
  identityGridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  identityGridItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  identityGridItemEmoji: { fontSize: 20 },
  identityGridItemContent: { flex: 1 },
  identityGridItemLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  identityGridItemValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  // Full-width detail rows (frequency, lucid)
  identityDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  identityDetailLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  identityDetailValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '700',
  },

  // Common themes
  themesSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: 8,
  },
  themesLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  themeTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  themeTag: {
    backgroundColor: 'rgba(108, 99, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.22)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  themeTagText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },

  // ── Privacy pills ──
  privacyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  privacyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  privacyPillActive: {
    backgroundColor: 'rgba(108, 99, 255, 0.08)',
    borderColor: 'rgba(108, 99, 255, 0.30)',
  },
  privacyPillText: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.1 },
  privacyPillTextActive: { color: Colors.primary },

  // ── Edit button ──
  actionsArea: { marginHorizontal: 16, marginBottom: 12 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  editBtnText: { fontSize: 15, fontWeight: '700', color: Colors.primary, letterSpacing: 0.2 },

  // ── Dreams section ──
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle:   { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sectionBadge: {
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
});
