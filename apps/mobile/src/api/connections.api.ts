import { apiClient } from './client';
import type { DreamConnectionDetail, DreamConnectionsResult } from '@/types/connection.types';

function extract<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export async function getMyConnections(): Promise<DreamConnectionsResult> {
  return extract(await apiClient.get<{ data: DreamConnectionsResult }>('/connections/me'));
}

export async function getConnectionDetail(id: string): Promise<DreamConnectionDetail> {
  return extract(await apiClient.get<{ data: DreamConnectionDetail }>(`/connections/${id}`));
}
