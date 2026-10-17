# План фронтенда: общая часть + приложение покупателя (`apps/web`)

> **Правило для агентов: ничего не запускать.** Не поднимать dev-серверы (`npm run dev:*`, `vite`, `vite preview`), не открывать браузеры (в том числе headless Chrome/Firefox ради скриншотов), не стартовать заглушки бэкенда и любые фоновые процессы, не ходить `curl` на локальные порты. Проверка только статическая: `npm run typecheck`, `npm run build`, юнит-тесты (vitest). Всё, что требует живого приложения (визуальная проверка, прокси на бэкенд, MSW в браузере, критерии вида «запускается на localhost:517x»), делает и отмечает пользователь сам.
> Причина: в песочнице агент не может убить фоновые процессы (порты 5174 и 8080 остаются занятыми, Spring Boot потом не стартует), а браузер в ней не запускается.

> Этот документ состоит из двух частей. **Часть 1** (общая) обязательна для всех фронтовых планов. **Часть 2** описывает приложение покупателя.
> Остальные клиенты описаны отдельно:
> - **`PLAN_FRONTEND_ADMIN.md`**: админка `apps/admin` (shadcn из `packages/ui`, десктоп + модерация с телефона);
> - **`PLAN_FRONTEND_MINIAPP.md`**: Telegram Mini App подборщика `apps/inspector` и aiogram-бот `bot/`.
>
> Код бэкенда в этом плане не меняется. Раздел «Пробелы бэкенда» — это список задач, которые пользователь пишет сам в режиме «объяснение → код». Ссылки `файл:строка` даны по рабочей копии на 2026-09-27, Блок 12 ещё не закоммичен.

---

# Часть 1. Общая часть

## Контекст

Бэкенд (блоки 0–11) реализован. Блок 12 (`PLAN_REPORT_VIEW.md`, `GET /reports/view?token=`) лежит в рабочей копии и не закоммичен. В `PROJECT_CONTEXT.md` и `tech-stack-detailed.md` фронт задумывался как 4 клиента. Обсуждение 2026-09-27 упростило схему до трёх SPA в одном монорепозитории.

## Зафиксированные решения

1. **Покупатель получает мобильный веб-сайт (mobile-first), а не React Native.** Страница отчёта по токену и так веб («не PDF, видео в PDF невозможно»), bePaid работает через редирект, push вне скоупа MVP. RN-приложение отложено на второй этап, к тому моменту API уже будет обкатан.
2. **Подборщик работает через Telegram Mini App и Python aiogram-бот.** Подробности в `PLAN_FRONTEND_MINIAPP.md`.
3. **Админка — веб на том же shadcn, что покупатель** (решение 2026-09-29, было MUI). Подробности в `PLAN_FRONTEND_ADMIN.md`.
4. **Фронт генерируется**, обучение на нём не строится. Бэкенд-доработки для фронта пользователь пишет сам.
5. **Один стек и один монорепозиторий `frontend/`** на npm workspaces (pnpm в окружении нет). Это **отдельный git-репозиторий**, не часть `backend-podbor` (C-12).
6. **Общий компонент просмотра отчёта** (`packages/ui`, `ReportView`) используется во всех трёх приложениях: превью у подборщика, модерация у админа, просмотр у покупателя. Вёрстка одна.
7. **Все суммы приходят в копейках** (`BIGINT`): `priceByn`, `amountByn`. Так же их принимает bePaid (`PLAN_BEPAID.md:34`). Для отображения делим на 100 в одной утилите `formatByn()`.

## Стек

| Задача | Выбор | Почему |
|---|---|---|
| Сборка | Vite + React 19 + TypeScript | SPA, nginx раздаёт её как статику, Node на VPS не нужен |
| Роутинг | React Router (data router, `createBrowserRouter`) | стандарт; `loader`/`errorElement` удобны для guard'ов |
| Данные | TanStack Query | кеш, ретраи, состояния загрузки, polling через `refetchInterval` |
| API-клиент | `openapi-typescript` + `openapi-fetch` | типы из springdoc: при изменении DTO фронт перестаёт компилироваться, а не падает в рантайме |
| Формы | react-hook-form + zod | валидация зеркалит `@Valid` на бэке |
| UI-кит (web) | shadcn/ui (Radix + Tailwind v4) + vaul (bottom sheet) + sonner (toast) | код компонентов лежит у нас, вид «как веб-банк» без борьбы с Material. Решение 2026-09-29, подробности в `PLAN_FRONTEND_DESIGN.md` |
| UI-кит (admin) | тот же shadcn из `packages/ui`, таблицы — простой `Table` без библиотек | «самый простой кит», решение 2026-09-29; см. `PLAN_FRONTEND_ADMIN.md` |
| Стили | Tailwind CSS v4 в `packages/ui` | одна система стилей для `apps/web`, `apps/admin` и общего `ReportView` (он же в Mini App). MUI в проекте нет |
| Видео | нативный `<video>` (mp4), позже `hls.js` | HLS на бэке не реализован |

**Поддержка браузеров** (решение 2026-09-29): Safari/iOS 16.4+, Chrome 111+, Firefox 128+. Это минимум для Tailwind v4 и `navigator.locks`. iOS 15 (iPhone 6s/7) не поддерживаем, долю таких устройств проверим по Метрике (WEB-15).

**Почему не Next.js.** На MVP SEO не критичен (отчёты приватные), а SPA проще деплоить.

Визуальный дизайн покупателя (принципы, токены, компоненты, схемы экранов) описан в **`PLAN_FRONTEND_DESIGN.md`**. Токены живут в `packages/ui/src/theme.css`, `tokens.ts` — JS-копия цветов (для canvas, схемы ЛКП); если не понадобится, удалить.

## Структура монорепозитория

```
frontend/
  package.json            workspaces: apps/*, packages/*; скрипты dev:web, build, typecheck
  tsconfig.base.json
  apps/web/               покупатель (есть: Vite + MUI-тема + ReportView на моках, src/mocks/report.ts; MUI уходит в DS-1)
  apps/admin/             админка            → PLAN_FRONTEND_ADMIN.md (ещё нет)
  apps/inspector/         Telegram Mini App  → PLAN_FRONTEND_MINIAPP.md (ещё нет)
  packages/ui/            токены, Tailwind v4, shadcn-компоненты (components/ui) и наши составные (components),
                          ReportView/SectionGrid/PaintDiagram/MediaGallery,
                          report/types.ts (ручное зеркало ReportViewDto), report/catalog.ts (подписи)
  packages/api/           (ещё нет) сгенерированные типы + клиент openapi-fetch
bot/                      Python aiogram 3   → PLAN_FRONTEND_MINIAPP.md
```

Каждое приложение создаёт свой клиент поверх `packages/api`. Способ авторизации у всех разный: Bearer покупателя, Bearer админа, заголовок `X-Telegram-Data` в Mini App. Поэтому middleware авторизации живёт в приложении, а не в пакете.

## Общие соглашения

### Ошибки

1. **`AppException` → `ProblemDetail`** (`GlobalExceptionHandler.java:23-50`):
   ```json
   {
     "type": "/errors/purchase_already_exists",
     "title": "Purchase already exists",
     "status": 409,
     "detail": "Purchase already exists",
     "instance": "/purchases",
     "timestamp": "2026-09-27T10:00:00Z",
     "path": "/purchases",
     "errorCode": "PURCHASE_ALREADY_EXISTS"
   }
   ```
   Фронт опирается **только на `errorCode` и `status`**. `title` и `detail` написаны по-английски, пользователю их не показываем. В `packages/api` лежит одна таблица `errorCode → текст на русском`, у каждого приложения свои переопределения.
2. **Ошибка валидации `@Valid`** (`ValidationExceptionHandler.java:45-58`): `400`, `errorCode: "BAD_REQUEST"` и массив строк `errors: ["email: must be a well-formed email address"]` в формате `"поле: сообщение"`. Строки приходят по-английски, поэтому для подсветки полей берём часть до `:` как имя поля, а текст пишем свой. Основная валидация должна жить на клиенте (zod), и эта ветка — страховка.
3. **Прочие ошибки Spring MVC** (нет обязательного query-параметра, кривой UUID в пути, невалидный JSON) обрабатываются базовым `ResponseEntityExceptionHandler`: `400` в формате `ProblemDetail`, но **без `errorCode`**. На фронте они попадают в общую ветку «Некорректный запрос».
4. **Любое непредусмотренное исключение** (catch-all, `ValidationExceptionHandler.java:23-43`): `500`, `errorCode: "INTERNAL_SERVER_ERROR"`. Сюда же попадают нарушения ограничений БД: FK на несуществующий `carId`, гонка на partial UNIQUE покупок.
5. **`401` и `403` от Security-фильтров приходят через `response.sendError(...)`** (`SecurityConfig.java:81-89`), а не через `ProblemDetail`. Тела с `errorCode` нет: тело либо пустое, либо это дефолтный JSON Boot `/error` (`timestamp/status/error/path`). **Правило для клиента: `401`/`403` без `errorCode` означает, что фильтр отклонил токен.** Покупатель в этом случае идёт в refresh, админ разлогинивается, Mini App показывает «переоткройте приложение». `401` **с** `errorCode` (`INVALID_REFRESH_TOKEN`, `ADMIN_*`, `TELEGRAM_AUTH_*`) — бизнес-ошибка, её разбираем по коду.
6. **Сеть/таймаут/`502`/`503`/`504` без JSON** — общий экран «Нет связи с сервером» с кнопкой «Повторить». TanStack Query ретраит только идемпотентные GET (`retry: 2`), мутации не ретраит никогда.

### Типы из OpenAPI

