import { useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getSavedDreams } from '@/api/dreams.api';
import type { DreamsPage } from '@/types/dream.types';

export const SAVED_DREAMS_KEY = ['dreams', 'saved'] as const;

export function useSavedDreams() {
  const query = useInfiniteQuery({
    queryKey: SAVED_DREAMS_KEY,
    queryFn: ({ pageParam }) => getSavedDreams((pageParam as number | undefined) ?? 1),
    initialPageParam: 1 as number,
    getNextPageParam: (lastPage: DreamsPage | undefined) => {
      if (!lastPage?.meta) return undefined;
      const { page, pages } = lastPage.meta;
      return page < pages ? page + 1 : undefined;
    },
    // Always considered stale so the screen refetches every time it mounts.
    staleTime: 0,
  });

  const dreams = query.data?.pages.flatMap(p => p.items) ?? [];

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  return { ...query, dreams, loadMore };
}
