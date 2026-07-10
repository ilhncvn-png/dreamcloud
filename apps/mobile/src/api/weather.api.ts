import { apiClient } from './client';
import type { DreamWeather, TraceDetail } from '@/types/weather.types';

function extract<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export async function getWeatherNow(): Promise<DreamWeather> {
  return extract(await apiClient.get<{ data: DreamWeather }>('/weather/now'));
}

export async function getTraceDetail(type: string, name: string): Promise<TraceDetail> {
  return extract(await apiClient.get<{ data: TraceDetail }>(`/weather/trace/${type}/${name}`));
}
