# АвтоОтчёт — приложение покупателя (frontend)

Монорепозиторий фронтенда для покупателя: мобильный веб-сайт поиска и покупки отчётов об осмотре автомобиля.
Перенесён из `backend-podbor/frontend` (только часть покупателя), план и детали — в `docs/`.

## Состав

- `apps/web` — SPA покупателя (Vite + React 19 + TypeScript + Tailwind v4).
- `packages/ui` — дизайн-токены, shadcn-компоненты, `ReportView` (общий просмотр отчёта).
- `packages/api` — ручные типы DTO и разбор ошибок (`ApiError`/`parseApiError`).

План покупателя и «шаги»: **`docs/PLAN_FRONTEND.md`** (часть 2), дизайн — `docs/PLAN_FRONTEND_DESIGN.md`.
Статус реализации — **`STATUS.md`**.

## Требования

- Node **22** (`.nvmrc`). Системная Node 20 не подходит. Пример: `export PATH="$HOME/.nvm/versions/node/v22.15.1/bin:$PATH"`.
- `npm install` (в `.npmrc` включён `legacy-peer-deps` — обход бага npm 10.9 `edgesOut` с опциональными peer-зависимостями vite).

## Команды

```bash
npm run dev:web          # dev-сервер на :5173, прокси /api → :8080
npm run dev:web:mocks    # dev без бэкенда, запросы перехватывает MSW (VITE_API_MOCKS=1)
npm run typecheck        # tsc по всем workspace
npm run build            # сборка всех workspace
npm test -w @podbor/web  # тесты покупателя (vitest)
```

## Прод (WEB-11)

Multi-stage `Dockerfile` (Node 22 → nginx) + `nginx.conf` + `docker-compose.yml`.
API ожидается в compose-сети `podbor` как сервис `api:8080` (из репо бэкенда).

```bash
docker compose up --build -d   # web на :3000 → :80
```

Перед выкатом: заменить `<s3-host>` на реальный хост S3 в `nginx.conf` (CSP).

## Аналитика и PWA (WEB-15/16)

- **Метрика** — включится при `VITE_YM_COUNTER=<id>` и после согласия в cookie-баннере. Цели — второй этап.
- **Sentry** — включится при `VITE_SENTRY_DSN=<dsn>` (release = git sha; query-string вырезается из URL перед отправкой).
- **PWA** — `manifest.webmanifest` + иконки, сайт можно добавить на домашний экран; страницы отчёта — `noindex`.

## Режим моков

`npm run dev:web:mocks` — приложение работает без бэкенда на MSW (`apps/web/src/mocks/handlers.ts`).
Из консоли браузера доступно управление:

```js
__mocks.reset();
__mocks.failOnce('POST', '/purchases', 409, 'PURCHASE_ALREADY_EXISTS');
__mocks.state;
```

## Ссылки

- План покупателя: `docs/PLAN_FRONTEND.md`
- Дизайн-система: `docs/PLAN_FRONTEND_DESIGN.md`
- Просмотр отчёта: `docs/PLAN_REPORT_VIEW.md`
- Пробелы бэкенда: `docs/BACKEND_TODO.md`