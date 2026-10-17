/*
 * MSW-хендлеры покупателя (WEB-2). Повторяют контракты из PLAN_FRONTEND.md.
 * Включаются через `VITE_API_MOCKS=1`; в тестах — через `server` из `./server`.
 */
import { http, HttpResponse } from 'msw';
import type { AuthResponse, CarDto, CreateReportResponseDto, InitiatePurchaseResponse, ReportPreviewDto } from '@podbor/api';
import { getMockState, makeAccessToken, takeFailOnce } from './state';

const base = '/api';

function checkFailOnce(method: string, path: string) {
  const spec = takeFailOnce(method, path);
  if (!spec) return null;
  return HttpResponse.json<Record<string, unknown>>(
    spec.errorCode ? { status: spec.status, errorCode: spec.errorCode } : {},
    { status: spec.status },
  );
}

function authBody(email?: string | null): AuthResponse {
  return {
    accessToken: makeAccessToken(email),
    refreshToken: `refresh-${Math.random().toString(36).slice(2)}`,
    expiresIn: Math.floor(Date.now() / 1000) + 72 * 3600,
  };
}

export const handlers = [
  // --- auth ---
  http.post(`${base}/auth/otp/send`, async ({ request }) => {
    const fail = checkFailOnce('POST', '/auth/otp/send');
    if (fail) return fail;
    const s = getMockState();
    if (s.sendOtpCount >= 3) {
      return HttpResponse.json({ status: 429, errorCode: 'OTP_RATE_LIMIT_EXCEEDED' }, { status: 429 });
    }
    const body = (await request.json()) as { phoneNumber?: string; email?: string };
    const destination = body.phoneNumber ?? body.email ?? '';
    const channel = body.phoneNumber ? 'SMS' : 'EMAIL';
    s.sendOtpCount += 1;
    s.pendingOtp = { destination, channel };
    return new HttpResponse(null, { status: 202 });
  }),

  http.post(`${base}/auth/otp/verify`, async ({ request }) => {
    const s = getMockState();
    const body = (await request.json()) as { destination?: string; channel?: string; otp?: string };
    if (!body.otp || body.otp.length !== 6 || !body.channel || !body.destination) {
      return HttpResponse.json({ status: 400, errorCode: 'BAD_REQUEST' }, { status: 400 });
    }
    if (!s.pendingOtp) {
      return HttpResponse.json({ status: 400, errorCode: 'OTP_EXPIRED' }, { status: 400 });
    }
    if (body.otp !== s.otpCode) {
      return HttpResponse.json({ status: 400, errorCode: 'OTP_INVALID' }, { status: 400 });
    }
    const email = s.pendingOtp.channel === 'EMAIL' ? s.pendingOtp.destination : null;
    s.pendingOtp = null;
    return HttpResponse.json(authBody(email));
  }),

  http.post(`${base}/auth/refresh`, async ({ request }) => {
    const fail = checkFailOnce('POST', '/auth/refresh');
    if (fail) return fail;
    const body = (await request.json()) as { refreshToken?: string };
    if (!body.refreshToken || !body.refreshToken.startsWith('refresh-')) {
      return HttpResponse.json({ status: 401, errorCode: 'INVALID_REFRESH_TOKEN' }, { status: 401 });
    }
    return HttpResponse.json(authBody());
  }),

  // --- cars ---
  http.get(`${base}/cars/search`, ({ request }) => {
    const fail = checkFailOnce('GET', '/cars/search');
    if (fail) return fail;
    const url = new URL(request.url);
    const vin = (url.searchParams.get('vin') ?? '').trim().toUpperCase();
    const s = getMockState();
    const car = s.cars.find((c) => c.vin === vin);
    if (!car) return HttpResponse.json({ status: 404, errorCode: 'CAR_NOT_FOUND' }, { status: 404 });
    return HttpResponse.json(car);
  }),

  http.get(`${base}/cars/:carId`, ({ params }) => {
    const s = getMockState();
    const car = s.cars.find((c) => c.id === params.carId);
    if (!car) return HttpResponse.json({ status: 404, errorCode: 'CAR_NOT_FOUND' }, { status: 404 });
    return HttpResponse.json(car);
  }),

  http.post(`${base}/cars/resolve`, async ({ request }) => {
    const fail = checkFailOnce('POST', '/cars/resolve');
    if (fail) return fail;
    const body = (await request.json()) as { url?: string };
    if (!body.url?.includes('av.by')) {
      return HttpResponse.json({ status: 404, errorCode: 'CAR_LISTING_NOT_FOUND' }, { status: 404 });
    }
    return HttpResponse.json(getMockState().cars[0] as CarDto);
  }),

  http.post(`${base}/cars/:carId`, async ({ request, params }) => {
    const s = getMockState();
    const body = (await request.json()) as { email?: string };
    if (!body.email || !body.email.includes('@')) {
      return HttpResponse.json({ status: 400, errorCode: 'BAD_REQUEST', errors: ['email: must be a well-formed email address'] }, { status: 400 });
    }
    if (!s.cars.some((c) => c.id === params.carId)) {
      return HttpResponse.json({ status: 404, errorCode: 'CAR_NOT_FOUND' }, { status: 404 });
    }
    const response: CreateReportResponseDto = { requestId: 42, waitingCount: 7, alreadyRequested: false };
    return HttpResponse.json(response);
  }),

  // --- reports ---
  http.get(`${base}/reports`, ({ request }) => {
    const url = new URL(request.url);
    const carId = url.searchParams.get('carId');
    const s = getMockState();
    const list: ReportPreviewDto[] = carId ? (s.reports[carId] ?? []) : [];
    return HttpResponse.json(list);
  }),

  http.get(`${base}/reports/view`, ({ request }) => {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const s = getMockState();
    if (!token || !s.reportViews[token]) {
      return HttpResponse.json({ status: 404, errorCode: 'ACCESS_TOKEN_INVALID' }, { status: 404 });
    }
    return HttpResponse.json(s.reportViews[token]);
  }),

  // --- purchases ---
  http.post(`${base}/purchases`, async ({ request }) => {
    const fail = checkFailOnce('POST', '/purchases');
    if (fail) return fail;
    const body = (await request.json()) as { reportId?: string };
    if (!body.reportId) {
      return HttpResponse.json({ status: 400, errorCode: 'BAD_REQUEST' }, { status: 400 });
    }
    const response: InitiatePurchaseResponse = {
      purchaseId: 'p-2',
      redirectUrl: `${new URL(request.url).origin}/purchase/success?purchaseId=p-2`,
    };
    return HttpResponse.json(response);
  }),

  http.get(`${base}/purchases`, () => {
    const s = getMockState();
    if (s.pendingPollingRounds > 0) {
      s.pendingPollingRounds -= 1;
      return HttpResponse.json([{ ...s.purchases[0], id: 'p-2', status: 'pending', paidAt: null }]);
    }
    return HttpResponse.json(s.purchases);
  }),
];