import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { getAccessToken, hasStoredRefresh, setTokens } from '../auth/session';
import { makeJwt } from '../mocks/state';
import { server } from '../mocks/server';
import { api } from './client';

const past = Math.floor(Date.now() / 1000) - 60;
const future = Math.floor(Date.now() / 1000) + 900;

function expiredSession(): void {
  setTokens({
    accessToken: makeJwt({ sub: 'buyer-1', role: 'BUYER', exp: past }),
    refreshToken: 'refresh-abc',
    expiresIn: past,
  });
}

describe('single-flight refresh (WEB-3)', () => {
  it('5 parallel requests with expired access → exactly one POST /auth/refresh', async () => {
    expiredSession();
    let refreshCount = 0;
    server.use(
      http.post('/api/auth/refresh', () => {
        refreshCount += 1;
        return HttpResponse.json({
          accessToken: makeJwt({ sub: 'buyer-1', role: 'BUYER', exp: future }),
          refreshToken: 'refresh-2',
          expiresIn: future,
        });
      }),
    );

    const results = await Promise.all([
      api.get('/purchases'),
      api.get('/purchases'),
      api.get('/purchases'),
      api.get('/purchases'),
      api.get('/purchases'),
    ]);

    expect(refreshCount).toBe(1);
    expect(results).toHaveLength(5);
    expect(getAccessToken()).not.toBeNull();
  });

  it('INVALID_REFRESH_TOKEN → session cleared', async () => {
    expiredSession();
    server.use(
      http.post('/api/auth/refresh', () =>
        HttpResponse.json({ status: 401, errorCode: 'INVALID_REFRESH_TOKEN' }, { status: 401 }),
      ),
    );

    await expect(api.get('/purchases')).rejects.toThrow();
    expect(hasStoredRefresh()).toBe(false);
  });

  it('401 without errorCode on a real request → refresh once, then succeed', async () => {
    // access в памяти свежий, но сервер отклонит первый запрос «фильтром» (пустое тело 401)
    setTokens({
      accessToken: makeJwt({ sub: 'buyer-1', role: 'BUYER', exp: future }),
      refreshToken: 'refresh-abc',
      expiresIn: future,
    });
    let refreshCount = 0;
    let firstPurchase = true;
    server.use(
      http.post('/api/auth/refresh', () => {
        refreshCount += 1;
        return HttpResponse.json({
          accessToken: makeJwt({ sub: 'buyer-1', role: 'BUYER', exp: future }),
          refreshToken: 'refresh-2',
          expiresIn: future,
        });
      }),
      http.get('/api/purchases', ({ request }) => {
        if (firstPurchase && !request.headers.get('authorization')?.includes('refresh-2')) {
          firstPurchase = false;
          return new HttpResponse(null, { status: 401 }); // как Security-фильтр
        }
        return HttpResponse.json([]);
      }),
    );

    const result = await api.get('/purchases');
    expect(refreshCount).toBe(1);
    expect(result).toEqual([]);
  });
});