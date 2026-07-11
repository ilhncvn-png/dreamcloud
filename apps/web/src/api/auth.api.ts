import { apiClient, extract } from '@/lib/api';

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email });
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  await apiClient.post('/auth/reset-password', { email, code, newPassword });
}

export async function getMe(): Promise<{
  id: string;
  email: string;
  username: string;
  role: string;
}> {
  return extract(await apiClient.get('/auth/me'));
}