- По итогам ревью (R-1, `REVIEW_REPORT.md`) **B-80 (springdoc) теперь делается первым пунктом бэкенда**, раньше фронтовых фич — см. `BACKEND_TODO.md`. Ручные зеркала типов, описанные ниже, остаются только как fallback на случай, если B-80 всё же задержится.
- До появления springdoc (пробел **G-8**) типы пишутся руками рядом с потребителем, как сейчас в `packages/ui/src/report/types.ts`. В шапке каждого такого файла стоит комментарий «зеркало `X.java`».
- После springdoc: `packages/api` → `npm run gen` = `openapi-typescript http://localhost:8080/v3/api-docs -o src/schema.d.ts`. Сгенерированный файл коммитим, чтобы сборка не зависела от запущенного бэка. Ручные типы из `packages/ui` заменяем на реэкспорт из `@podbor/api`.
- Enum'ы Java сериализуются строками по `name()`: `ItemStatus` = `OK|WARN|BAD`, `SectionKey` = `EXTERIOR|PAINT|INTERIOR|ENGINE|SUSPENSION|ELECTRICS|DOCUMENTS`, `MediaKind` = `PHOTO|VIDEO`, `Channel` = `SMS|EMAIL`. Статусы покупок и медиа хранятся как **строки в нижнем регистре** без enum: `pending|paid|failed` и `uploaded|pending|ready`. В TS они описываются union-типом руками даже после генерации.
- Даты приходят в ISO-8601 (`OffsetDateTime`), UUID — строками.

### Прокси `/api` и origin

- Бэкенд живёт без `context-path` (`application.yml:17`, порт `8080`), а пути фронта и API пересекаются: `/reports/view` есть и там, и там. Поэтому **фронт всегда ходит на `/api/*`**, и префикс срезается:
  - dev: `apps/web/vite.config.ts` уже содержит `'/api' → http://localhost:8080` с `rewrite` без `/api`. В `apps/admin` и `apps/inspector` нужно то же самое;
  - prod: nginx `location /api/ { proxy_pass http://api:8080/; }` (со слешем на конце, чтобы префикс срезался), остальное отдаётся как `try_files $uri /index.html`.
- `baseUrl` клиента — `import.meta.env.VITE_API_URL ?? '/api'`.

### CORS

- В `SecurityConfig` CORS **нет совсем**. Пока фронт и API живут на одном origin (Vite-прокси в dev, nginx `/api` в prod), браузеру CORS не нужен, так что **на MVP это не блокер**.
- CORS понадобится, если API вынесут на отдельный домен (`api.site.by`) или Mini App разместят отдельно от API. Контракт описан в пробеле **G-9**.
- Отдельный вопрос — CORS на бакете S3/MinIO. Для `<img>`/`<video>` по presigned GET он не нужен. Нужен для presigned PUT из Mini App и для `fetch()` медиа, например при скачивании фото.

---

# Часть 2. Приложение покупателя (`apps/web`)

## Сценарии (из `PROJECT_CONTEXT.md:40-51`)

**Сценарий А — отчёт найден.** Покупатель вставляет VIN или ссылку av.by → видит список отчётов по машине (подборщик, дата, цена) → выбирает отчёт → входит по OTP, если ещё не вошёл → оплачивает в bePaid → возвращается на «Спасибо» → получает письмо со ссылкой → открывает приватную страницу отчёта. Отчёт также доступен из «Моих покупок».

**Сценарий Б — отчёта нет.** Покупатель ищет машину, отчётов нет → «Хочу отчёт» (email) → запрос попадает в спрос у подборщиков → после публикации отчёта приходит письмо → по ссылке покупатель попадает на страницу машины и дальше идёт по сценарию А.

## Роуты и карта экранов

| Роут | Экран | Доступ | API | Готовность бэка |
|---|---|---|---|---|
| `/` | Главная: поле «VIN или ссылка av.by», пара слов о сервисе | публичный | — | — |
| `/search?q=` | Результат поиска: карточка машины или «не найдено» | **сейчас нужен вход** (G-1) | `GET /cars/search?vin=` | 🟡 только VIN, требует JWT, поиска по ссылке нет (G-3) |
| `/cars/:carId` | Машина + список опубликованных отчётов **или** блок «Хочу отчёт» | публичный (цель) | `GET /cars/{id}` + `GET /reports?carId=` | ❌ оба эндпоинта отсутствуют (G-2, G-4) |
| `/cars/:carId/request` | Форма «Хочу отчёт» (email) → «Готово, N человек уже ждут» | JWT | `POST /cars/{carId}` | 🟡 работает, счётчика нет (G-5) |
| `/login?next=` | Шаг 1: телефон или email → шаг 2: код из 6 цифр | только гость | `POST /auth/otp/send`, `/auth/otp/verify` | ✅ |
| `/checkout/:reportId` | Подтверждение: машина, подборщик, цена → «Оплатить» → редирект | JWT | `POST /purchases` | ✅, но return URL захардкожены (G-7) |
| `/purchase/success`, `/purchase/fail`, `/purchase/cancel` | Возврат с bePaid: ожидание статуса → «Оплачено» / «Не прошло» | JWT | `GET /purchases` (polling) | 🟡 нет `GET /purchases/{id}` (G-6) |
| `/purchases` | Мои покупки: список со статусами, кнопка «Открыть отчёт» | JWT | `GET /purchases` | 🟡 нет данных о машине и пути к отчёту (G-6) |
| `/purchases/:purchaseId/report` | Отчёт из истории покупок | JWT | `GET /purchases/{id}/view` | ❌ (G-6) |
| `/reports/view?token=` | Отчёт по ссылке из письма | публичный (токен) | `GET /reports/view?token=` | 🟡 Блок 12 в рабочей копии; шапки нет (G-10), ссылка в письме указывает на API (G-11) |
| `*` | 404 | — | — | — |

Навигация: верхняя панель (логотип → `/`, «Мои покупки», «Войти»/«Выйти»). Страница отчёта открывается без лишнего хрома, чтобы по ссылке из письма не отвлекала навигация.

## Справочник API (сверено с кодом)

Обозначения: 🔓 — публичный, 🔑 — `Authorization: Bearer <accessToken>` с ролью `BUYER` (на деле default-chain проверяет только `authenticated()`, `SecurityConfig.java:62-79`). Всё, что не `/auth/**`, `/reports/view`, `/webhooks/**`, `/error`, требует JWT, **включая поиск машины**.

### `POST /auth/otp/send` 🔓

`AuthController.java:27-31` → `OtpService.sendOtp` (`OtpService.java:40-58`).

Тело: ровно **одно** из полей (`SendOtpRequest`):
```json
{ "phoneNumber": "+375291234567" }
```
```json
{ "email": "buyer@example.com" }
```
- Канал определяется неявно: если передан `phoneNumber`, это `SMS`, иначе `EMAIL`. Если переданы оба поля, выигрывает телефон.
- Телефон проверяется по `^\+375\d{9}$`, email — по `@Email`. **Если не передать ничего, валидация проходит**, `destination` становится `null` и запрос падает в БД с `500`. Клиент обязан это исключить.

Ответ: **`202 Accepted`, тело пустое.**

| errorCode | HTTP | Когда |
|---|---|---|
| `BAD_REQUEST` | 400 | телефон не в формате `+375XXXXXXXXX`, невалидный email |
| `OTP_RATE_LIMIT_EXCEEDED` | 429 | 4-я отправка на тот же адрес в течение окна |
| `INTERNAL_SERVER_ERROR` | 500 | пустое тело (см. выше) |

`OTP_SEND_FAILED` синхронно не приходит: отправка асинхронная (`sendOtpAsync`, `OtpService.java:57`). Если письмо или SMS не дошли, клиент об этом не узнает, поэтому нужна кнопка «Отправить ещё раз».

### `POST /auth/otp/verify` 🔓

`AuthController.java:33-36` → `OtpService.verifyOtp` (`OtpService.java:60-95`).

Тело (`VerifyOtpRequest`). Здесь канал **явный** и обязательный, в отличие от `send`:
```json
{ "destination": "+375291234567", "channel": "SMS", "otp": "042817" }
```
Ответ `200` (`AuthResponse`):
```json
{
  "accessToken": "eyJhbGciOiJIUzM4NCJ9...",
  "refreshToken": "3q2-7wVh0bJ1...Q",
  "expiresIn": 1790000000
}
```
**`expiresIn` — это не TTL access-токена в секундах, а epoch-секунды истечения *refresh*-токена** (`JwtServiceImpl.java:57`). Для планирования refresh его не используем, срок жизни access берём из claim `exp` JWT.

| errorCode | HTTP | Когда |
|---|---|---|
| `BAD_REQUEST` | 400 | `otp` не 6 символов, нет `channel`/`destination` |
| `OTP_INVALID` | 400 | неверный код (счётчик попыток +1) |
| `OTP_EXPIRED` | 400 | нет живого кода (истёк, уже использован, не запрашивался) **или исчерпаны 3 попытки** |

После успеха пользователь создаётся или находится по `phone`/`email` (upsert, `OtpService.java:97-123`). Роль всегда `BUYER`.

### `POST /auth/refresh` 🔓

`AuthController.java:38-41` → `JwtServiceImpl.rotateRefreshToken` (`JwtServiceImpl.java:92-121`).

Тело: `{ "refreshToken": "3q2-7wVh0bJ1...Q" }`. Ответ `200`: новый `AuthResponse` (новая **пара** токенов).

| errorCode | HTTP | Когда |
|---|---|---|
| `BAD_REQUEST` | 400 | пустой `refreshToken` |
| `INVALID_REFRESH_TOKEN` | 401 | токен не найден, отозван (уже использован) или истёк |

`REFRESH_TOKEN_REVOKED` объявлен в `ErrorCode`, но нигде не бросается.

### OTP и токены: каналы, TTL, лимиты

| Параметр | Значение | Где |
|---|---|---|
| Каналы | `SMS` (телефон РБ `+375…`), `EMAIL` | `Channel.java`, `SendOtpRequest` |
| Код | 6 цифр, BCrypt-хэш в `otp_codes` | `OtpService.java:44-49` |
| TTL кода | **5 минут** | `OtpService.java:36` |
| Попыток ввода | **3** на код, дальше `OTP_EXPIRED` | `OtpService.java:37, 74-76` |
| Rate limit отправки | **3 отправки на адрес за окно 3600 с**, окно фиксированное и отсчитывается от первой отправки, `Retry-After` нет | `OtpRateLimiter.java:27-28, 54-64` |
| Access-токен | HS JWT, claims `sub`=userId, `email` (для SMS-пользователя `null`), `role`=`BUYER`. **TTL 15 минут** из `jwt.access-token-expiration` (в минутах) | `JwtServiceImpl.java:47, 66-76`, `application.yml:21` |
| Refresh-токен | случайные 32 байта (base64url), в БД хранится SHA-256. **TTL 72 часа, захардкожен** (`refreshTokenExpiration = 72`). `jwt.refresh-token-expiration: 43200` из yml **не читается** | `JwtServiceImpl.java:36, 80-90`, `application.yml:22` |
| Ротация | каждый `/auth/refresh` отзывает старый (`revoked_at`) и выдаёт новую пару. Повторное использование старого даёт `401 INVALID_REFRESH_TOKEN`, отзыва всей «семьи» токенов нет. `/auth/logout` нет | `JwtServiceImpl.java:104-120` |

