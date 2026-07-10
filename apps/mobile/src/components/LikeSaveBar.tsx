import { View, Text, StyleSheet, Pressable, ActivityIndicator, Share } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleLike, toggleSave } from '@/api/dreams.api';
import { Colors } from '@/constants/colors';
import { LikeIcon, CommentIcon, SaveIcon, ShareIcon } from '@/design/icons';
import { SAVED_DREAMS_KEY } from '@/hooks/useSavedDreams';
import type { Dream } from '@/types/dream.types';

const SAVED_KEY = SAVED_DREAMS_KEY as unknown as string[];

// Other feed query keys to keep isSaved in sync across screens.
const FEED_KEYS = [
  ['dreams', 'public'],
  ['dreams', 'me'],
] as const;

interface LikeSaveBarProps {
  dream: Dream;
  queryKey?: unknown[] | undefined;
}

export default function LikeSaveBar({ dream, queryKey }: LikeSaveBarProps) {
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(dream.id),
    onMutate: async () => {
      if (queryKey) await queryClient.cancelQueries({ queryKey });
      const snapshot = queryClient.getQueryData(queryKey ?? []);
      if (queryKey) {
        updateDreamInCache(queryClient, queryKey, dream.id, (d) => ({
          ...d,
          isLiked: !d.isLiked,
          likeCount: d.isLiked ? Math.max(0, d.likeCount - 1) : d.likeCount + 1,
        }));
      }
      return { snapshot };
    },
    onSuccess: (result) => {
      if (queryKey) {
        updateDreamInCache(queryClient, queryKey, dream.id, (d) => ({
          ...d,
          isLiked: result.isLiked,
          likeCount: result.likeCount,
        }));
      }
    },
    onError: (_err, _vars, context) => {
      if (queryKey && context?.snapshot !== undefined) {
        queryClient.setQueryData(queryKey, context.snapshot);
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => toggleSave(dream.id),
    onMutate: async () => {
      // Cancel in-flight queries so they don't overwrite optimistic data.
      if (queryKey) await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: SAVED_KEY });

      const snapshot      = queryClient.getQueryData(queryKey ?? []);
      const savedSnapshot = queryClient.getQueryData(SAVED_KEY);

      // Update the originating query (detail / feed / profile).
      if (queryKey) {
        updateDreamInCache(queryClient, queryKey, dream.id, (d) => ({
          ...d,
          isSaved: !d.isSaved,
          saveCount: d.isSaved ? Math.max(0, d.saveCount - 1) : d.saveCount + 1,
        }));
      }

      // Optimistic update of the saved-dreams list.
      // If the cache doesn't exist yet, seed it so the saved-dreams screen
      // shows the correct data immediately without waiting for a refetch.
      const wasAlreadySaved = dream.isSaved;
      updateSavedListInCache(queryClient, SAVED_KEY, dream.id, wasAlreadySaved, dream);

      return { snapshot, savedSnapshot };
    },
    onSuccess: (result) => {
      // Reconcile with server truth on the originating query.
      if (queryKey) {
        updateDreamInCache(queryClient, queryKey, dream.id, (d) => ({
          ...d,
          isSaved: result.isSaved,
          saveCount: result.saveCount,
        }));
      }

      // Propagate isSaved change to home feed and profile caches.
      for (const key of FEED_KEYS) {
        updateDreamInCache(queryClient, [...key], dream.id, (d) => ({
          ...d,
          isSaved: result.isSaved,
          saveCount: result.saveCount,
        }));
      }

      // Mark saved-dreams list stale; it refetches when the screen mounts
      // (staleTime:0 in useSavedDreams). Background refetch is skipped to
      // avoid a failed API call leaving the query in an error state.
      void queryClient.invalidateQueries({ queryKey: SAVED_KEY, refetchType: 'active' });
    },
    onError: (_err, _vars, context) => {
      if (queryKey && context?.snapshot !== undefined) {
        queryClient.setQueryData(queryKey, context.snapshot);
      }
      if (context?.savedSnapshot !== undefined) {
        queryClient.setQueryData(SAVED_KEY, context.savedSnapshot);
      }
    },
  });

  return (
    <View style={styles.row}>
      {/* Like */}
      <Pressable
        style={({ pressed }) => [
          styles.action,
          dream.isLiked && styles.actionLiked,
          { opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={() => { likeMutation.mutate(); }}
        disabled={likeMutation.isPending}
        hitSlop={6}
      >
        {likeMutation.isPending ? (
          <ActivityIndicator size="small" color="#FF6B9D" style={styles.loader} />
        ) : (
          <>
            <LikeIcon
              size={15}
              color={dream.isLiked ? '#FF6B9D' : Colors.textMuted}
              filled={dream.isLiked}
            />
            <Text style={[styles.count, dream.isLiked && styles.countLiked]}>
              {dream.likeCount}
            </Text>
          </>
        )}
      </Pressable>

      <View style={styles.separator} />

      {/* Comment count — read-only */}
      <View style={styles.statRead}>
        <CommentIcon size={15} color={Colors.textMuted} />
        <Text style={styles.count}>{dream.commentCount}</Text>
      </View>

      <View style={styles.separator} />

      {/* Save */}
      <Pressable
        style={({ pressed }) => [
          styles.action,
          dream.isSaved && styles.actionSaved,
          { opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={() => { saveMutation.mutate(); }}
        disabled={saveMutation.isPending}
        hitSlop={6}
      >
        {saveMutation.isPending ? (
          <ActivityIndicator size="small" color={Colors.success} style={styles.loader} />
        ) : (
          <>
            <SaveIcon
              size={15}
              color={dream.isSaved ? Colors.success : Colors.textMuted}
              filled={dream.isSaved}
            />
            <Text style={[styles.count, dream.isSaved && styles.countSaved]}>
              {dream.saveCount}
            </Text>
          </>
        )}
      </Pressable>

      <View style={styles.separator} />

      {/* Share */}
      <Pressable
        style={({ pressed }) => [styles.action, { opacity: pressed ? 0.7 : 1 }]}
        onPress={() => {
          const message = [dream.title, dream.content].filter(Boolean).join('\n\n');
          void Share.share({ message: message || 'DreamCloud' });
        }}
        hitSlop={6}
      >
        <ShareIcon size={15} color={Colors.textMuted} />
      </Pressable>
    </View>
  );
}

function updateDreamInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: unknown[],
  dreamId: string,
  updater: (d: Dream) => Dream,
): void {
  queryClient.setQueryData(queryKey, (old: unknown) => {
    if (!old || typeof old !== 'object') return old;

    // Paginated list: { pages: [{ items: Dream[] }] }
    const pages = (old as { pages?: { items?: Dream[] }[] }).pages;
    if (pages) {
      return {
        ...old,
        pages: pages.map((page) => ({
          ...page,
          items: (page.items ?? []).map((d) => (d.id === dreamId ? updater(d) : d)),
        })),
      };
    }

    // Wrapped single dream: { data: Dream }
    const wrapped = (old as { data?: Dream }).data;
    if (wrapped?.id === dreamId) {
      return { ...old, data: updater(wrapped) };
    }

    // Plain Dream object (e.g. getDream returns Dream directly)
    const plain = old as Partial<Dream>;
    if (plain.id === dreamId) {
      return updater(old as Dream);
    }

    return old;
  });
}

function updateSavedListInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: unknown[],
  dreamId: string,
  wasAlreadySaved: boolean,
  dream: Dream,
): void {
  queryClient.setQueryData(queryKey, (old: unknown) => {
    // Seed an empty infinite-query cache structure when the user hasn't visited
    // the saved-dreams screen yet so the optimistic prepend always works.
    const emptyCache = { pages: [{ items: [] as Dream[], meta: { total: 0, page: 1, limit: 10, pages: 1 } }], pageParams: [undefined] };
    const cache = (!old || typeof old !== 'object') ? emptyCache : old as typeof emptyCache;

    const pages = (cache as { pages?: { items?: Dream[] }[] }).pages;
    if (!pages) return old;

    if (wasAlreadySaved) {
      return {
        ...cache,
        pages: pages.map((page) => ({
          ...page,
          items: (page.items ?? []).filter((d) => d.id !== dreamId),
        })),
      };
    } else {
      const updatedDream: Dream = { ...dream, isSaved: true, saveCount: dream.saveCount + 1 };
      const [first, ...rest] = pages;
      if (!first) return cache;
      return {
        ...cache,
        pages: [
          { ...first, items: [updatedDream, ...(first.items ?? [])] },
          ...rest,
        ],
      };
    }
  });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 48,
    justifyContent: 'center',
  },
  actionLiked: {
    backgroundColor: 'rgba(255,107,157,0.10)',
  },
  actionSaved: {
    backgroundColor: 'rgba(76,175,135,0.10)',
  },
  statRead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 44,
    justifyContent: 'center',
  },
  separator: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
  },
  loader: {
    width: 28,
  },
  count: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  countLiked: { color: '#FF6B9D' },
  countSaved: { color: Colors.success },
});
