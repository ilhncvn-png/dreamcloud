import * as FileSystem from 'expo-file-system/legacy';
import { apiClient } from './client';
import type { MyProfile, ToggleFollowResult, UpdateProfileDto, UserProfile } from '@/types/user.types';
import type { DreamsPage } from '@/types/dream.types';

function extract<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export async function getMyProfile(): Promise<MyProfile> {
  return extract(await apiClient.get<{ data: MyProfile }>('/users/me'));
}

export async function updateMyProfile(dto: UpdateProfileDto): Promise<MyProfile> {
  return extract(await apiClient.patch<{ data: MyProfile }>('/users/me', dto));
}

export async function uploadAvatar(uri: string, mimeType: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  const res = await apiClient.post<{ data: { avatarUrl: string } }>('/users/me/avatar', {
    base64,
    mimeType,
  });
  return res.data.data.avatarUrl;
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  return extract(await apiClient.get<{ data: UserProfile }>(`/users/${userId}/profile`));
}

export async function toggleFollow(userId: string): Promise<ToggleFollowResult> {
  return extract(await apiClient.post<{ data: ToggleFollowResult }>(`/users/${userId}/follow`));
}

export async function getUserDreams(userId: string, page?: number): Promise<DreamsPage> {
  const params: Record<string, string | number> = { userId, limit: 10, page: page ?? 1 };
  return extract(await apiClient.get<{ data: DreamsPage }>('/dreams', { params }));
}
