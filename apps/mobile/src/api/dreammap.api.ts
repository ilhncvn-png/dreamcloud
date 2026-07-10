import { apiClient } from './client';
import type {
  MapCity,
  MapCityDetail,
  MapConstellation,
  MapWorld,
} from '@/types/dreammap.types';

function extract<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export async function getMapWorld(): Promise<MapWorld> {
  return extract(await apiClient.get<{ data: MapWorld }>('/dream-map/world'));
}

export async function getMapCities(): Promise<MapCity[]> {
  return extract(await apiClient.get<{ data: MapCity[] }>('/dream-map/cities'));
}

export async function getMapHotspots(): Promise<MapCity[]> {
  return extract(await apiClient.get<{ data: MapCity[] }>('/dream-map/hotspots'));
}

export async function getMapConstellations(): Promise<MapConstellation[]> {
  return extract(await apiClient.get<{ data: MapConstellation[] }>('/dream-map/constellations'));
}

export async function getMapCity(slug: string): Promise<MapCityDetail> {
  return extract(await apiClient.get<{ data: MapCityDetail }>(`/dream-map/city/${slug}`));
}
