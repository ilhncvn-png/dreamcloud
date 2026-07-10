import { apiClient } from './client';
import type { DreamSignals } from '@/types/signal.types';

function extract<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export async function getSignalsToday(): Promise<DreamSignals> {
  return extract(await apiClient.get<{ data: DreamSignals }>('/signals/today'));
}

export async function getSignalsWeek(): Promise<DreamSignals> {
  return extract(await apiClient.get<{ data: DreamSignals }>('/signals/week'));
}

export async function getSignalsMonth(): Promise<DreamSignals> {
  return extract(await apiClient.get<{ data: DreamSignals }>('/signals/month'));
}
