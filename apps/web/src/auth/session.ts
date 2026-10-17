/*
 * Сессия покупателя (WEB-3):
 * - access-токен живёт только в памяти;
 * - refresh-токен — в `localStorage['podbor.refresh']` (бэкенд не ставит cookie);
 * - `exp` и `email` читаем из access-JWT (без проверки подписи, только decode);
 * - событие `storage` в другой вкладке сбрасывает access в памяти.
 */
import type { AuthResponse } from '@podbor/api';

const REFRESH_KEY = 'podbor.refresh';

let accessToken: string | null = null;
let accessExpiresAt = 0; // epoch ms
let refreshToken: string | null = null;

if (typeof localStorage !== 'undefined') {
  refreshToken = localStorage.getItem(REFRESH_KEY);
}

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

/** Безопасный base64url-декод JWT-payload. */
function decodePayload(token: string): Record<string, unknown> | null {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = atob(base64);
    const json = Array.from(bytes, (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
    return JSON.parse(decodeURIComponent(json)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function setTokens(auth: AuthResponse): void {
  accessToken = auth.accessToken;
  const payload = decodePayload(auth.accessToken);
  accessExpiresAt = typeof payload?.exp === 'number' ? payload.exp * 1000 : 0;
  refreshToken = auth.refreshToken;
  localStorage.setItem(REFRESH_KEY, auth.refreshToken);
  emit();
}

export function clearSession(): void {
  accessToken = null;
  accessExpiresAt = 0;
  refreshToken = null;
  localStorage.removeItem(REFRESH_KEY);
  emit();
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

/** epoch ms истечения access-токена; 0, если неизвестно. */
export function getAccessExpiresAt(): number {
  return accessExpiresAt;
}

/** Нужен ли превентивный refresh (нет токена или до `exp` меньше 30 секунд). */
export function needsRefresh(): boolean {
  if (!accessToken) return true;
  return accessExpiresAt === 0 || Date.now() >= accessExpiresAt - 30_000;
}

/** email из claim JWT (может быть null для SMS-пользователя). */
export function getEmail(): string | null {
  if (!accessToken) return null;
  const email = decodePayload(accessToken)?.email;
  return typeof email === 'string' ? email : null;
}

/** Есть ли вообще попытка входа (refresh на диске) — для guard'а `requireAuth`. */
export function hasStoredRefresh(): boolean {
  return refreshToken !== null;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Для `useSyncExternalStore` — меняется при смене access. */
export function getAccessSnapshot(): string | null {
  return accessToken;
}

// Другая вкладка сменила/удалила refresh → сбрасываем access в памяти.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== REFRESH_KEY) return;
    refreshToken = localStorage.getItem(REFRESH_KEY);
    accessToken = null;
    accessExpiresAt = 0;
    emit();
  });
}