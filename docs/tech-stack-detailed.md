# Технический стек — подробно

Маркетплейс автоотчётов · MVP · Беларусь

---

## Java — Spring Boot (основной бэкенд)

### Зависимости

```xml
<!-- Web + Security -->
spring-boot-starter-web
spring-boot-starter-security
spring-boot-starter-validation

<!-- База данных -->
jooq                        <!-- type-safe SQL, компилятор ловит ошибки запросов -->
flyway-core                 <!-- миграции БД -->
postgresql                  <!-- JDBC драйвер -->

<!-- JWT RS256 -->
jjwt-api
jjwt-impl
jjwt-jackson

<!-- Rate limiting -->
bucket4j-core               <!-- OTP anti-abuse, защита от SMS-бомбинга -->

<!-- S3 -->
aws-java-sdk-s3             <!-- presigned URL для hoster.by S3 -->

<!-- Парсинг -->
jsoup                       <!-- HTML парсер av.by -->

<!-- Утилиты -->
lombok

<!-- Тесты -->
spring-boot-starter-test
testcontainers-postgresql   <!-- реальная БД в тестах, не H2 -->
```

### Структура проекта

```
src/main/java/by/marketplace/
├── config/
│   ├── SecurityConfig.java        -- Spring Security, JWT фильтр, публичные эндпоинты
│   ├── JooqConfig.java            -- DSLContext бин
│   ├── S3Config.java              -- S3Presigner для hoster.by
│   └── RateLimitConfig.java       -- bucket4j бины (OTP, API)
│
├── auth/
│   ├── OtpService.java            -- генерация кода, отправка через UniSender, верификация
│   ├── OtpRateLimiter.java        -- max 3 отправки/час на номер (bucket4j + БД)
│   ├── JwtService.java            -- issue/validate access + refresh токенов (RS256)
│   └── AuthController.java        -- POST /auth/otp/send, /auth/otp/verify, /auth/refresh
│
├── inspector/
│   ├── InspectorService.java
│   ├── TelegramAuthFilter.java    -- HMAC-SHA256 верификация X-Telegram-Data заголовка
│   └── InspectorController.java
│
├── report/
│   ├── ReportService.java         -- создание, редактирование, блокировка после продажи
│   ├── ReportController.java
│   ├── MediaService.java          -- presigned URL + confirm + orphan cleanup
│   └── ModerationService.java     -- approve / reject / request_revision
│
├── car/
│   ├── CarService.java
│   ├── CarController.java         -- GET /cars?vin=... или ?url=...
│   └── AvByParser.java            -- Jsoup парсинг av.by
│
├── purchase/
│   ├── PurchaseService.java       -- создание покупки, выдача access token
│   ├── BePaidWebhookController.java  -- POST /webhooks/bepaid
│   ├── BePaidReconcileService.java   -- ручная сверка статуса при зависшем платеже
│   └── PayoutService.java         -- начисление подборщику после оплаты
│
├── notification/
│   └── NotificationService.java   -- UniSender email/SMS
│
└── shared/
    ├── IdempotencyService.java    -- защита от дублей вебхуков bePaid
    └── exception/                 -- GlobalExceptionHandler, единый error envelope
```

### Авторизация

```
Покупатель:
  POST /auth/otp/send     — без токена, rate limit: 3 SMS/час на номер
  POST /auth/otp/verify   — без токена → access token (15 мин) + refresh token (30 дней)
  GET  /cars/**           — Bearer access token
  POST /purchases/**      — Bearer access token

Подборщик:
  X-Telegram-Data header — HMAC-SHA256, верифицируется TelegramAuthFilter

Администратор:
  POST /admin/auth/login  — email + пароль + TOTP → отдельный JWT
```

### Загрузка файлов — presigned URL (следует изучить как это работает)

Бэкенд не перегружается трафиком файлов — клиент льёт напрямую в S3.

```
1. Клиент  →  POST /media/presigned-url  →  Spring Boot
              { report_id, section_id, filename, content_type }

2. Spring Boot генерирует presigned PUT URL (TTL 60 мин)
   →  { upload_url, s3_key }  →  Клиент

3. Клиент  →  PUT {upload_url}  →  hoster.by S3 напрямую

4. Клиент  →  POST /media/confirm  →  Spring Boot
              { s3_key }
   Spring Boot делает HEAD на объект (валидация размера/типа)
   →  INSERT в report_media

Cleanup: cron раз в час удаляет объекты в S3 старше 24ч без записи в report_media (orphan-файлы)
```

### ffmpeg воркер — очередь через SKIP LOCKED (следует изучить как это работает)

