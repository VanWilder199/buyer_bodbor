/*
 * WEB-15: Sentry. Инициализируется только при заданном `VITE_SENTRY_DSN`
 * (динамический импорт — не попадает в основной бандл без DSN).
 * S-10: `beforeSend`/`beforeBreadcrumb` вырезают query-string (особенно `token=`)
 * из URL перед отправкой; `release` = короткий git sha (`__APP_RELEASE__` из vite define).
 */

/** Оставить только pathname (без query-string — там может быть токен отчёта). */
function stripQuery(url: string): string {
  try {
    return new URL(url, window.location.origin).pathname;
  } catch {
    return url;
  }
}

export async function initSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  const Sentry = await import('@sentry/react');
  Sentry.init({
    dsn,
    release: (import.meta.env.VITE_SENTRY_RELEASE as string | undefined) ?? __APP_RELEASE__,
    environment: import.meta.env.PROD ? 'production' : 'development',
    beforeSend(event) {
      const request = event.request as { url?: string } | undefined;
      if (request?.url) request.url = stripQuery(request.url);
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      const data = breadcrumb.data as Record<string, unknown> | undefined;
      if (typeof data?.url === 'string') data.url = stripQuery(data.url);
      if (breadcrumb.message) breadcrumb.message = stripQuery(breadcrumb.message);
      return breadcrumb;
    },
  });
}