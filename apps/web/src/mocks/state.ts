/*
 * Состояние моков и управление ими (WEB-2). В браузерном dev-режиме доступно из консоли
 * как `__mocks.reset()` и `__mocks.control.failOnce(...)`.
 */
import type { CarDto, PurchaseDtoEnriched, ReportPreviewDto } from '@podbor/api';
import type { ReportViewData } from '@podbor/ui';
import { mockCar, mockPurchase, mockReportPreview, mockReportView } from './fixtures';

function b64url(input: string): string {
  return btoa(unescape(encodeURIComponent(input))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Поддельный JWT: правдоподобный заголовок/тело, подпись-заглушка (проверки нет). */
export function makeJwt(payload: Record<string, unknown>): string {
  const header = b64url(JSON.stringify({ alg: 'HS384', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  return `${header}.${body}.mock-signature`;
}

export interface PendingOtp {
  destination: string;
  channel: 'SMS' | 'EMAIL';
}

export interface MockState {
  cars: CarDto[];
  reports: Record<string, ReportPreviewDto[]>;
  purchases: PurchaseDtoEnriched[];
  reportViews: Record<string, ReportViewData>;
  /** Код, который принимает `POST /auth/otp/verify`. */
  otpCode: string;
  pendingOtp: PendingOtp | null;
  /** TTL access-токена в мс (для проверки авто-refresh). */
  accessExpiresInMs: number;
  sendOtpCount: number;
  /** Сколько раз `GET /purchases` отвечает `pending` перед `paid` (проверка polling). */
  pendingPollingRounds: number;
}

let state: MockState = createInitial();

function createInitial(): MockState {
  return {
    cars: [mockCar],
    reports: { [mockCar.id]: [mockReportPreview] },
    purchases: [mockPurchase],
    reportViews: { 'r-1': mockReportView },
    otpCode: '042817',
    pendingOtp: null,
    accessExpiresInMs: 15 * 60 * 1000,
    sendOtpCount: 0,
    pendingPollingRounds: 0,
  };
}

export function getMockState(): MockState {
  return state;
}

export function resetMockState(): void {
  state = createInitial();
}

/** Разовый форсированный ответ: `{ method, path, status, errorCode? }`. */
type FailOnceSpec = { method: string; path: string; status: number; errorCode?: string };
let failOnceSpec: FailOnceSpec | null = null;

export function setFailOnce(spec: FailOnceSpec): void {
  failOnceSpec = spec;
}

export function takeFailOnce(method: string, path: string): FailOnceSpec | null {
  const match = failOnceSpec && failOnceSpec.method === method && pathMatches(failOnceSpec.path, path);
  if (match) {
    const spec = failOnceSpec;
    failOnceSpec = null;
    return spec;
  }
  return null;
}

function pathMatches(pattern: string, path: string): boolean {
  if (!pattern.includes(':')) return pattern === path;
  const p = pattern.split('/');
  const a = path.split('/');
  if (p.length !== a.length) return false;
  return p.every((seg, i) => seg.startsWith(':') || seg === a[i]);
}

export function makeAccessToken(email?: string | null): string {
  const now = Math.floor(Date.now() / 1000);
  return makeJwt({
    sub: 'buyer-1',
    role: 'BUYER',
    email: email ?? undefined,
    exp: now + Math.floor(state.accessExpiresInMs / 1000),
  });
}