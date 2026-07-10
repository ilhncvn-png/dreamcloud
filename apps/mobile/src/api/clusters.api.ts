import { apiClient } from './client';
import type { ClusterDetail, ClusterMembership, DreamCluster } from '@/types/cluster.types';

function extract<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export async function getAllClusters(): Promise<DreamCluster[]> {
  return extract(await apiClient.get<{ data: DreamCluster[] }>('/clusters'));
}

export async function getMyClusters(): Promise<ClusterMembership[]> {
  return extract(await apiClient.get<{ data: ClusterMembership[] }>('/clusters/me'));
}

export async function getClusterDetail(id: string): Promise<ClusterDetail> {
  return extract(await apiClient.get<{ data: ClusterDetail }>(`/clusters/${id}`));
}
