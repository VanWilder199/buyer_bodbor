import { useSyncExternalStore } from 'react';
import { getEmail, getAccessSnapshot, hasStoredRefresh, subscribe } from './session';

export interface SessionState {
  /** true, если есть access-токен в памяти (или refresh на диске — guard'ы см. ниже). */
  loggedIn: boolean;
  /** email из JWT (null для SMS-пользователя или гостя). */
  email: string | null;
}

const EMPTY: SessionState = { loggedIn: false, email: null };

/** Подписка на сессию. `loggedIn` = есть ли access в памяти ИЛИ refresh на диске. */
export function useSession(): SessionState {
  const snapshot = useSyncExternalStore(subscribe, getAccessSnapshot);
  const hasAccess = snapshot !== null;
  const stored = hasStoredRefresh();
  return hasAccess || stored
    ? { loggedIn: true, email: getEmail() }
    : EMPTY;
}