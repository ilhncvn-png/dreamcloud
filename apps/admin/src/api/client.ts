import axios from 'axios';
import { getStoredAuth, clearStoredAuth } from '../store/auth.store';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const auth = getStoredAuth();
  if (auth?.accessToken) {
    config.headers['Authorization'] = `Bearer ${auth.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      const onLoginPage = window.location.pathname === '/login';
      if (!onLoginPage) {
        clearStoredAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);
