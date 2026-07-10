import type { StoredAdmin } from '../types/admin.types';

const KEY = 'dc_admin_auth';

export function getStoredAuth(): StoredAdmin | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredAdmin) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(auth: StoredAdmin): void {
  localStorage.setItem(KEY, JSON.stringify(auth));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(KEY);
}

export function isAdminRole(role: string): boolean {
  return role === 'admin' || role === 'super_admin';
}

/** Decode JWT payload without verifying signature (server still verifies). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload['exp'] !== 'number') return true;
  return Date.now() >= (payload['exp'] as number) * 1000;
}
