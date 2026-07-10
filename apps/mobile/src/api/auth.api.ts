import { apiClient } from './client';
import type { AuthTokens, LoginDto, RegisterDto } from '@/types/auth.types';

function extractData<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export async function loginApi(dto: LoginDto): Promise<AuthTokens> {
  const res = await apiClient.post<{ data: AuthTokens }>('/auth/login', dto);
  return extractData(res);
}

export async function registerApi(dto: RegisterDto): Promise<AuthTokens> {
  const res = await apiClient.post<{ data: AuthTokens }>('/auth/register', dto);
  return extractData(res);
}

export async function refreshApi(refreshToken: string): Promise<AuthTokens> {
  const res = await apiClient.post<{ data: AuthTokens }>('/auth/refresh', { refreshToken });
  return extractData(res);
}

export async function logoutApi(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken });
}

export async function forgotPasswordApi(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email });
}

export async function resetPasswordApi(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  await apiClient.post('/auth/reset-password', { email, code, newPassword });
}
