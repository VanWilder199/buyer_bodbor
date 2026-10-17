/*
 * Guard'ы роутов (WEB-3). Работают через loader'ы data router'а.
 * Проверяют только наличие refresh на диске: финально валидность сессии
 * решает первый запрос с авто-refresh.
 */
import { redirect, type LoaderFunctionArgs } from 'react-router-dom';
import { hasStoredRefresh } from './session';

/** `next` принимается только как относительный путь — защита от open redirect. */
const NEXT_RE = /^\/(?![/\\])/;

export function requireAuthLoader({ request }: LoaderFunctionArgs) {
  if (!hasStoredRefresh()) {
    const url = new URL(request.url);
    const next = encodeURIComponent(url.pathname + url.search);
    return redirect(`/login?next=${next}`);
  }
  return null;
}

export function guestOnlyLoader({ request }: LoaderFunctionArgs) {
  if (!hasStoredRefresh()) return null;
  const url = new URL(request.url);
  const next = url.searchParams.get('next');
  if (next && NEXT_RE.test(next)) return redirect(next);
  return redirect('/');
}