Следствие для UX: сессия живёт не больше **72 часов без активности**. Каждый refresh продлевает её ещё на 72 часа. Через 3 дня простоя вход снова идёт по OTP.

⚠️ **Повторная отправка кода.** `verifyOtp` берёт *любой* непотреблённый и неистёкший код по `destination` через `LIMIT 1` **без `ORDER BY`** и без фильтра по каналу (`OtpService.java:62-68`). После «Отправить ещё раз» в БД лежат два живых кода, и новый код могут сверить со старой записью: пользователь получит `OTP_INVALID` при правильном коде. Пока бэкенд не исправлен (G-12), клиент держит паузу 60 с перед повторной отправкой и после неё пишет: «Если код не подходит, введите код из предыдущего сообщения».

### `GET /cars/search?vin=` 🔑

`CarController.java:24-29` → `CarServiceImpl.findByVin` (`CarServiceImpl.java:61-67`): точное совпадение `cars.vin`, без нормализации.

Ответ `200` (`CarDto`):
```json
{
  "id": "5b7f3c1e-2a4d-4c1b-9f0e-8d6a2b1c3e4f",
  "vin": "WVWZZZ3CZHE123456",
  "avbyListingUrl": "https://cars.av.by/volkswagen/passat/112233445",
  "make": "Volkswagen",
  "model": "Passat",
  "year": 2017,
  "listingStatus": "active"
}
```
| errorCode | HTTP | Когда |
|---|---|---|
| — (без errorCode) | 400 | нет параметра `vin` |
| `NOT_FOUND` | 404 | машины с таким VIN нет. Код общий `NOT_FOUND`, а не `CAR_NOT_FOUND` |
| — | 401 | нет JWT (поиск закрыт, G-1) |

В базе есть **только машины, по которым подборщик уже создавал отчёт** (`findOrCreateByUrl` вызывается из `POST /inspector/reports`). Поэтому `404` означает не «такой машины нет», а «по ней никто не работал», и для сценария Б это тупик (G-4). Клиент перед запросом делает `trim().toUpperCase()` и проверяет VIN регуляркой `^[A-HJ-NPR-Z0-9]{17}$`.

### `POST /cars/{carId}` 🔑 — «Хочу отчёт»

`CarController.java:32-38` → `CarServiceImpl.createReportRequest` (`CarServiceImpl.java:69-88`).

Тело (`CreateReportRequestDto`): `{ "email": "buyer@example.com" }`, поле `@NotBlank @Email`. Email обязателен даже для пользователя, вошедшего по email: из JWT он не подставляется. Форму заполняем значением claim `email`, если оно есть.

Ответ `200`: **голое число** — id записи `report_requests`, например `42`. Повторный вызов идемпотентен (`ON CONFLICT (car_id, buyer_id) DO NOTHING`) и возвращает тот же id. Email при этом **не обновляется**.

| errorCode | HTTP | Когда |
|---|---|---|
| `BAD_REQUEST` | 400 | пустой или невалидный email |
| — | 400 | кривой UUID в пути |
| `INTERNAL_SERVER_ERROR` | 500 | несуществующий `carId` (FK) |

Письмо при публикации отчёта (`ModerationServiceImpl.java:81-86`) содержит текст «Ваш запрос на отчёт был одобрен» **без ссылки** (G-11).

### `POST /purchases` 🔑

`PurchaseController.java:31-35` → `PurchaseServiceImpl.initiatePurchase` (`PurchaseServiceImpl.java:75-119`).

Тело (`InitiatePurchaseRequest`): `{ "reportId": "9d1e4b2a-..." }` — `@NotNull UUID`.

Ответ `200` (`InitiatePurchaseResponse`):
```json
{
  "purchaseId": "c0a8012e-7b1f-4a3e-9c55-0e2f6d7a8b90",
  "redirectUrl": "https://checkout.bepaid.by/#/2e8f1c...token"
}
```
| errorCode | HTTP | Когда |
|---|---|---|
| `BAD_REQUEST` | 400 | нет `reportId` |
| `REPORT_NOT_PUBLISHED` | 409 | отчёт не `published` **или не существует**: `404` здесь не бывает |
| `PURCHASE_ALREADY_EXISTS` | 409 | у покупателя уже есть покупка этого отчёта в статусе `pending` **или** `paid` |
| `BEPAID_REQUEST_FAILED` | 502 | bePaid не создал checkout. Покупка переводится в `failed`, повтор возможен |
| `INTERNAL_SERVER_ERROR` | 500 | двойной клик: check-then-insert (`:79-96`) против partial UNIQUE `purchases_report_id_buyer_id_idx` |

**`PURCHASE_ALREADY_EXISTS` при `pending` — ловушка.** Если покупатель закрыл окно bePaid, покупка остаётся `pending`. `redirectUrl` повторно не получить: токен checkout хранится в БД, но наружу не отдаётся. Повторно купить тоже нельзя. Разблокировать должен `BePaidReconcileService` (раз в 15 минут, для `pending` старше 1 часа), но **`@EnableScheduling` нет** (`PLAN_FINAL_CHECKLIST.md` 2.1), так что покупка висит вечно. К тому же reconcile переводит в `failed` только статусы `failed`/`expired`, а брошенный checkout bePaid помечает как `expired` не сразу. Клиентская обработка описана в разделе «Поведение», контракт — в G-6/G-13.

### `GET /purchases` 🔑

`PurchaseController.java:26-29` → `PurchaseServiceImpl.getPurchases` (`:169-182`), сортировка `created_at DESC`.

Ответ `200` (`List<PurchaseDto>`):
```json
[
  {
    "id": "c0a8012e-7b1f-4a3e-9c55-0e2f6d7a8b90",
    "reportId": "9d1e4b2a-...",
    "amountByn": 150000,
    "status": "paid",
    "createdAt": "2026-09-27T10:00:00+03:00",
    "paidAt": "2026-09-27T10:02:13+03:00"
  }
]
```
`status` принимает значения `pending | paid | failed`. **Ни машины, ни подборщика, ни ссылки на отчёт в ответе нет** (G-6). Пагинации нет.

### Флоу оплаты bePaid

1. `POST /purchases` → бэкенд создаёт `purchases(status='pending')` → `BePaidClient.createCheckout` (`BePaidClient.java:19-55`), `amount` передаётся в копейках, `tracking_id = purchaseId`.
2. Фронт делает `window.location.assign(redirectUrl)` на `https://checkout.bepaid.by/#/<token>`.
3. После оплаты bePaid возвращает браузер на return URL. **Они захардкожены** (`BePaidClient.java:27-31`):
   - `notification_url`: `http://localhost:8080/webhooks/bepaid`, в проде вебхук не придёт;
   - `success_url`: `http://localhost:8080/purchase/success`;
   - `decline_url`, `fail_url`: `http://localhost:8080/purchase/fail`;
   - `cancel_url`: `http://localhost:8080/purchase/cancel`.

   Это **порт бэкенда**, а не фронта, и путь без `/api`. На `:8080` такого роута нет, покупатель увидит `401` от default-chain. В URL нет и `purchaseId`: bePaid может дописать свои query-параметры, но опираться на них нельзя. Исправление описано в G-7. Роуты фронта `/purchase/success|fail|cancel` заложены именно под эти пути.
4. Параллельно bePaid шлёт вебхук → `applySuccessfulPayment` (`PurchaseServiceImpl.java:230-261`) → `status='paid'`, `paid_at`, начисление подборщику, `report_access_tokens` (TTL **30 дней**, `:269`) → письмо со ссылкой, **только если у пользователя есть email** (`:256`). SMS-покупатель ссылку не получит (`PLAN_FINAL_CHECKLIST.md` 2.3).
5. Статус на фронте узнаётся только через polling `GET /purchases`. Вебхук может прийти раньше возврата браузера, позже него или не прийти вовсе.

### `GET /reports/view?token=` 🔓 (Блок 12, не закоммичен)

`ReportAccessController.java:18-21` → `ReportAccessServiceImpl.getReportByToken` (`:41-69`). Токен — base64url-строка из письма. JWT не нужен и не мешает.

Ответ `200` (`ReportViewDto`):
```json
{
  "id": "9d1e4b2a-...",
  "carId": "5b7f3c1e-...",
  "priceByn": 150000,
  "conclusionText": "Машина в целом живая, но ...",
  "stopFactors": ["Следы затопления салона", "Перекрас крыши 410 мкм"],
  "sections": [
    {
      "id": "a1...",
      "sectionKey": "EXTERIOR",
      "orderNo": 1,
      "summary": "Кузов без следов ДТП",
      "items": [ { "itemKey": "body_geometry", "status": "OK", "comment": null } ],
      "media": [ { "id": "m1...", "kind": "PHOTO", "url": "https://s3.../...&X-Amz-Signature=...", "status": "uploaded", "orderNo": 1 } ]
    }
  ],
  "paintMeasurements": [
    { "id": "p1...", "panelCode": "roof", "spot": null, "thicknessUm": 410, "note": "перекрас" }
  ],
  "globalMedia": [
    { "id": "v1...", "kind": "VIDEO", "url": "https://s3.../walkaround.mp4?...", "status": "pending", "orderNo": 1 }
  ]
}
```
| errorCode | HTTP | Когда |
|---|---|---|
| — (без errorCode) | 400 | нет параметра `token` |
| `ACCESS_TOKEN_INVALID` | **404** | токен не найден, истёк (30 дней), отозван или отчёт удалён. Причина намеренно не раскрывается (`PLAN_REPORT_VIEW.md`, решение 3) |

