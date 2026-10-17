/*
 * Тонкий fetch-клиент покупателя (WEB-2/WEB-3):
 * - baseUrl = VITE_API_URL ?? '/api';
 * - на всё, кроме `/auth/**` и `/reports/view`, добавляется `Authorization: Bearer <access>`;
 * - превентивный refresh за 30 с до истечения access;
 * - 401 без `errorCode` (признак Security-фильтра) → single-flight refresh → один повтор;
 * - `INVALID_REFRESH_TOKEN` / 400 от refresh → разлогин и редирект на `/login?next=`.
 */
import { ApiError, networkError, parseApiError } from '@podbor/api';
import type { AuthResponse } from '@podbor/api';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  needsRefresh,
  setTokens,
} from '../auth/session';

const baseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: Method;
  body?: unknown;
  /** Публичный запрос без Authorization (по умолчанию берётся из пути). */
  auth?: boolean;
}

interface UnauthorizedHandler {
  (): void;
}

let unauthorizedHandler: UnauthorizedHandler | undefined;
/** Внедряется приложением (чистит сессию и кеш, делает редирект). */
export function setUnauthorizedHandler(fn: UnauthorizedHandler | undefined): void {
  unauthorizedHandler = fn;
}

// --- refresh: single-flight в пределах вкладки ---
let inflight: Promise<boolean> | null = null;

function handleExpired(): void {
  clearSession();
  unauthorizedHandler?.();
}

async function refreshOnce(): Promise<boolean> {
  if (!inflight) {
    const rt = getRefreshToken();
    if (!rt) {
      handleExpired();
      inflight = Promise.resolve(false);
      inflight.finally(() => {
        inflight = null;
      });
      return false;
    }
    inflight = (async () => {
      try {
        const res = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt }),
        });
        if (!res.ok) throw await parseApiError(res);
        const tokens = (await res.json()) as AuthResponse;
        setTokens(tokens);
        return true;
      } catch (error) {
        if (error instanceof ApiError && (error.errorCode === 'INVALID_REFRESH_TOKEN' || error.status === 400)) {
          handleExpired();
        }
        return false;
      }
    })();
    inflight.finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

// --- разбор ответа (тело читается ровно один раз) ---
function parseText(status: number, text: string): unknown {
  if (status === 204) return undefined;
  if (status >= 200 && status < 300) {
    return text ? (JSON.parse(text) as unknown) : undefined;
  }
  if (!text) throw new ApiError(status);
  let body: { status?: number; errorCode?: string; errors?: string[] };
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    throw new ApiError(status);
  }
  throw new ApiError(body.status ?? status, { errorCode: body.errorCode, fieldErrors: body.errors });
}

function hasErrorCode(text: string): boolean {
  if (!text) return false;
  try {
    return Boolean((JSON.parse(text) as { errorCode?: unknown }).errorCode);
  } catch {
    return false;
  }
}

async function doFetch(path: string, method: Method, body: unknown, needsAuth: boolean): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (needsAuth) {
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  try {
    return await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw networkError();
  }
}

/** Выполнить запрос; при сетевой ошибке — `ApiError(status 0)`. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const needsAuth = auth && !(path.startsWith('/auth/') || path === '/reports/view');

  if (needsAuth && needsRefresh()) {
    const ok = await refreshOnce();
    if (!ok && !getAccessToken()) {
      throw new ApiError(0);
    }
  }

  let res = await doFetch(path, method, body, needsAuth);
  let text = await res.text();

  if (res.status === 401 && needsAuth && !hasErrorCode(text)) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      res = await doFetch(path, method, body, needsAuth);
      text = await res.text();
    }
  }

  return parseText(res.status, text) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
};