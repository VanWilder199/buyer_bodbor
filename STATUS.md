# Статус приложения покупателя (`apps/web`)

Состояние на 2026-10-17. План и шаги — `docs/PLAN_FRONTEND.md` (часть 2).

## Итог

Перенесён фронтенд покупателя из `backend-podbor/frontend` в отдельный репозиторий.
**Сделаны WEB-1…WEB-10, WEB-4 и WEB-14** на моках (MSW). Типы и сборка чистые, **24 теста зелёные**
(`npm test -w @podbor/web`), `npm run build` проходит.

## Что сделано

| Задача | Результат |
|---|---|
| WEB-1 | Каркас: роутер (data router), `AppShell` (шапка, «Войти/Выйти», «Мои покупки»), `QueryClientProvider`, `<Toaster/>`, `ErrorScreen`, 404, офлайн-баннер, `/dev/report` (только dev), удалён MUI из `apps/web` |
| WEB-2 | `packages/api` (ручные типы DTO, `ApiError`, `parseApiError`), клиент `api/client.ts` (`baseUrl=/api`, middleware авторизации), `errorMessages.ts`, `formatByn`/`formatDate` (из `@podbor/ui/lib/format`), MSW-хендлеры на все эндпоинты покупателя, тесты разбора ошибок |
| WEB-3 | Вход по OTP (телефон/email, 2 шага), сессия (access в памяти, refresh в `localStorage`, `exp` из JWT), авто-refresh single-flight, `INVALID_REFRESH_TOKEN` → разлогин, guard'ы `requireAuth`/`guestOnly`, таймер повторной отправки 60 с, лимит 3/час. Тесты: 5 параллельных запросов = 1 refresh |
| WEB-5 | Главная (поле VIN/ссылка), поиск по VIN → карточка машины; по ссылке av.by → вход → `POST /cars/resolve` |
| WEB-6 | Checkout: подтверждение (машина, подборщик, цена), `POST /purchases`, `sessionStorage.pendingPurchase`, редирект на bePaid, разбор `PURCHASE_ALREADY_EXISTS`, блокировка двойного клика |
| WEB-7 | Возврат: `/purchase/success` (polling 2 с, макс. 2 мин, backoff; `paid`/`failed`/таймаут), `/purchase/fail`, `/purchase/cancel` |
| WEB-8 | «Хочу отчёт» (`/cars/:carId/request`): форма email (react-hook-form + zod), `waitingCount`, экран «Готово» |
| WEB-14 | `/sample` — пример отчёта на статичных данных + CTA |
| WEB-4 | Экран отчёта по ссылке `/reports/view?token=` (публичный, без хрома): `ReportView` из API, `staleTime` 50 мин, токен убирается из URL и живёт в `sessionStorage`, заголовок «Отчёт об осмотре»/машина из `sessionStorage` (до G-10), повтор загрузки медиа ≤1 за 30 с, `404 ACCESS_TOKEN_INVALID` и отсутствие токена → «Ссылка недействительна» + CTA «Мои покупки» |
| WEB-10 | Открытие купленного отчёта из «Моих покупок»: `/purchases/:id/report` (требует входа) переиспользует экран отчёта (шапка из обогащённого `PurchaseDto`), `GET /purchases/{id}/view` (G-6 на моках), `paid` → «Открыть отчёт», `failed` → «Купить снова», `pending` → «Платёж обрабатывается», `PURCHASE_NOT_FOUND`/`REPORT_NOT_FOUND`/`REPORT_REMOVED` → свои тексты. Общие модули `ReportScreen`/`ReportLoading`/`useMediaRefetch` |
| WEB-9 | Полная страница машины `/cars/:carId`: карточка (марка/модель/год/VIN/ссылка av.by), список отчётов (подборщик, дата, цена, тизер `stopFactorsCount`, «Купить»/«Открыть`), 0 отчётов → «Хочу отчёт» с `waitingCount`; отдельные skeleton/error для списка; прямой заход по URL работает (G-4/G-5 на моках). `waitingCount` добавлен в `CarDto` (G-5) |

## Что отложено (по решению пользователя «Ядро сейчас»)

- **WEB-11…16** — прод-сборка/nginx, генерация типов из springdoc, юр.страницы и согласие, аналитика, OG/PWA.

## Замечания по WEB-4

- Шапка отчёта до G-10: заголовок «Отчёт об осмотре»; если пришли из своего флоу — машина из `sessionStorage['podbor.reportCar']` (сохраняется на checkout).
- Ошибка загрузки медиа (протухшая presigned-ссылка) → `invalidateQueries(['report','view'])` не чаще 1 раза за 30 с.
- `mockServiceWorker.js` лежит в `apps/web/public/` и попадает в `dist` (WEB-11 — убрать).

## Известные замечания

- **Публичные эндпоинты.** Поиск и карточка машины (`GET /cars/**`, `GET /reports?carId=`) помечены `auth: false` — это соответствует целевому состоянию после G-1/G-2/G-4. Пока на живом бэке G-1 не сделан, эти запросы с настоящим бэкендом вернут 401.
- **Мок bePaid.** `redirectUrl` в моках ведёт сразу на `/purchase/success` (страница-имитация `/dev/bepaid` не реализована).
- `mockServiceWorker.js` лежит в `apps/web/public/` и попадает в `dist` (WEB-11 — убрать).
- Чанк ~565 КБ (radix-ui + `ReportView`) — при желании код-сплит.
- npm 10.9: нужен `legacy-peer-deps` (см. `.npmrc`), иначе падает `edgesOut` с peer-зависимостями vite.

## Вопросы

1. Сделаны WEB-4 (экран отчёта), WEB-10 (открытие из «Моих покупок») и WEB-9 (полная страница машины). Дальше: WEB-13 (юр.страницы, чекбокс согласия) или WEB-11 (прод-nginx)?
2. Проверить глазами `npm run dev:web:mocks`: вход (код `042817`) → поиск VIN → карточка (`/cars/c-1`) → покупка → возврат → «Мои покупки» → «Открыть отчёт»; отчёт по токену — `/reports/view?token=r-1`.