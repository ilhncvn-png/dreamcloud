import { apiClient } from './client';
import type { AtlasPlace, AtlasSymbol, AtlasTrending, AtlasWorld } from '@/types/atlas.types';

function extract<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export async function getAtlasWorld(): Promise<AtlasWorld> {
  return extract(await apiClient.get<{ data: AtlasWorld }>('/atlas/world'));
}

export async function getAtlasPeaceful(): Promise<AtlasPlace[]> {
  return extract(await apiClient.get<{ data: AtlasPlace[] }>('/atlas/peaceful'));
}

export async function getAtlasNightmares(): Promise<AtlasPlace[]> {
  return extract(await apiClient.get<{ data: AtlasPlace[] }>('/atlas/nightmares'));
}

export async function getAtlasLucid(): Promise<AtlasPlace[]> {
  return extract(await apiClient.get<{ data: AtlasPlace[] }>('/atlas/lucid'));
}

export async function getAtlasSymbols(): Promise<AtlasSymbol[]> {
  return extract(await apiClient.get<{ data: AtlasSymbol[] }>('/atlas/symbols'));
}

export async function getAtlasTrending(): Promise<AtlasTrending[]> {
  return extract(await apiClient.get<{ data: AtlasTrending[] }>('/atlas/trending'));
}
