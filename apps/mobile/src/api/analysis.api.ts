import { apiClient } from './client';
import type { DreamAnalysisResponse } from '@/types/analysis.types';

function extract<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export async function getDreamAnalysis(dreamId: string): Promise<DreamAnalysisResponse> {
  return extract(
    await apiClient.get<{ data: DreamAnalysisResponse }>(`/dreams/${dreamId}/analysis`)
  );
}
