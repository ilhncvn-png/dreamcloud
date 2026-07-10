import { apiClient } from './client';
import type { DreamMatch, MatchDetail, MatchesPage, ConnectionSummary } from '@/types/match.types';

function extract<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export async function getMyMatches(params?: { limit?: number; offset?: number }): Promise<MatchesPage> {
  return extract(await apiClient.get<{ data: MatchesPage }>('/matches/my-matches', { params }));
}

export async function getMyConnections(): Promise<ConnectionSummary[]> {
  return extract(await apiClient.get<{ data: ConnectionSummary[] }>('/matches/my-connections'));
}

export async function getMatchById(matchId: string): Promise<MatchDetail> {
  return extract(await apiClient.get<{ data: MatchDetail }>(`/matches/${matchId}`));
}

export async function getDreamMatches(
  dreamId: string,
  params?: { limit?: number; offset?: number },
): Promise<MatchesPage> {
  return extract(await apiClient.get<{ data: MatchesPage }>(`/matches/dream/${dreamId}`, { params }));
}
