import { apiClient } from './client';
import type {
  DreamIntelligenceAnalysis,
  SimilarDream,
  UserResonanceData,
  CollectiveMood,
  IntelConnection,
  IntelligenceNotification,
  UserDreamTimeline,
  DreamGraph,
  UserAIInsights,
  PlatformEvent,
  SmartNotification,
} from '@/types/intelligence.types';

function extract<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export async function getDreamIntelligenceAnalysis(
  dreamId: string,
): Promise<DreamIntelligenceAnalysis> {
  return extract(
    await apiClient.get<{ data: DreamIntelligenceAnalysis }>(
      `/intelligence/dreams/${dreamId}/analysis`,
    ),
  );
}

export async function getIntelligenceSimilarDreams(
  dreamId: string,
  limit = 8,
): Promise<SimilarDream[]> {
  return extract(
    await apiClient.get<{ data: SimilarDream[] }>(
      `/intelligence/dreams/${dreamId}/similar`,
      { params: { limit } },
    ),
  );
}

export async function getMyResonance(): Promise<UserResonanceData> {
  return extract(
    await apiClient.get<{ data: UserResonanceData }>('/intelligence/users/me/resonance'),
  );
}

export async function getCollectiveMood(): Promise<CollectiveMood> {
  return extract(
    await apiClient.get<{ data: CollectiveMood }>('/intelligence/collective/mood'),
  );
}

export async function getMyIntelligenceConnections(limit = 20): Promise<IntelConnection[]> {
  return extract(
    await apiClient.get<{ data: IntelConnection[] }>(
      '/intelligence/users/me/connections',
      { params: { limit } },
    ),
  );
}

export async function getIntelligenceNotifications(limit = 30): Promise<IntelligenceNotification[]> {
  return extract(
    await apiClient.get<{ data: IntelligenceNotification[] }>(
      '/intelligence/users/me/notifications',
      { params: { limit } },
    ),
  );
}

export async function getMyDreamTimeline(): Promise<UserDreamTimeline> {
  return extract(
    await apiClient.get<{ data: UserDreamTimeline }>('/intelligence/users/me/timeline'),
  );
}

export async function getDreamGraph(dreamId: string): Promise<DreamGraph> {
  return extract(
    await apiClient.get<{ data: DreamGraph }>(`/intelligence/dreams/${dreamId}/graph`),
  );
}

export async function getMyAIInsights(): Promise<UserAIInsights> {
  return extract(
    await apiClient.get<{ data: UserAIInsights }>('/intelligence/users/me/insights'),
  );
}

export async function getRecentPlatformEvents(limit = 20): Promise<PlatformEvent[]> {
  return extract(
    await apiClient.get<{ data: PlatformEvent[] }>(
      '/intelligence/events/recent',
      { params: { limit } },
    ),
  );
}

export async function getSmartNotifications(): Promise<SmartNotification[]> {
  return extract(
    await apiClient.get<{ data: SmartNotification[] }>('/intelligence/users/me/smart-notifications'),
  );
}
