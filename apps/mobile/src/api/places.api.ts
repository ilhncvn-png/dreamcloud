import { apiClient } from './client';
import type { CuratedPlaces, PlaceIntelligence, TrendingAll, TrendingPlace } from '@/types/place.types';

function extract<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export async function getTrendingAll(): Promise<TrendingAll> {
  return extract(await apiClient.get<{ data: TrendingAll }>('/places/trending'));
}

export async function getTrendingByPeriod(period: 'today' | 'week' | 'month'): Promise<TrendingPlace[]> {
  return extract(await apiClient.get<{ data: TrendingPlace[] }>(`/places/trending?period=${period}`));
}

export async function getCuratedPlaces(): Promise<CuratedPlaces> {
  return extract(await apiClient.get<{ data: CuratedPlaces }>('/places/curated'));
}

export async function getPlaceIntelligence(name: string): Promise<PlaceIntelligence | null> {
  return extract(await apiClient.get<{ data: PlaceIntelligence | null }>(`/places/${encodeURIComponent(name)}`));
}
