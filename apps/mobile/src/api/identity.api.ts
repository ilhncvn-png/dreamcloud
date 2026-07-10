import { apiClient } from './client';
import type { DreamIdentity } from '@/types/identity.types';

function extract<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export async function getMyIdentity(): Promise<DreamIdentity> {
  return extract(await apiClient.get<{ data: DreamIdentity }>('/identity/me'));
}

export async function recomputeIdentity(): Promise<DreamIdentity> {
  return extract(await apiClient.post<{ data: DreamIdentity }>('/identity/compute'));
}
