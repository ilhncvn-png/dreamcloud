import axios from 'axios';

declare const __VITE_API_URL__: string | undefined;
const BASE_URL =
  (typeof __VITE_API_URL__ !== 'undefined' ? __VITE_API_URL__ : undefined) ??
  'https://api.dreamclaude.org/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token from localStorage
apiClient.interceptors.request.use((config) => {
  const raw = localStorage.getItem('dc_web_auth');
  if (raw) {
    try {
      const auth = JSON.parse(raw) as { accessToken?: string };
      if (auth.accessToken) {
        config.headers.Authorization = `Bearer ${auth.accessToken}`;
      }
    } catch {
      /* ignore malformed */
    }
  }
  return config;
});

// Silent token refresh on 401
apiClient.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const status = error.response?.status;
    const cfg = error.config as typeof error.config & { _retry?: boolean };

    if (status === 401 && !cfg._retry) {
      cfg._retry = true;
      try {
        const raw = localStorage.getItem('dc_web_auth');
        if (!raw) throw new Error('no auth');
        const auth = JSON.parse(raw) as { refreshToken?: string };
        if (!auth.refreshToken) throw new Error('no refresh token');

        const res = await axios.post<{ data: { accessToken: string; refreshToken: string } }>(
          `${BASE_URL}/auth/refresh`,
          { refreshToken: auth.refreshToken },
        );
        const { accessToken, refreshToken } = res.data.data;
        localStorage.setItem('dc_web_auth', JSON.stringify({ ...auth, accessToken, refreshToken }));
        cfg.headers = cfg.headers ?? {};
        cfg.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(cfg);
      } catch {
        localStorage.removeItem('dc_web_auth');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export function extract<T>(res: { data: { data: T } }): T {
  return res.data.data;
}
