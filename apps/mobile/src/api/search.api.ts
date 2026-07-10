import type { SearchResults } from '@/types/search.types';
import { apiClient } from './client';

function extract<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export async function search(q: string, type?: 'dreams' | 'users' | 'tags' | 'all'): Promise<SearchResults> {
  const params: Record<string, string> = { q };
  if (type) params.type = type;
  return extract(
    await apiClient.get<{ data: SearchResults }>('/search', { params }),
  );
}
