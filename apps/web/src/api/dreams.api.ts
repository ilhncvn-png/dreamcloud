import { apiClient, extract } from '@/lib/api';
import type { Dream, DreamsPage, ToggleLikeResult, ToggleSaveResult } from '@/types';

export async function getPublicFeed(page = 1): Promise<DreamsPage> {
  return extract(
    await apiClient.get<{ data: DreamsPage }>('/dreams', { params: { page, limit: 10 } }),
  );
}

export async function getDream(id: string): Promise<Dream> {
  return extract(await apiClient.get<{ data: Dream }>(`/dreams/${id}`));
}

export async function toggleLike(id: string): Promise<ToggleLikeResult> {
  return extract(await apiClient.post<{ data: ToggleLikeResult }>(`/dreams/${id}/like`));
}

export async function toggleSave(id: string): Promise<ToggleSaveResult> {
  return extract(await apiClient.post<{ data: ToggleSaveResult }>(`/dreams/${id}/save`));
}

export async function getUserDreams(userId: string, page = 1): Promise<DreamsPage> {
  return extract(
    await apiClient.get<{ data: DreamsPage }>('/dreams', { params: { userId, page, limit: 10 } }),
  );
}
