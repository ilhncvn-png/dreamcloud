import axios from 'axios';
import { getStoredItem, setStoredItem, removeStoredItem } from '@/utils/storage';

const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: Number(process.env['EXPO_PUBLIC_API_TIMEOUT_MS'] ?? 10000),
  headers: { 'Content-Type': 'application/json' },
});

interface RetryConfig {
  _retry?: boolean;
  headers: Record<string, string>;
}

apiClient.interceptors.request.use(async (config) => {
  const token = await getStoredItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: { config: RetryConfig; response?: { status: number } }) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await getStoredItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post<{ data: { accessToken: string; refreshToken: string } }>(
          `${BASE_URL}/auth/refresh`,
          { refreshToken },
        );
        const { accessToken, refreshToken: newRefresh } = res.data.data;

        await setStoredItem('access_token', accessToken);
        await setStoredItem('refresh_token', newRefresh);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return await apiClient(originalRequest);
      } catch {
        await removeStoredItem('access_token');
        await removeStoredItem('refresh_token');
      }
    }

    return Promise.reject(error instanceof Error ? error : new Error('Request failed'));
  },
);
