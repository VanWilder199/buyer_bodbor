/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Базовый URL API. Пусто/отсутствует → same-origin `/api`. */
  readonly VITE_API_URL?: string;
  /** `1` — включать MSW-моки вместо живого бэкенда. */
  readonly VITE_API_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}