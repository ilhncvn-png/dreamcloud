import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';
import { loginApi, logoutApi, registerApi } from '@/api/auth.api';
import { getStoredItem, setStoredItem, removeStoredItem } from '@/utils/storage';
import type { AuthUser, LoginDto, RegisterDto } from '@/types/auth.types';

interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

function decodeUser(token: string): AuthUser {
  return jwtDecode<AuthUser>(token);
}

async function persistTokens(accessToken: string, refreshToken: string): Promise<void> {
  await setStoredItem('access_token', accessToken);
  await setStoredItem('refresh_token', refreshToken);
}

async function clearTokens(): Promise<void> {
  await removeStoredItem('access_token');
  await removeStoredItem('refresh_token');
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (dto) => {
    const tokens = await loginApi(dto);
    await persistTokens(tokens.accessToken, tokens.refreshToken);
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: decodeUser(tokens.accessToken),
      isAuthenticated: true,
    });
  },

  register: async (dto) => {
    const tokens = await registerApi(dto);
    await persistTokens(tokens.accessToken, tokens.refreshToken);
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: decodeUser(tokens.accessToken),
      isAuthenticated: true,
    });
  },

  logout: async () => {
    const { refreshToken } = get();
    if (refreshToken) {
      try {
        await logoutApi(refreshToken);
      } catch {
        // silently ignore — we clear local state regardless
      }
    }
    await clearTokens();
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  hydrate: async () => {
    try {
      const accessToken = await getStoredItem('access_token');
      const refreshToken = await getStoredItem('refresh_token');

      if (accessToken && refreshToken) {
        const user = decodeUser(accessToken);
        const isExpired = user.exp !== undefined && user.exp * 1000 < Date.now();

        if (!isExpired) {
          set({ accessToken, refreshToken, user, isAuthenticated: true });
        } else {
          await clearTokens();
        }
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));
