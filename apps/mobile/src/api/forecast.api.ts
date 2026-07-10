import { apiClient } from './client';
import type { CityForecastDetail, DreamForecast, ForecastPeriod } from '@/types/forecast.types';

function extract<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export async function getForecast(period: ForecastPeriod): Promise<DreamForecast> {
  return extract(await apiClient.get<{ data: DreamForecast }>(`/forecast/${period}`));
}

export async function getCityForecast(slug: string): Promise<CityForecastDetail> {
  return extract(await apiClient.get<{ data: CityForecastDetail }>(`/forecast/city/${slug}`));
}
