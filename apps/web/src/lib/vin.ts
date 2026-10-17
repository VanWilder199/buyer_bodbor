/*
 * Нормализация ввода на главной (WEB-5): VIN или ссылка объявления av.by.
 * VIN — 17 символов без I, O, Q; ссылка av.by приводится к каноническому виду.
 */

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

/** trim + upper; валиден ли VIN. */
export function normalizeVin(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidVin(value: string): boolean {
  return VIN_RE.test(value);
}

/** Канонический вид ссылки av.by: https, домен в нижнем регистре, без query/fragment/слеша. */
export function normalizeAvbyUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase();
  if (host !== 'cars.av.by' && host !== 'av.by') return null;
  if (url.username || url.password) return null;
  if (!url.pathname || url.pathname === '/') return null;
  return `${url.protocol}//${host}${url.pathname}`;
}

/** Определить тип ввода: 'vin' | 'url' | null (не распознано). */
export function detectInput(raw: string): 'vin' | 'url' | null {
  const vin = normalizeVin(raw);
  if (isValidVin(vin)) return 'vin';
  if (normalizeAvbyUrl(raw)) return 'url';
  return null;
}