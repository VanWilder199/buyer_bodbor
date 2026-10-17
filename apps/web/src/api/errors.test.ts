import { ApiError, parseApiError } from '@podbor/api';
import { describe, expect, it } from 'vitest';
import { apiErrorMessage } from './errorMessages';

describe('parseApiError (WEB-2)', () => {
  it('parses ProblemDetail with errorCode', async () => {
    const res = new Response(JSON.stringify({ status: 409, errorCode: 'PURCHASE_ALREADY_EXISTS' }), { status: 409 });
    const err = await parseApiError(res);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.errorCode).toBe('PURCHASE_ALREADY_EXISTS');
    expect(err.kind).toBe('http');
  });

  it('empty body (security filter 401) → status without errorCode', async () => {
    const err = await parseApiError(new Response(null, { status: 401 }));
    expect(err.status).toBe(401);
    expect(err.errorCode).toBeUndefined();
  });

  it('validation 400 with errors → fieldErrors', async () => {
    const res = new Response(
      JSON.stringify({ status: 400, errorCode: 'BAD_REQUEST', errors: ['email: must be a well-formed email address'] }),
      { status: 400 },
    );
    const err = await parseApiError(res);
    expect(err.fieldErrors).toEqual(['email: must be a well-formed email address']);
    expect(err.fieldErrorFor('email')).toBe('must be a well-formed email address');
  });

  it('non-JSON (nginx 502) → status without errorCode', async () => {
    const err = await parseApiError(new Response('<html>Bad Gateway</html>', { status: 502 }));
    expect(err.status).toBe(502);
    expect(err.errorCode).toBeUndefined();
  });
});

describe('apiErrorMessage', () => {
  it('uses errorCode table', () => {
    expect(apiErrorMessage(new ApiError(409, { errorCode: 'PURCHASE_ALREADY_EXISTS' }))).toContain('уже приобрели');
  });
  it('network error → offline message', () => {
    expect(apiErrorMessage(new ApiError(0))).toContain('Нет связи');
  });
  it('falls back by status', () => {
    expect(apiErrorMessage(new ApiError(503))).toContain('недоступен');
  });
  it('unknown error → generic', () => {
    expect(apiErrorMessage(new Error('boom'))).toContain('Что-то пошло не так');
  });
});