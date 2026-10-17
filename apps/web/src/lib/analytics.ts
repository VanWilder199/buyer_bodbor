/*
 * WEB-15: Яндекс.Метрика — только просмотры страниц (цели — второй этап).
 * Гейт: `VITE_YM_COUNTER` и согласие (`granted`). На `/reports/view` не
 * передаём query-string (там токен; S-10), считаем только pathname.
 */
import { getConsent } from './consent';

const YM_TAG_URL = 'https://mc.yandex.ru/metrika/tag.js';

function counterId(): string | undefined {
  return import.meta.env.VITE_YM_COUNTER;
}

let metrikaReady = false;

/** Путь для Метрики: на страницах отчёта только pathname (без токена в query). */
function safePath(pathname: string, search: string): string {
  if (pathname.startsWith('/reports/view')) return pathname;
  return pathname + search;
}

/** Стандартный сниппет Метрики: подключает tag.js и инициализирует счётчик. */
function ensureMetrika(): void {
  const id = counterId();
  if (!id || metrikaReady) return;
  metrikaReady = true;
  const snippet = `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","${YM_TAG_URL}","ym");ym(${id},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:false});`;
  const script = document.createElement('script');
  script.innerHTML = snippet;
  script.setAttribute('data-yandex-metrika', id);
  document.head.appendChild(script);
}

interface YmWindow {
  ym?: (id: number, action: string, value: string) => void;
}

/** Записать просмотр страницы (если согласие и задан счётчик). */
export function trackPage(location: { pathname: string; search: string }): void {
  const id = counterId();
  if (!id || getConsent() !== 'granted') return;
  ensureMetrika();
  const path = safePath(location.pathname, location.search);
  (window as unknown as YmWindow).ym?.(Number(id), 'hit', path);
}

/** Вызвать при смене согласия: `granted` → подгрузить Метрику и трекнуть текущий адрес. */
export function syncAnalytics(): void {
  const id = counterId();
  if (!id || getConsent() !== 'granted') return;
  ensureMetrika();
  trackPage({ pathname: window.location.pathname, search: window.location.search });
}