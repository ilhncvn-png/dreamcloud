import { api } from './client';
import type { WaitlistEntry, WaitlistPage } from '../types/waitlist.types';

export async function fetchWaitlist(
  page: number,
  limit: number,
  search?: string,
): Promise<WaitlistPage> {
  const params: Record<string, string | number> = { page, limit };
  if (search) params.search = search;
  const { data } = await api.get<{ data: WaitlistPage }>('/admin/waitlist', { params });
  return data.data;
}

export async function markWaitlistContacted(
  id: string,
  isContacted: boolean,
  notes?: string,
): Promise<void> {
  await api.patch(`/admin/waitlist/${id}/contacted`, { isContacted, notes });
}

export async function deleteWaitlistEntry(id: string): Promise<void> {
  await api.delete(`/admin/waitlist/${id}`);
}

export function waitlistCsvUrl(): string {
  const base = (api.defaults.baseURL ?? '/api/v1').replace(/\/$/, '');
  return `${base}/admin/waitlist/export.csv`;
}

export type { WaitlistEntry, WaitlistPage };
