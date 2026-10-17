/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Базовый URL API. Пусто/отсутствует → same-origin `/api`. */
  readonly VITE_API_URL?: string;
  /** `1` — включать MSW-моки вместо живого бэкенда. */
  readonly VITE_API_MOCKS?: string;
  /** ID счётчика Яндекс.Метрики (WEB-15). Пусто → Метрика выключена. */
  readonly VITE_YM_COUNTER?: string;
  /** DSN Sentry (WEB-15). Пусто → Sentry выключен. */
  readonly VITE_SENTRY_DSN?: string;
  /** Переопределение release для Sentry (по умолчанию — короткий git sha). */
  readonly VITE_SENTRY_RELEASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Подставляется vite `define` (короткий git sha). */
declare const __APP_RELEASE__: string;