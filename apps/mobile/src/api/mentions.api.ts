import { apiClient } from './client';
import type { DreamMention, MentionStats, MentionsPage } from '@/types/mention.types';

function extract<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export async function getMyMentions(page = 1, limit = 20): Promise<MentionsPage> {
  return extract(await apiClient.get<{ data: MentionsPage }>('/mentions/me', { params: { page, limit } }));
}

export async function getMentionsInDream(dreamId: string): Promise<DreamMention[]> {
  return extract(await apiClient.get<{ data: DreamMention[] }>(`/mentions/dream/${dreamId}`));
}

export async function getMyMentionStats(): Promise<MentionStats> {
  return extract(await apiClient.get<{ data: MentionStats }>('/mentions/stats'));
}