Нюансы для клиента:
- `url` — **presigned GET на 60 минут** (`s3.presigned-url-ttl-minutes`, `ReportAccessServiceImpl.java:93-99`). Если вкладка открыта дольше, картинки и видео перестают грузиться. Обработка описана в разделе «Поведение».
- Медиа отдаются **все, без фильтра по `status`**. Видео со статусом `pending` (воркера нет, `PLAN_FINAL_CHECKLIST.md` 3.9) фактически лежит как исходный mp4 и обычно проигрывается. Порядок медиа и пунктов в секции не гарантирован: секции отсортированы по `orderNo`, медиа клиент сортирует сам по `orderNo`, пункты — по порядку из `catalog.ts`.
- **Шапки нет**: ни машины (есть только `carId`), ни подборщика, ни даты осмотра (G-10). `inspectorId` и `status` убраны намеренно (`PLAN_REPORT_VIEW.md`, решение 1).
- `itemKey` — свободная строка, справочника на бэке нет. Подписи берутся из `packages/ui/src/report/catalog.ts`, фолбэк — сам ключ (`itemLabel()`).

## Поведение

### Хранение токенов

- **access** хранится только в памяти (модуль `auth/session.ts`, плюс подписка для React через `useSyncExternalStore`). После перезагрузки страницы его нет, и первый запрос проходит через refresh.
- **refresh** лежит в `localStorage['podbor.refresh']`. Другого варианта нет: `/auth/refresh` принимает токен в теле, cookie бэкенд не ставит. Компенсируем строгим CSP в nginx (`script-src 'self'`) и отсутствием `dangerouslySetInnerHTML`. Переход на httpOnly-cookie описан в G-14.
- Из access-JWT (без проверки подписи, только `atob` payload) берём `exp` для превентивного refresh и `email` для автоподстановки в формы.
- **Выход** удаляет токены локально. Эндпоинта logout нет, поэтому refresh остаётся живым до 72 часов (G-14).

### Авто-refresh по 401 с защитой от гонок

Middleware `openapi-fetch` (`apps/web/src/api/client.ts`):

1. Перед запросом: если access нет или до `exp` осталось меньше 30 с, сначала `await refreshOnce()`.
2. Добавить `Authorization: Bearer …` на всё, кроме `/auth/**` и `/reports/view`.
3. Ответ `401` **без `errorCode`** (признак фильтра, см. «Ошибки» п.5) на запросе, который ещё не повторялся → `await refreshOnce()` → один повтор. Повторный `401` означает разлогин.
4. `refreshOnce()` — **single-flight**: модульная переменная `let inflight: Promise<Tokens> | null`. Все параллельные 401 ждут один и тот же промис. Без этого два одновременных запроса дважды предъявят один refresh, второй получит `INVALID_REFRESH_TOKEN`, потому что старый токен уже отозван ротацией, и пользователя выкинет.
5. **Межвкладочная гонка — ⏭ второй этап** (отложено по ревью, раздел 3 `REVIEW_REPORT.md`). Две вкладки делят один refresh в `localStorage`. Обмен выполняется под `navigator.locks.request('podbor-refresh', …)`. Внутри lock'а сначала перечитываем `localStorage`: если токен уже сменила другая вкладка, берём новый и в сеть не идём. После обмена пишем новый refresh. Событие `storage` в других вкладках сбрасывает их access в памяти. **На MVP** single-flight работает только в пределах одной вкладки (см. п.4); если две вкладки одновременно рефрешатся, одна из них может разлогиниться — принятый риск до второго этапа.
6. `INVALID_REFRESH_TOKEN` (401 с кодом) или `400` от `/auth/refresh` → очистить сессию, сбросить кеш TanStack Query (`queryClient.clear()`), редирект на `/login?next=<текущий путь>`.
7. `403` без тела для покупателя не ожидается. Если придёт, показываем общую ошибку без разлогина.

### Guard'ы роутов

