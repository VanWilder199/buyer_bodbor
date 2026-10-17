/*
 * Единый класс ошибки API и разбор ответа в него (R-2).
 * Опираемся только на `status` и `errorCode` — `title`/`detail` с бэка английские,
 * их пользователю не показываем (см. PLAN_FRONTEND.md, «Общие соглашения. Ошибки»).
 */
import type { ProblemDetail } from './types';

export type ApiErrorKind = 'http' | 'network';

export class ApiError extends Error {
  /** HTTP-статус; `0` — сетевая ошибка/таймаут/нет связи. */
  status: number;
  kind: ApiErrorKind;
  /** Бизнес-код из `ProblemDetail.errorCode` (если был). */
  errorCode?: string;
  /** Строки вида `"поле: сообщение"` для валидационных 400. */
  fieldErrors?: string[];

  constructor(
    status: number,
    opts: { errorCode?: string; fieldErrors?: string[]; kind?: ApiErrorKind } = {},
  ) {
    const message = opts.errorCode ? opts.errorCode : `HTTP ${status}`;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = opts.kind ?? (status === 0 ? 'network' : 'http');
    this.errorCode = opts.errorCode;
    this.fieldErrors = opts.fieldErrors;
  }

  /** Имя поля из строки `"поле: сообщение"` (часть до `:`), если есть. */
  fieldErrorFor(field: string): string | undefined {
    if (!this.fieldErrors) return undefined;
    const entry = this.fieldErrors.find((e) => e.toLowerCase().startsWith(`${field.toLowerCase()}:`));
    return entry?.split(':').slice(1).join(':').trim();
  }
}

/**
 * Разбор ответа ошибки в `ApiError`.
 * - JSON `ProblemDetail` → берём `status`, `errorCode`, `errors`;
 * - пустое тело (401/403 от Security-фильтров через `sendError`) → `status` без `errorCode`;
 * - не-JSON (502/504 от nginx) → `status` без `errorCode`.
 */
export async function parseApiError(response: Response): Promise<ApiError> {
  const status = response.status;
  const text = await response.text();
  if (!text) return new ApiError(status);

  try {
    const body = JSON.parse(text) as Partial<ProblemDetail>;
    return new ApiError(body.status ?? status, {
      errorCode: body.errorCode,
      fieldErrors: body.errors,
    });
  } catch {
    return new ApiError(status);
  }
}

/** Сетевая ошибка / таймаут → `ApiError` со `status 0`. */
export function networkError(cause?: unknown): ApiError {
  const error = new ApiError(0);
  if (cause instanceof Error) error.cause = cause;
  return error;
}