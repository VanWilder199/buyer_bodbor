/*
 * Вход по OTP (WEB-3). Шаг 1: одно поле — телефон РБ или email.
 * Канал определяется по виду ввода; в `send` уходит ровно одно поле.
 */
import type { AuthResponse, Channel } from '@podbor/api';
import { api } from '../api/client';
import { setTokens } from './session';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface LoginTarget {
  kind: 'sms' | 'email';
  destination: string;
}

/** «+375291234567» ← «+375 29 123-45-67», «80 29…», «29…». Иначе null. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-()]/g, '');
  if (/^\+375\d{9}$/.test(digits)) return digits;
  if (/^375\d{9}$/.test(digits)) return `+${digits}`;
  if (/^80\d{9}$/.test(digits)) return `+375${digits.slice(2)}`;
  if (/^[1-9]\d{8}$/.test(digits)) return `+375${digits}`;
  return null;
}

/** Распознать ввод как телефон (SMS) или email. null — не распознано. */
export function parseLoginInput(raw: string): LoginTarget | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Похоже на телефон: цифры/+/пробелы/скобки, без «@», длина правдоподобная.
  const hasAt = trimmed.includes('@');
  const looksLikePhone = !hasAt && /^\+?[\d\s\-()]+$/.test(trimmed);
  if (looksLikePhone) {
    const phone = normalizePhone(trimmed);
    if (phone) return { kind: 'sms', destination: phone };
  }
  if (hasAt && EMAIL_RE.test(trimmed)) {
    return { kind: 'email', destination: trimmed.toLowerCase() };
  }
  return null;
}

export async function sendOtp(target: LoginTarget): Promise<void> {
  const body = target.kind === 'sms' ? { phoneNumber: target.destination } : { email: target.destination };
  await api.post<void>('/auth/otp/send', body);
}

export async function verifyOtp(destination: string, channel: Channel, otp: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/otp/verify', { destination, channel, otp });
  setTokens(response);
  return response;
}