- `RequireAuth` (`loader` у группы роутов): если refresh в `localStorage` нет → `redirect('/login?next=' + encodeURIComponent(pathname + search))`. Наличие refresh ещё не гарантирует валидную сессию: окончательно это решает первый запрос с авто-refresh.
- `GuestOnly` для `/login`: если сессия есть → `redirect(next ?? '/')`.
- `next` принимается только как относительный путь: регулярка `^\/(?![\/\\])` (начинается с одного `/`, не с `//` и не с `/\`, чтобы не пропустить обход вида `/\evil.com`). Это защита от open redirect (S-18).
- `/reports/view` и `/` не защищены. `/search` и `/cars/:id` **пока** требуют вход, потому что `/cars/**` закрыт на бэке (G-1). После G-1 их надо сделать публичными, а вход запрашивать только на «Купить» и «Хочу отчёт». Guard вешается на группу роутов, так что изменение сводится к переносу роута между группами.

### Вход по OTP

- Шаг 1: одно поле. Если ввод похож на телефон (цифры, `+`, пробелы, скобки), нормализуем в `+375XXXXXXXXX` (принимаем `80 29 …`, `29 …`, `+375 …`), иначе валидируем как email. В `send` уходит **ровно одно** поле. Канал запоминаем для `verify` (`SMS`/`EMAIL`) вместе с нормализованным `destination`: он должен совпасть символ в символ.
- Шаг 2: 6 цифр, `inputmode="numeric"`, `autocomplete="one-time-code"`. Автосабмит на 6-й цифре.
- Кнопка «Отправить ещё раз» активна через 60 с. Счётчик отправок ведём на клиенте (максимум 3 в час). `429 OTP_RATE_LIMIT_EXCEEDED` → «Слишком много попыток, попробуйте через час»: точное время бэк не сообщает.
- `OTP_INVALID` → «Неверный код», оставшиеся попытки считаем на клиенте (3 минус ошибки). `OTP_EXPIRED` → «Код истёк или исчерпаны попытки» и возврат на шаг 1 с сохранённым вводом.
- Про повторную отправку см. ⚠️ в справочнике (G-12).

### Возврат с bePaid и покупка в статусе `pending`

1. Перед редиректом сохраняем `sessionStorage['podbor.pendingPurchase'] = { purchaseId, reportId, carId, startedAt }`. Return URL пока не несёт `purchaseId` (G-7), и это единственный способ узнать, какую покупку ждать.
2. `/purchase/success`: читаем `purchaseId` из query (после G-7) или из `sessionStorage` → `useQuery(['purchases'], { refetchInterval: 2000 })`, ищем покупку по `id`:
   - `paid` → «Оплачено». Кнопка «Открыть отчёт» (после G-6) и текст «Ссылка также отправлена на email», если в JWT есть `email`, иначе предупреждение «email не указан»;
   - `failed` → «Оплата не прошла» + «Попробовать снова» (новый `POST /purchases` разрешён);
   - `pending`: polling с backoff 2 → 3 → 5 с, **максимум 2 минуты**, дальше экран «Платёж обрабатывается. Мы пришлём письмо, статус есть в „Моих покупках“». Опрос останавливается, когда вкладка скрыта (`refetchIntervalInBackground: false`).
3. `/purchase/fail` и `/purchase/cancel` показывают «Оплата не прошла / отменена». Бэк об отмене не знает, покупка останется `pending` → см. следующий пункт.
4. **Зависшая `pending`.** Если `POST /purchases` вернул `PURCHASE_ALREADY_EXISTS`, клиент делает `GET /purchases` и ищет покупку по `reportId`:
   - `paid` → «Вы уже купили этот отчёт» + «Открыть»;
   - `pending` → «Предыдущая оплата ещё не завершена. Если вы её отменили, повторить можно будет через час». Под капотом это reconcile через час, и работает он только после `@EnableScheduling`. После G-13 здесь появится кнопка «Продолжить оплату».
5. Двойной клик: кнопка «Оплатить» блокируется на время мутации (`isPending`), иначе гонка даёт `500`.

### Открытие отчёта по ссылке из письма

- `/reports/view?token=…` → `useQuery(['report-view', token], { staleTime: 50 * 60_000, retry: false для 404 })`.
- Сразу после загрузки убираем токен из адресной строки: `history.replaceState` на `/reports/view`, а токен держим в `sessionStorage`. Так он не попадёт в скриншоты и в `Referer`. На странице стоит `<meta name="referrer" content="no-referrer">`, потому что presigned-запросы к S3 иначе унесут URL с токеном в `Referer`.
- `404 ACCESS_TOKEN_INVALID` → экран «Ссылка недействительна или истекла (ссылки живут 30 дней)» + кнопка «Мои покупки» (после G-6 там можно открыть отчёт без письма).
- **Протухшие presigned URL.** Страница открыта дольше 60 минут → `onError` у `<img>`/`<video>` → однократный `refetch()` отчёта (новые URL), с дебаунсом, чтобы 30 картинок не вызвали 30 запросов. `staleTime` 50 минут, `refetchOnWindowFocus: true`: вернувшись во вкладку через час, пользователь получит свежие ссылки.
- Сейчас письмо ведёт на `app.base-url` = `http://localhost:8080/reports/view?token=…` (`PurchaseServiceImpl.java:257`, `application.yml:51`), то есть **на JSON API, а не на страницу фронта** (G-11). Роут фронта заложен с тем же путём, поэтому после G-11 достаточно поменять `base-url` → `frontend-url`.

### Состояния загрузки, пустые и ошибочные

| Экран | Загрузка | Пусто | Ошибка |
|---|---|---|---|
| Поиск | спиннер в кнопке, поле не блокируется | `404` → «Отчётов по этой машине ещё нет» + CTA «Хочу отчёт». Сейчас без `carId` это тупик (G-4) | «Не распознали VIN или ссылку» (клиентская валидация); сеть → «Повторить» |
| Машина + отчёты | skeleton карточки + 2 skeleton-строки | 0 отчётов → блок «Хочу отчёт» + «N человек уже ждут» (G-5) | 404 → «Машина не найдена» |
| Хочу отчёт | кнопка в `loading` | — | `BAD_REQUEST` → подсветка email |
| Вход | кнопка в `loading` | — | коды OTP (см. выше) |
| Checkout | skeleton | — | `REPORT_NOT_PUBLISHED` → «Отчёт больше недоступен», `BEPAID_REQUEST_FAILED` → «Платёжная система недоступна, попробуйте позже», `PURCHASE_ALREADY_EXISTS` → см. выше |
| Возврат bePaid | «Проверяем оплату…» с прогрессом | — | таймаут → «обрабатывается» |
| Мои покупки | skeleton списка | «Покупок пока нет» + поиск | общая |
| Отчёт | skeleton шапки и сетки секций; фото с `loading="lazy"` и placeholder | секция без пунктов → «Подборщик не оставил замечаний»; нет замеров ЛКП → блок скрыт; нет видео → блок скрыт | `ACCESS_TOKEN_INVALID` → «Ссылка недействительна»; битое медиа → плашка «Не удалось загрузить» + refetch |

Глобально: `ErrorBoundary` на уровне роутера (`errorElement`) плюс toast для ошибок мутаций. Офлайн-баннер по `navigator.onLine`.

## Пробелы бэкенда (пишет пользователь)

> **Сводный список всех бэкенд-доработок (покупатель + админка + Mini App + чек-лист) с общим порядком — `BACKEND_TODO.md`.** Здесь остаются подробные контракты для покупателя.

Приоритет: 🔴 блокирует сценарий А или Б end-to-end; 🟡 фронт обходит костылём; ⚪ улучшение.

| # | Пробел | Приоритет | Блокирует фичи |
|---|---|---|---|
| G-1 | Поиск и просмотр машины закрыты JWT | 🟡 | WEB-5, WEB-9 |
| G-2 | `GET /reports?carId=` | 🔴 | WEB-9 (без него до WEB-6 не дойти) |
| G-3 | Поиск по ссылке av.by | 🟡 | WEB-5 |
| G-4 | `GET /cars/{id}` и «Хочу отчёт» на машину, которой нет в базе | 🔴 (сценарий Б) | WEB-8, WEB-9 |
| G-5 | Счётчик ожидающих | ⚪ | WEB-8 |
| G-6 | Открытие отчёта из истории + обогащённый `GET /purchases` | 🔴 | WEB-7, WEB-10 |
| G-7 | Return URL bePaid → фронт, с `purchaseId` | 🔴 | WEB-6, WEB-7 |
| G-8 | springdoc | 🟡 | WEB-12 |
| G-9 | CORS (только при разных origin) | ⚪ | WEB-11 |
| G-10 | Шапка отчёта в `ReportViewDto` | 🟡 | WEB-4 |
| G-11 | Ссылки в письмах ведут на фронт | 🔴 | WEB-4, WEB-8 |
| G-12 | `verifyOtp` берёт случайный из живых кодов | 🟡 | WEB-3 |
| G-13 | Повтор или отмена зависшей `pending` | 🟡 | WEB-6 |
| G-14 | Logout, refresh TTL из конфига, `expiresIn` | ⚪ | WEB-3 |
| G-15 | SMS-покупатель не получает ссылку | 🟡 | WEB-6, WEB-7 |
| G-16 | `@EnableScheduling` | ✅ сделано (`Application.java:15`) | WEB-7 |
| G-17 | Предсказуемые 4xx вместо 500 | ⚪ | — |
| G-18 | Миниатюры фото и постеры видео → **`PLAN_MEDIA_THUMBNAILS.md`** | 🟡 | WEB-4, WEB-10 (без него отчёт на 30 фото весит 25–45 МБ) |

> Новые бэкенд-пункты по итогам `REVIEW_REPORT.md` — **B-90…B-97** в `BACKEND_TODO.md`.

### G-1. Публичный поиск машины 🟡

Сейчас `/cars/**` попадает под `anyRequest().authenticated()` (`SecurityConfig.java:70-75`), и гость не может даже узнать, есть ли отчёт. Это ломает воронку: вход раньше, чем пользователь увидел ценность.
**Контракт:** в default-chain добавить `.requestMatchers(HttpMethod.GET, "/cars/**", "/reports").permitAll()`. `POST /cars/{id}` остаётся под JWT. Нужен rate limit (`PLAN_FINAL_CHECKLIST.md` 3.7).

### G-2. `GET /reports?carId={uuid}` 🔴 (`PLAN_FINAL_CHECKLIST.md` 2.4)

Без него у покупателя нет легального способа узнать `reportId` для `POST /purchases`.
**Контракт:** 🔓 (после G-1), только `status='published' AND deleted_at IS NULL`, сортировка по дате публикации, от новых к старым. ⚠️ Колонки `published_at` в `reports` нет, есть только `created_at` (`V005`). Дата публикации — это время approve в `moderation_log` (`V008`), либо нужна миграция с колонкой `published_at`, которую проставляет `approve`. Второй вариант проще читать. `inspector.displayName` строится из `inspectors.full_name` (только имя, без фамилии и телефона), `companyName` — из `inspector_companies.name`. Контент отчёта не отдаётся:
```json
[
  {
    "id": "9d1e4b2a-...",
    "priceByn": 150000,
    "publishedAt": "2026-09-12T14:00:00+03:00",
    "inspector": { "displayName": "Иван", "companyName": null, "reportsCount": 12 },
    "summary": { "stopFactorsCount": 2, "badCount": 1, "warnCount": 5 },
    "purchased": false
  }
]
```
`purchased` заполняется, если запрос пришёл с JWT, чтобы вместо «Купить» показать «Открыть». `summary` — тизер, по которому пользователь решает о покупке. Если это спорно, на MVP его можно убрать. Новая DTO `ReportPreviewDto`, по аналогии с решением 1 из `PLAN_REPORT_VIEW.md`. Неизвестный `carId` → `200 []`.

### G-3. Поиск по ссылке av.by 🟡

Сейчас поиск только по точному VIN. Покупатель чаще копирует ссылку объявления.
**Контракт:** `GET /cars/search?q=<VIN | URL av.by>` (или отдельный параметр `url=`). Бэк нормализует ввод: VIN переводит в `upper` и `trim`, у URL отрезает query/fragment и приводит к каноническому виду `https://cars.av.by/.../<id>`. Ищет по `cars.vin` / `cars.avby_listing_url`. Ответ — `CarDto`, `404 CAR_NOT_FOUND` (сейчас приходит общий `NOT_FOUND`). Клиент тоже нормализует, но источником истины должен быть бэк: `avby_listing_url` сохраняется в том виде, в каком его вставил подборщик.

### G-4. `GET /cars/{id}` и заявка на неизвестную машину 🔴 (сценарий Б)

1. Страница `/cars/:carId` (ссылка из письма по сценарию Б, прямой заход, обновление страницы) не может получить машину по id: есть только поиск по VIN.
   **Контракт:** `GET /cars/{id}` → `CarDto`, `404 CAR_NOT_FOUND`.
2. В `cars` попадают только машины, по которым подборщик уже создал отчёт. Сценарий Б («отчёта нет → хочу отчёт») на новой машине упирается в `404` без `carId`, и оставить заявку некуда.
   **Контракт:** `POST /cars/resolve` 🔑 `{ "url": "https://cars.av.by/..." }` → `findOrCreateByUrl` (уже есть, `CarServiceImpl.java:26-59`, с парсингом av.by) → `CarDto`. Ошибки `CAR_LISTING_NOT_FOUND 404`, `PARSER_ERROR 502`. По VIN без ссылки машину создать нельзя (нечего парсить), поэтому UI просит ссылку.

### G-5. Счётчик ожидающих ⚪

**Контракт:** `waitingCount` (число `report_requests` по `car_id`) в ответе `GET /cars/{id}` / `GET /cars/search`. Ответ `POST /cars/{carId}` из голого `Long` превратить в объект `{ "requestId": 42, "waitingCount": 7, "alreadyRequested": true }`: сейчас по числу не понять, новая это заявка или повтор. Заодно обновлять email при повторной заявке (сейчас `DO NOTHING`).

### G-6. Открытие отчёта из истории покупок 🔴 (`PLAN_FINAL_CHECKLIST.md` 2.3, вариант «в»)

Сырой токен доступа существует только в письме. Покупатель без письма (SMS-вход, спам, прошло 30 дней) купленный отчёт не откроет.
**Контракт:**
- `GET /purchases/{id}/view` 🔑 → `ReportViewDto` (тот же маппинг, что в `ReportAccessServiceImpl`), только если `purchases.buyer_id = principal AND status='paid'` и отчёт не удалён. Ошибки: `PURCHASE_NOT_FOUND 404` (чужая или несуществующая покупка — не раскрываем, что она есть), `REPORT_NOT_FOUND 404` (отчёт удалён), `409 PURCHASE_NOT_PAID` (новый код). Логику из `getReportByToken` стоит вынести в общий метод `buildView(reportId)`.
- `GET /purchases/{id}` 🔑 → `PurchaseDto`, чтобы страница возврата не тянула весь список.
- Обогатить `PurchaseDto`, иначе «Мои покупки» показывают только сумму и UUID: `car { make, model, year, vin }`, `inspectorDisplayName`, `reportPublishedAt`.

### G-7. Return URL bePaid 🔴 (`PLAN_FINAL_CHECKLIST.md` 3.6)

`BePaidClient.java:27-31` хардкодит `http://localhost:8080/...`.
**Контракт:** в `AppProperties` добавить `frontendUrl` (и `apiPublicUrl` для вебхука). Тогда:
- `success_url = {frontendUrl}/purchase/success?purchaseId={id}`;
- `fail_url` и `decline_url` = `{frontendUrl}/purchase/fail?purchaseId={id}`;
- `cancel_url = {frontendUrl}/purchase/cancel?purchaseId={id}`;
- `notification_url = {apiPublicUrl}/webhooks/bepaid`.

`createCheckout` получает `purchaseId` уже сейчас, так что нужно только передать его в URL. Для локальной разработки: `frontendUrl=http://localhost:5173`, а вебхук принимать через туннель (cloudflared) или вручную дёргать `applySuccessfulPayment` в тестах.

### G-8. springdoc 🟡

В `build.gradle` нет `springdoc-openapi-starter-webmvc-ui`. **Контракт:** зависимость; `permitAll` для `/v3/api-docs/**` и `/swagger-ui/**` в default-chain (только в `local`-профиле или за basic-auth в prod). Для точных типов на фронте полезно: `@Schema(requiredMode = REQUIRED)` на обязательных полях DTO (иначе всё сгенерируется как `?:`), `@Schema(allowableValues = {"pending","paid","failed"})` на строковых статусах, `ProblemDetail` с `errorCode` описать как общий `@ApiResponse`. Security-схемы: `bearerAuth` (покупатель, админ), `apiKey` в заголовке `X-Telegram-Data` (Mini App).

### G-9. CORS ⚪

Нужен **только** если фронт и API на разных origin. **Контракт:** `http.cors(Customizer.withDefaults())` во всех трёх цепочках плюс бин `CorsConfigurationSource`. `allowedOrigins` берутся из конфига `app.cors.allowed-origins` (`PLAN_CONFIG_EXTRACTION.md`), методы `GET, POST, PUT, DELETE, OPTIONS`, заголовки `Authorization, Content-Type, X-Telegram-Data`, `allowCredentials=false`, пока нет cookie (G-14). `OPTIONS` должен проходить без авторизации: `http.cors()` это обеспечивает.

### G-10. Шапка отчёта в `ReportViewDto` 🟡

Сейчас есть только `carId` (`ReportViewDto.java`). Страница по ссылке из письма не может показать, *какая это машина*. Эндпоинта «машина по id» тоже нет (G-4), а после G-1 делать ради шапки два запроса неудобно.
**Контракт:** добавить в `ReportViewDto`:
```json
"car": { "make": "Volkswagen", "model": "Passat", "year": 2017, "vin": "WVWZZZ3CZHE123456", "avbyListingUrl": "https://cars.av.by/..." },
"inspector": { "displayName": "Иван", "companyName": null },
"inspectedAt": "2026-09-12",
"publishedAt": "2026-09-12T14:00:00+03:00"
```
Фронтовый тип `ReportHeader` (`packages/ui/src/report/types.ts`) уже ждёт эти данные: `carTitle`, `carSubtitle`, `inspectorName`, `inspectedAt`. Отдельной даты осмотра в схеме нет, как нет и `submitted_at`/`published_at` (в `reports` есть только `created_at`). На MVP `inspectedAt` = `reports.created_at` (подборщик создаёт отчёт на месте осмотра), а `publishedAt` берётся так же, как в G-2. Пробег (`142к км` в эскизе) av.by-парсер сейчас не извлекает (`CarParseData`): это ⚪.

### G-11. Ссылки в письмах ведут на фронт 🔴

1. `applySuccessfulPayment` строит `appProperties.baseUrl() + "/reports/view?token="` (`PurchaseServiceImpl.java:257`), а `app.base-url = http://localhost:8080`. Письмо ведёт на **JSON API**. Нужно `appProperties.frontendUrl() + "/reports/view?token=" + rawToken`. Путь совпадает с роутом фронта, дальше фронт сам зовёт `/api/reports/view`.
2. Письмо по сценарию Б (`ModerationServiceImpl.java:85-86`, «Ваш запрос на отчёт был одобрен») приходит без ссылки и с неверным текстом: одобряют отчёт, а не запрос. Нужно «Появился отчёт по {make} {model} {year}: {frontendUrl}/cars/{carId}».

Оба пункта закрываются одним `frontendUrl` из G-7.

### G-12. OTP: повторная отправка ломает проверку 🟡

`OtpService.java:62-68`: `WHERE destination = ? AND consumed_at IS NULL AND expires_at > now() LIMIT 1` без `ORDER BY` и без `channel`.
**Контракт:** в `sendOtp` помечать предыдущие живые коды этого `destination` потреблёнными (`consumed_at = now()`) перед вставкой нового, **или** в `verifyOtp` добавить `.orderBy(OTP_CODES.CREATED_AT.desc())` и фильтр по `channel`. Первый вариант лучше: он заодно не даёт перебирать по 3 попытки на каждый из трёх кодов. Опционально: отдавать `Retry-After` в `429` (из `window_start + 3600`), тогда фронт покажет точное время.

### G-13. Зависшая покупка `pending` 🟡

Сейчас повторить нельзя до reconcile (минимум час, и то только после G-16).
**Контракт (минимальный):** в `initiatePurchase`, если есть `pending` этого покупателя по этому отчёту, **вернуть существующий `redirectUrl`** (`https://checkout.bepaid.by/#/{bepaid_checkout_token}`) вместо `409`, при условии что checkout не старше TTL bePaid. Иначе перевести старую покупку в `failed` и создать новую. `409 PURCHASE_ALREADY_EXISTS` остаётся только для `paid`. Альтернатива — `POST /purchases/{id}/cancel`, но первый вариант проще и для фронта, и для пользователя.

### G-14. Logout, TTL refresh, `expiresIn` ⚪

- `POST /auth/logout` 🔓 `{ refreshToken }` → `revoked_at = now()`, `204` (`PLAN_FINAL_CHECKLIST.md` 4).
- `refreshTokenExpiration = 72` захардкожен (`JwtServiceImpl.java:36`), а `jwt.refresh-token-expiration: 43200` в yml игнорируется. Если 43200 — это минуты, в yml задумано 30 дней. Нужно читать из `JwtProperties` и договориться о единицах.
- `AuthResponse.expiresIn` содержит epoch истечения refresh (`JwtServiceImpl.java:57`). Ожидаемая семантика (OAuth) — TTL access в секундах: `accessExpiration * 60`. Фронт на это поле не опирается, но после генерации типов название будет вводить в заблуждение.
- Позже: refresh в httpOnly `Secure SameSite=Strict` cookie на `Path=/api/auth`, тогда токен из `localStorage` уходит, но нужен CORS с `allowCredentials` (G-9) или same-origin.
- **Обнаружение повторного использования refresh-токена** (S-12): если предъявлен уже отозванный refresh — отзывать все токены пользователя («выйти на всех устройствах»), а не только текущий. Бэкенд-пункт **B-93** в `BACKEND_TODO.md`.

### G-15. SMS-покупатель не получает ссылку 🟡 (`PLAN_FINAL_CHECKLIST.md` 2.3)

`applySuccessfulPayment` шлёт письмо только при `users.email != null` (`PurchaseServiceImpl.java:256`), а при входе по телефону email не сохраняется. G-6 решает доступ к отчёту. Для письма: необязательное поле `email` в `InitiatePurchaseRequest`, сохранять в `purchases.email` (или в `users.email`, если пусто) и слать на него. На фронте поле email в checkout показывается, если в JWT нет `email`.

### G-16. `@EnableScheduling` 🔴 (`PLAN_FINAL_CHECKLIST.md` 2.1)

Без него reconcile не работает. Покупатель, у которого вебхук не дошёл (а в dev он не дойдёт никогда, G-7), навсегда остаётся в `pending`, и polling на странице возврата не дождётся `paid`.

### G-17. Предсказуемые 4xx вместо 500 ⚪

- `POST /auth/otp/send` с пустым телом → `500`. Нужна проверка «ровно одно из двух», например `@AssertTrue` на record, → `400 BAD_REQUEST`.
- `POST /cars/{несуществующий id}` → FK → `500`. Нужно `404 CAR_NOT_FOUND`.
- Двойной `POST /purchases` → гонка на UNIQUE → `500`. Нужно ловить `DuplicateKeyException` → `409 PURCHASE_ALREADY_EXISTS`.
- `400` от Spring MVC (нет параметра, кривой UUID, битый JSON) приходят без `errorCode`. В `ValidationExceptionHandler` переопределить `handleExceptionInternal` и проставлять `errorCode: BAD_REQUEST` всем.
- `ACCESS_TOKEN_INVALID` имеет статус `404`. Это осознанное решение (не раскрывать существование токена), фронт его учитывает.

---

# Часть 3. Фичи `apps/web`

Каждая фича занимает 0,5–1 день. Порядок такой: сначала инфраструктура (WEB-1…3), потом фичи, для которых бэкенд уже готов (WEB-5…8), потом фичи, ждущие пробелов бэкенда (WEB-9…10), затем упаковка (WEB-11…12), и только в конце — экран отчёта (WEB-4), после отдельного обсуждения его дизайна, и подключение открытия отчёта в WEB-10. Точный порядок см. в «Сводке», пункт «Порядок работ покупателя». **Моки** делаются через MSW (`msw` + `apps/web/src/mocks/handlers.ts`), включаются через `VITE_MOCKS=1`. Хендлеры повторяют контракты из справочника и из пробелов, так что фичу, ждущую бэк, можно довести до конца и потом просто выключить мок.

Зависимости:
```
WEB-1 → WEB-2 → WEB-3 ─┬→ WEB-5 → WEB-9 (G-2,4) → WEB-10 без отчёта (G-6) → WEB-11 → WEB-12
                       ├→ WEB-6 → WEB-7
                       └→ WEB-8
WEB-2 → WEB-4 (публичный, без auth) — в конце, после обсуждения экрана отчёта → открытие отчёта в WEB-10
```

### WEB-1. Каркас приложения: роутер, лейаут, провайдеры (0,5 дня)

- **Цель:** скелет, в который встают все экраны.
- **Экраны:** лейаут с верхней панелью, заглушки всех роутов из карты экранов, 404, `errorElement`.
- **Эндпоинты:** —
- **Зависимости:** **DS-1** (выполнена заранее, самостоятельным нулевым шагом, `PLAN_FRONTEND_DESIGN.md` раздел 8); есть `apps/web` (Vite, MUI-тема, `ReportView` на моках).
- **Критерии приёмки:**
  - [ ] `react-router` (`createBrowserRouter`), все роуты из таблицы открываются по прямому URL (`vite preview` отдаёт `index.html` для любых путей);
  - [ ] `QueryClientProvider` (`retry: 2` для запросов, `0` для мутаций, `refetchOnWindowFocus` включён), `<Toaster />` из sonner;
  - [ ] из `apps/web` удалены MUI и emotion, подключены токены и shadcn-компоненты из `packages/ui` (DS-1 уже готова, здесь только переключение `apps/web` на неё);
  - [ ] группы роутов `public` / `requireAuth` / `guestOnly` уже заведены, guard'ы пока пропускают всех;
  - [ ] глобальный `errorElement` и офлайн-баннер;
  - [ ] текущая демо-страница `App.tsx` переехала на `/dev/report` (только в dev);
  - [ ] `npm run typecheck` и `npm run build` проходят.
- **На моках:** полностью.

### WEB-2. API-клиент, ошибки, моки (1 день)

- **Цель:** единая точка работы с API и таблица ошибок, чтобы дальше фичи писались только в UI.
- **Экраны:** —
- **Эндпоинты:** все из справочника (типы).
- **Зависимости:** WEB-1.
- **Критерии приёмки:**
  - [ ] `packages/api`: пока ручные типы `src/types.ts` (зеркала `AuthResponse`, `CarDto`, `PurchaseDto`, `InitiatePurchaseResponse`, `ReportViewDto` с комментарием-источником), `ProblemDetail` с `errorCode?`, `errors?`, и единый класс `ApiError { status, errorCode?, fieldErrors? }` с `parseApiError()` — разбор тела `ProblemDetail`, пустого тела (`sendError`) и не-JSON (`502` от nginx). Он один на `apps/web`, `apps/admin` и `apps/inspector` (R-2, не дублируем в каждом приложении). `ReportViewData` из `packages/ui` реэкспортируется оттуда, без дублирования;
  - [ ] `apps/web/src/api/client.ts`: `openapi-fetch` (или тонкий `fetch`-wrapper, пока нет схемы) с `baseUrl = VITE_API_URL ?? '/api'` и middleware-слотом под авторизацию;
  - [ ] `errorMessages.ts`: `errorCode → русский текст` для всех кодов из справочника покупателя плюс фолбэки по `status`. Хук `useApiErrorMessage(err)`. Это и авторизационный middleware — всё, что остаётся специфичным для `apps/web` (R-2);
  - [ ] `formatByn(kopecks)` → `"1 500 BYN"`, копейки только если они не нулевые (`"45,50 BYN"`), `Intl.NumberFormat('ru-BY')`; `formatDate` → «12 сент», год только если не текущий (`PLAN_FRONTEND_DESIGN.md`, раздел 6);
  - [ ] MSW: хендлеры для всех эндпоинтов справочника и контрактов G-2, G-4, G-6 со сценариями через query-флаг (`?mock=empty|error`);
  - [ ] unit-тесты (vitest) на разбор ошибок: ProblemDetail, пустой 401, валидационный 400 с `errors`.
- **На моках:** полностью.

### WEB-3. Авторизация: OTP, сессия, авто-refresh, guard'ы (1 день)

- **Цель:** покупатель входит по телефону или email и не вылетает при истечении access.
- **Экраны:** `/login?next=` (2 шага), кнопка «Войти/Выйти» в шапке.
- **Эндпоинты:** `POST /auth/otp/send`, `POST /auth/otp/verify`, `POST /auth/refresh`.
- **Зависимости:** WEB-2. Бэкенд готов. G-12 и G-14 не блокируют, их обходим на клиенте.
- **Критерии приёмки:**
  - [ ] нормализация телефона РБ (`80 29 123-45-67` → `+375291234567`), определение канала, в `send` уходит ровно одно поле;
  - [ ] `verify` с тем же `destination` и явным `channel`; автосабмит 6 цифр, `autocomplete="one-time-code"`;
  - [ ] таймер повторной отправки 60 с, клиентский лимит 3/час, тексты для `OTP_INVALID` / `OTP_EXPIRED` / `OTP_RATE_LIMIT_EXCEEDED`, подсказка про код из предыдущего сообщения (G-12);
  - [ ] access хранится в памяти, refresh — в `localStorage`, `exp` читается из JWT; `expiresIn` из ответа **не** используется;
  - [ ] middleware: превентивный refresh за 30 с до `exp`; 401 без `errorCode` → single-flight refresh → один повтор; `INVALID_REFRESH_TOKEN` → разлогин и `/login?next=`;
  - [ ] межвкладочный refresh под `navigator.locks` с перечитыванием `localStorage` и синхронизация через событие `storage` — **⏭ второй этап** (отложено по ревью); на MVP single-flight действует только в одной вкладке;
  - [ ] тест: 5 параллельных запросов **в одной вкладке** с протухшим access дают **ровно один** `POST /auth/refresh`;
  - [ ] guard'ы `requireAuth` / `guestOnly` работают, `next` принимается только как относительный путь;
  - [ ] выход чистит токены и `queryClient.clear()`.
- **На моках:** полностью (MSW выдаёт JWT с коротким `exp`, чтобы проверить refresh). Потом прогон на реальном бэке: OTP-код берётся из лога, потому что `NotificationSender` пока логирует.

### WEB-4. Отчёт по ссылке из письма `/reports/view?token=` (1 день)

- **Цель:** главный экран продукта на реальных данных.
- **Экраны:** `/reports/view`, экран «Ссылка недействительна».
- **Эндпоинты:** `GET /reports/view?token=`.
- **Зависимости:** WEB-2 (WEB-3 не нужна, экран публичный). Бэкенд: Блок 12 в рабочей копии, работает локально. Для полноценной шапки нужен G-10, для реального перехода из письма — G-11.
- **Критерии приёмки:**
  - [ ] `ReportView` из `packages/ui` получает данные из API; тип `ReportViewData` совпадает с ответом (проверить на реальном ответе локального бэка);
  - [ ] шапка: пока нет G-10 — «Отчёт об осмотре» без машины (или машина из `sessionStorage`, если пришли из своего же флоу), после G-10 — `car` и `inspector` из ответа;
  - [ ] токен убирается из адресной строки (`replaceState`) и хранится в `sessionStorage`; `<meta name="referrer" content="no-referrer">`;
  - [ ] медиа сортируются по `orderNo`; видео через `<video controls preload="metadata" playsinline>`; фото с `loading="lazy"`, открываются в полноэкранной галерее;
  - [ ] протухание presigned URL: ошибка загрузки медиа вызывает не больше одного `refetch()` за 30 с; `staleTime` 50 минут;
  - [ ] `404 ACCESS_TOKEN_INVALID` и отсутствие `token` показывают экран с CTA «Мои покупки»;
  - [ ] ручная проверка: купленный в `ReportAccessFlowTest`-подобном сценарии отчёт открывается локально по токену из лога.
- **На моках:** да, `apps/web/src/mocks/report.ts` уже есть, его подключаем к MSW-хендлеру.

### WEB-5. Главная и поиск по VIN (0,5 дня)

- **Цель:** покупатель находит машину.
- **Экраны:** `/`, `/search?q=`.
- **Эндпоинты:** `GET /cars/search?vin=`; после G-3 — `?q=`.
- **Зависимости:** WEB-3, потому что поиск сейчас под JWT (G-1). Бэкенд готов для VIN.
- **Критерии приёмки:**
  - [ ] одно поле ввода: VIN (`trim` + `toUpperCase` + `^[A-HJ-NPR-Z0-9]{17}$`) или ссылка `cars.av.by`. Пока нет G-3, ссылка даёт подсказку «Поиск по ссылке скоро, введите VIN»;
  - [ ] `q` хранится в URL, результат переживает обновление страницы и открывается по ссылке;
  - [ ] найдено → переход на `/cars/:carId` (данные машины передаются через кеш Query `['car', id]`, пока нет `GET /cars/{id}`);
  - [ ] `404` → «Отчётов пока нет» + CTA «Хочу отчёт». Без `carId` (G-4) CTA ведёт на форму со ссылкой av.by, на моках это `POST /cars/resolve`;
  - [ ] до G-1 гость сначала попадает на `/login?next=/search?q=…`. После G-1 роут переносится в `public`.
- **На моках:** полностью, включая G-3 и G-4.

### WEB-6. Checkout и редирект на bePaid (0,5 дня)

- **Цель:** покупатель оплачивает выбранный отчёт.
- **Экраны:** `/checkout/:reportId`.
- **Эндпоинты:** `POST /purchases`, `GET /purchases` (для разбора `PURCHASE_ALREADY_EXISTS`).
- **Зависимости:** WEB-3. Бэкенд готов, `reportId` для ручной проверки берём из БД, пока нет G-2. Для возврата на фронт нужен G-7, для предложения «продолжить оплату» — G-13, для поля email — G-15.
- **Критерии приёмки:**
  - [ ] подтверждение с ценой (`formatByn`), кнопка «Оплатить» заблокирована во время мутации;
  - [ ] перед редиректом `sessionStorage['podbor.pendingPurchase']` = `{ purchaseId, reportId, carId, startedAt }`, затем `location.assign(redirectUrl)`;
  - [ ] `PURCHASE_ALREADY_EXISTS` → поиск покупки в `GET /purchases` по `reportId`: `paid` → «Уже куплено» + «Открыть», `pending` → «Предыдущая оплата не завершена» (текст из раздела «Поведение»);
  - [ ] `REPORT_NOT_PUBLISHED`, `BEPAID_REQUEST_FAILED`, `500` показывают свои тексты, повтор разрешён;
  - [ ] если в JWT нет `email`, выводится предупреждение «ссылка придёт только в „Мои покупки“» (после G-15 — поле email).
- **На моках:** да, мок `redirectUrl` ведёт на локальную страницу `/dev/bepaid`, которая «оплачивает» и возвращает на `/purchase/success`.

### WEB-7. Возврат с bePaid и ожидание статуса (0,5 дня)

- **Цель:** покупатель видит результат оплаты, даже если вебхук запаздывает.
- **Экраны:** `/purchase/success`, `/purchase/fail`, `/purchase/cancel`.
- **Эндпоинты:** `GET /purchases` (polling); после G-6 — `GET /purchases/{id}`.
- **Зависимости:** WEB-6. Для e2e на реальном бэке нужны G-7 (return URL) и G-16 или ручной вебхук; иначе проверка идёт переходом на роут вручную.
- **Критерии приёмки:**
  - [ ] `purchaseId` берётся из query (после G-7) или из `sessionStorage`. Если нет ни того, ни другого — редирект на `/purchases`;
  - [ ] polling 2 → 3 → 5 с, максимум 2 минуты, на скрытой вкладке опрос на паузе;
  - [ ] `paid` → «Оплачено» + «Открыть отчёт» (после G-6, до него «Ссылка отправлена на email») + «Мои покупки»;
  - [ ] `failed` → «Не прошло» + «Попробовать снова» (на `/checkout/:reportId`);
  - [ ] таймаут → «Платёж обрабатывается», polling останавливается;
  - [ ] `fail` / `cancel` не опрашивают статус, объясняют, что повтор может быть недоступен до часа (G-13);
  - [ ] после `paid` запись `sessionStorage` удаляется, кеш `['purchases']` инвалидируется.
- **На моках:** да, MSW отдаёт `pending` N раз, потом `paid` или `failed`.

### WEB-8. «Хочу отчёт» (сценарий Б) (0,5 дня)

- **Цель:** покупатель оставляет заявку на машину без отчётов.
- **Экраны:** `/cars/:carId/request` (форма email → экран «Готово»).
- **Эндпоинты:** `POST /cars/{carId}`; после G-4 — `POST /cars/resolve`; G-5 — `waitingCount`.
- **Зависимости:** WEB-3. Бэкенд готов для машины, которая уже есть в базе (`carId` известен из поиска по VIN).
- **Критерии приёмки:**
  - [ ] email предзаполняется из JWT (`email`), валидация zod;
  - [ ] ответ — число (`requestId`); повторная заявка выглядит так же (идемпотентно), текст «Мы сообщим на email, когда появится отчёт»;
  - [ ] после G-5 выводится «N человек уже ждут»; до этого блок скрыт (не выдумываем цифру);
  - [ ] `BAD_REQUEST` подсвечивает email; `500` (несуществующий `carId`) → «Машина не найдена»;
  - [ ] пришёл по ссылке av.by без `carId` → на моках `POST /cars/resolve` → `carId` → заявка (после G-4 то же на реальном бэке).
- **На моках:** полностью.

### WEB-9. Страница машины со списком отчётов (1 день)

- **Цель:** покупатель видит отчёты по машине и выбирает один (центр сценария А).
- **Экраны:** `/cars/:carId`.
- **Эндпоинты:** `GET /cars/{id}` (G-4), `GET /reports?carId=` (G-2); `waitingCount` (G-5).
- **Зависимости:** WEB-5; бэкенд **G-2 обязателен**, G-4 желателен (без него страница работает только при переходе из поиска, по кешу), G-1 — чтобы открыть страницу без входа.
- **Критерии приёмки:**
  - [ ] карточка машины: марка, модель, год, VIN, ссылка на объявление av.by (`target="_blank" rel="noopener noreferrer"`);
  - [ ] список отчётов: подборщик (имя, компания), дата публикации, цена, тизер (`stopFactorsCount`, если его отдаст G-2), кнопка «Купить» → `/checkout/:reportId`, для `purchased: true` — «Открыть»;
  - [ ] 0 отчётов → блок «Хочу отчёт» (WEB-8) с `waitingCount`;
  - [ ] прямой заход по URL и обновление страницы работают (после G-4); до G-4 без кеша показывается «Найдите машину через поиск»;
  - [ ] skeleton, empty и error состояния по таблице из «Поведения».
- **На моках:** полностью по контрактам G-2 и G-4; переключение на реальный бэк сводится к выключению двух хендлеров.

### WEB-10. Мои покупки и отчёт из истории (1 день)

- **Цель:** доступ к купленному отчёту без письма (SMS-покупатели, потерянные письма, прошло 30 дней).
- **Экраны:** `/purchases`, `/purchases/:purchaseId/report`.
- **Эндпоинты:** `GET /purchases` (готов), `GET /purchases/{id}/view` (G-6), обогащённый `PurchaseDto` (G-6).
- **Зависимости:** WEB-3, WEB-4 (переиспользует экран отчёта); бэкенд **G-6**.
- **Критерии приёмки:**
  - [ ] список со статусами (`pending` — «Ожидает оплаты», `paid` — «Оплачено», `failed` — «Не прошла»), суммой и датой; до G-6 вместо машины показывается «Отчёт №…» (первые 8 символов `reportId`);
  - [ ] `paid` → «Открыть отчёт» → `/purchases/:id/report` → `ReportView` с тем же поведением медиа, что в WEB-4;
  - [ ] `failed` → «Купить снова» → `/checkout/:reportId`;
  - [ ] `pending` → подсказка из раздела «Поведение» (после G-13 — «Продолжить оплату»);
  - [ ] `PURCHASE_NOT_FOUND` / `REPORT_NOT_FOUND` показывают понятные тексты, «Отчёт удалён модератором» — отдельно;
  - [ ] пустой список → «Покупок пока нет» + поиск.
- **На моках:** полностью.

### WEB-11. Прод-сборка и раздача (0,5 дня)

- **Цель:** `apps/web` работает за nginx рядом с API.
- **Экраны:** —
- **Эндпоинты:** —
- **Зависимости:** WEB-1…WEB-3; от WEB-4 не зависит (C-1). Бэкенд: `frontendUrl` (G-7/G-11), `@EnableScheduling` (G-16). G-9 нужен только при разных origin.
- **Критерии приёмки:**
  - [ ] `nginx.conf`: `location /api/ { proxy_pass http://api:8080/; }`, SPA-фолбэк `try_files $uri /index.html`, кеш `assets/*` immutable, `index.html` без кеша;
  - [ ] заголовки: CSP (`default-src 'self'; img-src 'self' https://<s3-host> data:; media-src https://<s3-host>; connect-src 'self'; frame-ancestors 'none'`), `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`;
  - [ ] nginx `log_format` без query string для `/reports/view` и `/api/reports/view`, чтобы токен отчёта не попадал в логи — S-10;
  - [ ] сервис в `docker-compose.yml` (сборка через multi-stage Dockerfile; изменения `Dockerfile*` подтверждает пользователь);
  - [ ] `VITE_API_URL` пустой (same-origin); `mockServiceWorker.js` отсутствует в прод-сборке; сорс-мапы не публикуются на сайт, а загружаются только в Sentry — S-19.
- **На моках:** нет.

### WEB-12. Переход на сгенерированные типы (0,5 дня)

- **Цель:** фронт ломается на компиляции при изменении DTO. Если B-80 (springdoc) сделан до WEB-2 — WEB-12 не нужна, типы генерируются сразу в WEB-2 (R-1).
- **Экраны:** —
- **Эндпоинты:** все.
- **Зависимости:** бэкенд **G-8** (springdoc); WEB-2.
- **Критерии приёмки:**
  - [ ] `packages/api`: `npm run gen` (openapi-typescript) → `src/schema.d.ts` закоммичен; клиент `createClient<paths>()`;
  - [ ] ручные типы из `packages/api/src/types.ts` и `packages/ui/src/report/types.ts` заменены реэкспортом из схемы; строковые статусы (`pending|paid|failed`) остаются ручными union-типами, если их не описали через `@Schema(allowableValues)`;
  - [ ] `npm run typecheck` по всем workspace зелёный; в CI (когда появится) — проверка, что схема не устарела (`gen` + `git diff --exit-code`).
- **На моках:** —

### WEB-13. Юридические страницы и согласие (0,5 дня)

- **Цель:** выполнить условия bePaid для боевого магазина и закон РБ № 99-З о персданных.
- **Экраны:** `/legal/offer` (публичная оферта), `/legal/privacy` (политика обработки персданных), `/legal/refund` (возврат), `/contacts` (реквизиты, email поддержки). Ссылки в подвале главной и на checkout.
- **Критерии приёмки:**
  - [ ] тексты — статичный markdown в репозитории (готовит владелец бизнеса, фронт только выводит);
  - [ ] на шаге 1 входа — чекбокс согласия со ссылкой на политику, без него «Получить код» неактивна;
  - [ ] на checkout — строка «Нажимая „Оплатить“, вы принимаете условия оферты».

### WEB-14. Пример отчёта `/sample` (0,5 дня)

- **Цель:** показать ценность до оплаты.
- **Критерии приёмки:** публичная страница с `ReportView` на статичных данных (из `mocks/report.ts`, фото лежат в `public/sample/`), плашка «Это пример», CTA «Найти свою машину». Ссылка с главной и со страницы машины.

### WEB-15. Аналитика и мониторинг (0,5 дня)

- **Критерии приёмки:**
  - [ ] Яндекс.Метрика на старте — только просмотры страниц и ошибки; цели (`search`, `car_view`, `checkout_start`, `purchase_paid`, `report_open`, `request_created`) — **⏭ второй этап** (R, раздел 3 `REVIEW_REPORT.md`); токен отчёта и email в URL/параметры не попадают;
  - [ ] cookie-баннер (Метрика ставит cookie), до согласия счётчик не загружается;
  - [ ] Метрика **не грузится на `/reports/view`**, либо инициализируется только после `history.replaceState` (токен уже убран из URL) — S-10;
  - [ ] Sentry для JS с `release` = git sha, без PII; `beforeBreadcrumb`/`beforeSend` вырезают query-string из URL (особенно `token=`) перед отправкой — S-10;
  - [ ] CSP из WEB-11 дополнена доменами Метрики и Sentry, без `unsafe-inline`/`unsafe-eval`: сниппет Метрики подключается внешним файлом или через nonce — S-11.

### WEB-16. OG-метатеги и PWA (0,5 дня) — ⏭ второй этап

Отложено целиком по итогам ревью (раздел 3 `REVIEW_REPORT.md`), на MVP не делаем.

- **Критерии приёмки:**
  - [ ] `og:title`, `og:description`, `og:image` для главной (ссылку на сайт кидают в Telegram/Viber);
  - [ ] `/reports/view` — `noindex`, без OG-данных отчёта;
  - [ ] `manifest.webmanifest` + иконки, `theme-color` = `--background`: сайт можно добавить на домашний экран. Service worker не нужен.

---

## Сводка

- **Готово на бэке сейчас:** WEB-3 (auth), WEB-4 (Блок 12 локально), WEB-5 (поиск по VIN под JWT), WEB-6 (создание покупки), WEB-8 (заявка на известную машину). WEB-7 проверяется end-to-end только после G-7 и G-16.
- **Минимальный набор бэкенд-задач для сквозного сценария А:** G-2 → G-7 + G-11 (один `frontendUrl`) → G-16 → G-6. Для сценария Б: G-4 + G-11.
- **Порядок приложений** (решение 2026-09-29): DS-1 → **админка** (ADM-1…, `PLAN_FRONTEND_ADMIN.md`) → покупатель → Mini App.
- **Порядок работ покупателя** (пересмотрен 2026-09-29): WEB-1 → WEB-2 → WEB-3 → WEB-5 → WEB-6 → WEB-7 → WEB-8 → (бэкенд G-2, G-4, G-6, G-18) → WEB-9 → WEB-10 (без открытия отчёта) → WEB-11 → WEB-12 (как только будет G-8, её можно поднять выше) → **обсуждение экрана отчёта** → WEB-4 → открытие отчёта в WEB-10 → WEB-14. WEB-13 обязательна до подключения боевого bePaid; WEB-15, WEB-16 — в любой момент.
- **Экран отчёта** (вёрстка `ReportView`) обсуждается в самом конце, `PLAN_FRONTEND_DESIGN.md`, открытый вопрос 3. До этого `ReportView` не трогаем. Кнопки «Открыть отчёт» в WEB-7 и WEB-10 ведут на заглушку.
- **Режим работы:** одна задача за раз, после каждой — показ результата, следующая только по команде.
