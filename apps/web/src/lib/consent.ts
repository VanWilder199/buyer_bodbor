/*
 * Согласие на обработку (WEB-15): cookie-баннер. Метрика ставит cookie,
 * поэтому счётчик загружается только после согласия.
 */
import { useSyncExternalStore } from 'react';

export type ConsentValue = 'granted' | 'denied' | null;

const CONSENT_KEY = 'podbor.consent';

function read(): ConsentValue {
  const v = localStorage.getItem(CONSENT_KEY);
  return v === 'granted' || v === 'denied' ? v : null;
}

let consent: ConsentValue = typeof localStorage !== 'undefined' ? read() : null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

export function getConsent(): ConsentValue {
  return consent;
}

export function setConsent(value: ConsentValue): void {
  consent = value;
  if (value) localStorage.setItem(CONSENT_KEY, value);
  else localStorage.removeItem(CONSENT_KEY);
  emit();
}

export function subscribeConsent(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot(): ConsentValue {
  return consent;
}

export function useConsent(): ConsentValue {
  return useSyncExternalStore(subscribeConsent, getSnapshot);
}