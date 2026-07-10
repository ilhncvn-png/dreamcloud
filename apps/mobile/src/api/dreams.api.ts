import { apiClient } from './client';
import type {
  Dream,
  DreamsPage,
  CreateDreamDto,
  UpdateDreamDto,
  ToggleLikeResult,
  ToggleSaveResult,
} from '@/types/dream.types';

function extract<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export async function getMyDreams(page?: number): Promise<DreamsPage> {
  const params: Record<string, number> = { limit: 10, page: page ?? 1 };
  return extract(await apiClient.get<{ data: DreamsPage }>('/dreams/me', { params }));
}

export async function getPublicFeed(page?: number): Promise<DreamsPage> {
  const params: Record<string, number> = { limit: 10, page: page ?? 1 };
  return extract(await apiClient.get<{ data: DreamsPage }>('/dreams', { params }));
}

export type DreamSort = 'newest' | 'most_liked' | 'most_saved' | 'most_commented';
export type DreamCategory = 'lucid' | 'beautiful' | 'nightmare' | 'normal';

export async function getDiscoverSection(opts: {
  sort?: DreamSort;
  category?: DreamCategory;
  limit?: number;
}): Promise<DreamsPage> {
  const params: Record<string, string | number> = { limit: opts.limit ?? 10, page: 1 };
  if (opts.sort) params.sort = opts.sort;
  if (opts.category) params.category = opts.category;
  return extract(await apiClient.get<{ data: DreamsPage }>('/dreams', { params }));
}

export async function getDream(id: string): Promise<Dream> {
  return extract(await apiClient.get<{ data: Dream }>(`/dreams/${id}`));
}

export async function createDream(dto: CreateDreamDto): Promise<Dream> {
  return extract(await apiClient.post<{ data: Dream }>('/dreams', dto));
}

export async function updateDream(id: string, dto: UpdateDreamDto): Promise<Dream> {
  return extract(await apiClient.patch<{ data: Dream }>(`/dreams/${id}`, dto));
}

export async function deleteDream(id: string): Promise<void> {
  await apiClient.delete(`/dreams/${id}`);
}

export async function toggleLike(id: string): Promise<ToggleLikeResult> {
  return extract(await apiClient.post<{ data: ToggleLikeResult }>(`/dreams/${id}/like`));
}

export async function toggleSave(id: string): Promise<ToggleSaveResult> {
  return extract(await apiClient.post<{ data: ToggleSaveResult }>(`/dreams/${id}/save`));
}

export async function getSavedDreams(page?: number): Promise<DreamsPage> {
  const params: Record<string, number> = { limit: 10, page: page ?? 1 };
  const res = await apiClient.get<{ data: unknown }>('/dreams/saved', { params });

  if (__DEV__) {
    console.log('[getSavedDreams] url: /dreams/saved page=' + (page ?? 1));
    console.log('[getSavedDreams] raw:', JSON.stringify(res.data).slice(0, 400));
  }

  // TransformInterceptor wraps all responses: { data: <payload>, timestamp, path }
  const payload = (res.data as { data?: unknown }).data;

  // Safe normalize — guards against unexpected shapes without masking real network errors
  const items: Dream[] =
    Array.isArray((payload as DreamsPage | undefined)?.items)
      ? (payload as DreamsPage).items
      : Array.isArray(payload)
        ? (payload as Dream[])
        : [];

  const meta: DreamsPage['meta'] = (payload as DreamsPage | undefined)?.meta ?? {
    total: items.length,
    page: page ?? 1,
    limit: 10,
    pages: items.length > 0 ? 1 : 0,
  };

  if (__DEV__) {
    console.log(`[getSavedDreams] parsed: ${items.length} items, page ${meta.page}/${meta.pages}`);
  }

  return { items, meta };
}
