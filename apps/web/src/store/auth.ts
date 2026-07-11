import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';
import type { AuthUser, AuthTokens, LoginDto, RegisterDto } from '@/types';
import { apiClient, extract } from '@/lib/api';

const STORAGE_KEY = 'dc_web_auth';

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

function loadStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

function saveStored(data: StoredAuth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function clearStored() {
  localStorage.removeItem(STORAGE_KEY);
}

function isExpired(user: AuthUser): boolean {
  return user.exp !== undefined && user.exp * 1000 < Date.now();
}

interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  hydrate: () => void;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  hydrate() {
    const stored = loadStored();
    if (stored && !isExpired(stored.user)) {
      set({
        user: stored.user,
        accessToken: stored.accessToken,
        refreshToken: stored.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      clearStored();
      set({ isLoading: false });
    }
  },

  async login(dto) {
    const tokens = extract(await apiClient.post<{ data: AuthTokens }>('/auth/login', dto));
    const user = jwtDecode<AuthUser>(tokens.accessToken);
    saveStored({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user });
    set({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
    });
  },

  async register(dto) {
    const tokens = extract(await apiClient.post<{ data: AuthTokens }>('/auth/register', dto));
    const user = jwtDecode<AuthUser>(tokens.accessToken);
    saveStored({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user });
    set({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
    });
  },

  async logout() {
    const { refreshToken } = get();
    try {
      if (refreshToken) await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      /* ignore */
    }
    clearStored();
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },
}));
