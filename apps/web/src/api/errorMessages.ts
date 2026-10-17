/*
 * Таблица `errorCode → текст на русском` для покупателя (WEB-2).
 * `title`/`detail` с бэкенда английские — показываем только свой текст.
 * Фолбэки — по HTTP-статусу.
 */
import { ApiError } from '@podbor/api';
import { useCallback } from 'react';

const BY_ERROR_CODE: Record<string, string> = {
  // auth (WEB-3)
  OTP_INVALID: 'Неверный код. Проверьте и попробуйте ещё раз',
  OTP_EXPIRED: 'Код истёк или исчерпаны попытки. Запросите новый',
  OTP_RATE_LIMIT_EXCEEDED: 'Слишком много попыток. Попробуйте через час',
  OTP_SEND_FAILED: 'Не удалось отправить код. Попробуйте ещё раз',
  INVALID_REFRESH_TOKEN: 'Сессия истекла, войдите заново',

  // машина и отчёты (WEB-5, WEB-8, WEB-9)
  CAR_NOT_FOUND: 'Машина не найдена',
  CAR_LISTING_NOT_FOUND: 'Не удалось найти объявление на av.by',
  PARSER_ERROR: 'Не удалось разобрать ссылку av.by',

  // покупка (WEB-6, WEB-7, WEB-10)
  REPORT_NOT_PUBLISHED: 'Этот отчёт больше недоступен для покупки',
  PURCHASE_ALREADY_EXISTS: 'Вы уже приобрели этот отчёт',
  BEPAID_REQUEST_FAILED: 'Платёжная система недоступна. Попробуйте позже',
  PURCHASE_NOT_FOUND: 'Покупка не найдена',
  PURCHASE_NOT_PAID: 'Отчёт ещё не оплачен',
  REPORT_REMOVED: 'Отчёт удалён модератором',

  // отчёт (WEB-4)
  ACCESS_TOKEN_INVALID: 'Ссылка недействительна или истекла (ссылки живут 30 дней)',
  REPORT_NOT_FOUND: 'Отчёт не найден или удалён',

  // общее
  BAD_REQUEST: 'Некорректный запрос. Проверьте данные',
  NOT_FOUND: 'Данные не найдены',
  INTERNAL_SERVER_ERROR: 'Что-то пошло не так. Попробуйте позже',
};

const BY_STATUS: Record<number, string> = {
  400: 'Некорректный запрос. Проверьте данные',
  401: 'Нужно войти',
  403: 'Доступ запрещён',
  404: 'Данные не найдены',
  429: 'Слишком много запросов. Попробуйте позже',
  500: 'Что-то пошло не так. Попробуйте позже',
  502: 'Сервер временно недоступен. Попробуйте позже',
  503: 'Сервер временно недоступен. Попробуйте позже',
  504: 'Сервер не отвечает. Попробуйте позже',
};

const NETWORK = 'Нет связи с сервером. Проверьте подключение';

/** Понятный текст ошибки для пользователя. */
export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Что-то пошло не так';
  if (error.kind === 'network' || error.status === 0) return NETWORK;
  if (error.errorCode && BY_ERROR_CODE[error.errorCode]) return BY_ERROR_CODE[error.errorCode]!;
  return BY_STATUS[error.status] ?? 'Что-то пошло не так';
}

/** Хук-обёртка над `apiErrorMessage` (стабильный вызов). */
export function useApiErrorMessage(): (error: unknown) => string {
  return useCallback((error: unknown) => apiErrorMessage(error), []);
}