Никакого RabbitMQ/Kafka. PostgreSQL как очередь — достаточно для MVP.

```java
// Воркер поллит каждые 5 сек
UPDATE report_media
SET status = 'processing', worker_id = ?, started_at = now()
WHERE id = (
  SELECT id FROM report_media
  WHERE status = 'pending' AND kind = 'video'
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1
) RETURNING *;

// После обработки
UPDATE report_media SET status = 'ready' WHERE id = ?;
POST http://api:8080/internal/media/{id}/processed  -- бот уведомляет подборщика
```

Cron раз в 15 мин: `status = 'processing' AND started_at < now() - interval '15 min'` → сброс в `pending` (защита от
упавшего воркера).

### Rate limiting — bucket4j

```java
// OTP: max 3 отправки в час на destination (номер / email)
Bandwidth otpLimit = Bandwidth.classic(3, Refill.intervally(3, Duration.ofHours(1)));

// API: общий лимит на IP (защита от перебора)
Bandwidth apiLimit = Bandwidth.classic(60, Refill.greedy(60, Duration.ofMinutes(1)));
```

Состояние bucket хранится в `otp_rate_limits` таблице (не Redis — меньше инфраструктуры).

### Парсинг av.by (возможно ли ?)

```
Подборщик вставляет ссылку av.by
→ AvByParser.parse(url)
→ Jsoup.connect(url).get()
→ извлекает: VIN, марка, модель, год, пробег, цена
→ уникальный поиск по VIN или avby_listing_url в cars
→ создаёт / возвращает car_id
```

Playwright подключается только если av.by перейдёт на JS-рендеринг. Сейчас Jsoup достаточно.

---

## Мобильное приложение — React Native + Expo (кратко)

- **EAS Build** — сборка в облаке без Xcode / Android Studio
- **EAS Update** — OTA-обновления без релиза в сторы (хотфиксы без ревью)
- **Expo SecureStore** — JWT токены в Keychain/Keystore
- **Expo AV** — HLS видеоплеер для просмотра отчёта
- **bePaid** — WebView, открывает страницу оплаты внутри приложения
- Фото/видео до загрузки конвертировать из HEIC/HEVC → JPEG/MP4 на клиенте (iPhone формат)

---

## Telegram бот — Python + aiogram 3 (кратко)

Выбран за встроенный FSM. Kotlin-альтернатива возможна (один runtime с API), но aiogram зрелее.

```
State.IDLE → /new_report
State.WAITING_URL → парсинг av.by → открыть Web App
State.IN_WEBAPP → подборщик заполняет чеклист, загружает медиа
State.DONE → подтверждение + уведомление когда видео обработано
```

Бот общается с API через внутренний Docker network (`http://api:8080`).

---

## Инфраструктура — hoster.by VPS (нужно рассчитать что и сколько мне надо ??)

**Обязательно:** данные физически в Беларуси — закон РБ о персональных данных.

### Docker Compose

```yaml
services:
  api: # Spring Boot, memory limit 700MB
  bot: # Python aiogram
  ffmpeg-worker: # видео pipeline, CPU limit 1.5 cores
  postgres: # PostgreSQL 16
  nginx: # reverse proxy + SSL (Let's Encrypt)
```

Все сервисы с `memory` лимитами — без них один сервис роняет весь VPS при OOM.

### S3 структура бакета

```
reports/{report_id}/sections/{section_id}/{filename}  -- фото секций
reports/{report_id}/mandatory/{type}/{filename}       -- одометр, VIN, подборщик, документы
reports/{report_id}/video/{filename}                  -- оригинал видео
reports/{report_id}/video/hls/                        -- HLS после ffmpeg
inspectors/{inspector_id}/photo/{filename}
companies/{company_id}/logo/{filename}
```

### Бэкапы — pgBackRest

```
Полный бэкап:    раз в неделю
Инкрементальный: каждый день
WAL архивирование: непрерывно (Point-in-Time Recovery)
Хранение: отдельный S3 бакет, retention 30 дней
```

### Переменные окружения

```bash
DB_URL=jdbc:postgresql://postgres:5432/marketplace
DB_USER=...
DB_PASSWORD=...
JWT_PRIVATE_KEY=...        # RS256 приватный ключ
JWT_PUBLIC_KEY=...         # RS256 публичный ключ
S3_ENDPOINT=https://s3.hoster.by
S3_BUCKET=marketplace-media
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
UNISENDER_API_KEY=...
BEPAID_SHOP_ID=...
BEPAID_SECRET_KEY=...
BEPAID_WEBHOOK_SECRET=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_SECRET=...    # HMAC-SHA256 верификация
SENTRY_DSN=...
```

---
