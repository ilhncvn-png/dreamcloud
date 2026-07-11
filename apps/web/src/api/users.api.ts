import { apiClient, extract } from '@/lib/api';
import type { MyProfile, UserProfile, ToggleFollowResult } from '@/types';

export async function getMyProfile(): Promise<MyProfile> {
  return extract(await apiClient.get<{ data: MyProfile }>('/users/me'));
}

export async function getUserProfileByUsername(username: string): Promise<UserProfile> {
  return extract(await apiClient.get<{ data: UserProfile }>(`/users/${username}/profile`));
}

export async function toggleFollow(userId: string): Promise<ToggleFollowResult> {
  return extract(await apiClient.post<{ data: ToggleFollowResult }>(`/users/${userId}/follow`));
}
