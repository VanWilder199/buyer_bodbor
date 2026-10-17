# Block 12 — просмотр отчёта покупателем по токену

## Контекст

Блок 9 (`PLAN_BEPAID.md`) реализован и покрыт тестами (`PurchaseFlowTest`, 6 сценариев). После успешного вебхука `PurchaseServiceImpl.applySuccessfulPayment(...)` уже создаёт `report_access_tokens` (`createAccessToken(purchaseId)`), но потребителя этого токена в системе до сих пор нет.

Из `IMPLEMENTATION_PLAN.md` (Блок 12):
- `purchase/ReportAccessService.java`: `getReportByToken(token)` — SHA-256 хэш → поиск в `report_access_tokens` → проверка `expires_at > now()` и `revoked_at IS NULL` → полный граф через `ReportService.getReport(...)`; `generateViewUrl(s3Key)` — presigned GET URL, TTL 1 час.
- В `PurchaseController.java` добавить `GET /reports/view?token=...` — публичный, `ReportDto` с presigned GET URL для каждого медиафайла.

**Найденный по ходу разбора реального кода баг, который этот блок обязан закрыть** (иначе Блок 12 реализует эндпоинт, на который в принципе невозможно попасть): `PurchaseServiceImpl.applySuccessfulPayment` (`PurchaseServiceImpl.java:200-219`) генерирует `rawToken` в приватном `createAccessToken(purchaseId)`, хэширует и сохраняет — но сам `rawToken` никуда не возвращается и не попадает в уведомление покупателю. Текст уведомления сейчас буквально:
```java
notificationSender.notify(Channel.EMAIL, email, "ссылку и текст добавим позже");
```
Это TODO-заглушка самого автора кода Блока 9 — "добавим позже" означает именно этот блок. Без исправления покупатель после оплаты не получает вообще никакой ссылки на отчёт, и `report_access_tokens.token_hash` — хэш от значения, которое никто никогда не узнает. Исправление входит в этот план (решение №4).

---

## Гочи, найденные при разборе текущего кода

1. **`IMPLEMENTATION_PLAN.md` предлагает добавить `GET /reports/view` в `PurchaseController.java` — не скомпилируется, как задумано.** У класса `@RequestMapping("/purchases")` (`PurchaseController.java:17`) — метод с `@GetMapping("/view")` внутри этого класса получит путь `/purchases/view`, не `/reports/view`. Та же природа проблемы, что уже зафиксирована в `PLAN_ADMIN_PANEL.md` (Блок 11, гоча №1) с `InspectorController`.
   **Решение:** новый класс `purchase/controller/ReportAccessController.java`, `@RequestMapping("/reports")`.
2. **`report_access_tokens.purchase_id` в реальной миграции называется `purchases_id`** (`V009__create_commerce_tables.sql`, множественное число, вероятно опечатка при написании миграции в Блоке 9) — jOOQ-поле, соответственно, `REPORT_ACCESS_TOKENS.PURCHASES_ID`, не `PURCHASE_ID`. Уже используется в таком виде в `PurchaseServiceImpl`/`PurchaseFlowTest` — переименовывать в рамках этого блока не нужно (не входит в задачу, ломать рабочий код Блока 9 без причины не стоит), просто **не удивляться** при написании нового кода.
3. **`ReportService.getReport(reportId, inspectorId)` — не подходит для этого блока напрямую.** Он проверяет владение (`requireOwnedReport`: `report.getInspectorId().equals(inspectorId)`, иначе `REPORT_ACCESS_DENIED`) — у покупателя нет `inspectorId`, это в принципе другой субъект. Зато `ReportService.getReportForModeration(reportId)` (уже существует, используется `ModerationServiceImpl.getReportDetail`) — берёт отчёт по чистому `id`, без проверки владельца, ровно то, что нужно: полный граф по факту существования записи.
4. **`getReportForModeration` не фильтрует `deleted_at`** (в отличие от `requireOwnedReport`, у которого `.and(REPORTS.DELETED_AT.isNull())`) — и не отдаёт `deletedAt` наружу в `ReportDto` вообще (поля `id/carId/inspectorId/versionNo/status/priceByn/conclusionText/stopFactors/sections/paintMeasurements/globalMedia` — `deletedAt` среди них нет). Для админа это нормально (у него есть право видеть удалённый отчёт при разборе истории модерации), но для покупателя открытым текстом отдавать удалённый (например, за мошенничество) отчёт по старой ссылке — нет. Разбирается в решении №5.
5. **`app.base-url` уже прописан в `application.yml`/`application-local.yml`** (`http://localhost:8080`, добавлен ещё в Блоке 9 по `PLAN_BEPAID.md`, решение №12) — но нигде не читается: ни `AppProperties`-класса, ни `@Value("${app.base-url}")` в коде нет (`BePaidClient.createCheckout` вместо этого хардкодит `"http://localhost:8080/purchase/..."` прямо в теле метода). В этом блоке заводим `AppProperties` и используем его для реальной ссылки на отчёт (решение №4) — `BePaidClient`-хардкод не трогаем, это дефект Блока 9, не по теме этого блока (не тянем за собой чужой рефакторинг).
6. **Presigned GET URL — тот же `S3Presigner`, что уже есть бином в `S3Config`** (`S3Config.java:29`, AWS SDK v2, `software.amazon.awssdk.services.s3.presigner.S3Presigner`), и тот же `s3.presigned-url-ttl-minutes: 60` (`application.yml:31`), что уже используется для presigned PUT в `MediaServiceImpl.generatePresignateUrl`. Ничего нового в конфиге не нужно — просто `s3Presigner.presignGetObject(...)` вместо `presignPutObject(...)`. У тестов уже поднят реальный MinIO-контейнер (см. `ModerationFlowTest`, фикстура `uploadAndConfirmVideo()` — "пресайнд + PUT в MinIO"), так что presigned GET можно тестировать без моков.
7. **`s3.*`-конфиг проекта заточен под "универсальный S3", но может не совпадать с реальной схемой hoster.by — сверить до прода.** Текущие значения (`application.yml`): `endpoint: https://s3.hoster.by`, `region: us-east-1`, path-style (`forcePathStyle(true)` / `pathStyleAccessEnabled(true)` в `S3Config`). По публичным гайдам hoster.by (s3cmd-инструкция, страница "Какие API-методы поддерживает объектное хранилище S3") картина другая:
   - endpoint в их примерах — `storage-1.s3hoster.by` (не `s3.hoster.by`);
   - шаблон доступа к бакету — `%(bucket)s.storage-1.s3.hoster.by`, т.е. **virtual-hosted style** (бакет в поддомене), а не path-style;
   - регион — `US`, с прямым предупреждением, что другие значения региона "могут привести к ошибке авторизации";
   - поддерживаются AWS Signature **V2 и V4** — значит SigV4-presigned GET принципиально должен работать, но конкретные endpoint/region/path-style своего тарифа надо сверить с панелью/саппортом hoster.by (их help-страницы рендерятся на JS, значения подтверждены только через выжимки поисковика — не как первоисточник).
   Код `generateViewUrl` от этого не меняется: пресайнер берёт endpoint/style/креды из `S3Config`-бина, правки затрагивают только значения свойств в `application.yml` (и, при необходимости, `forcePathStyle`/`pathStyleAccessEnabled`). Критично: зелёный тест на MinIO (path-style) доказывает **механику** presigned GET, но **не** то, что этот конфиг подойдёт hoster.by — это отдельная проверка (см. раздел "Проверка против реального hoster.by").

---

## Зафиксированные решения

1. **`ReportAccessService` возвращает не `ReportDto`, а новый `ReportViewDto`** (не буквально то, что просит `IMPLEMENTATION_PLAN.md`, но `ReportDto`/`ReportSectionDto`/`ReportMediaDto` — record'ы, их поля неизменяемы; "подменить `s3Key` на presigned URL" технически означает собрать новые объекты, а не мутировать старые). Раз собираем новые объекты — заодно убираем из публичного ответа то, что покупателю не нужно и не должно быть видно: `inspectorId` (внутренний идентификатор подборщика) и `status` (для покупателя видимый отчёт всегда по факту `published`, значение статуса ему не нужно). Тот же принцип, что уже применён в кодовой базе — у каждой аудитории своя DTO-форма одних и тех же данных (`ModerationQueueItemDto` vs `AdminReportDetailDto` vs `ReportDto` — разные проекции отчёта для разных читателей).
2. **`ReportMediaViewDto.url` — новое имя поля вместо `s3Key`.** Явно other field name (не переиспользуем `s3Key` под presigned URL) — чтобы на уровне типов было видно, что это два разных по смыслу значения, а не думать при чтении кода "почему в `s3Key` лежит `https://...`".
3. **Один SQL-запрос на всю проверку токена** (JOIN `report_access_tokens` → `purchases` → `reports`), а не 2-3 последовательных — сразу вытаскиваем `expires_at`, `revoked_at` и `reports.deleted_at` одним `SELECT`. Все три условия ("не найден" / "истёк" / "отозван" / "отчёт удалён") сворачиваются в один и тот же `ErrorCode.ACCESS_TOKEN_INVALID` — покупателю всё равно, почему ссылка не работает, а раскрывать причину (например, "эта ссылка отозвана" vs "такой ссылки не было") — лишняя информация об внутреннем состоянии наружу.
4. **Исправление бага в `PurchaseServiceImpl` — обязательная часть этого блока.** `createAccessToken` перестаёт быть `void`, возвращает `rawToken`; `applySuccessfulPayment` строит `appProperties.baseUrl() + "/reports/view?token=" + rawToken` и подставляет в текст уведомления вместо `"ссылку и текст добавим позже"`. Без этого шага весь остальной блок реализует эндпоинт, до которого просто нет доступа никаким легальным путём.
5. **Удалённый (`deleted_at IS NOT NULL`) отчёт — токен считается недействительным**, даже если формально не просрочен и не отозван (гоча №4). Логика: если админ удалил отчёт (мошенничество, жалоба и т.п.) уже после того, как его купили, показывать его по старой ссылке дальше — противоречит смыслу удаления. Отдельного `ErrorCode` под этот случай не заводим (решение №3) — тот же `ACCESS_TOKEN_INVALID`.
6. **`report_access_tokens.revoked_at` — колонка существует в схеме с Блока 9, но в этом блоке ничто её не проставляет.** Ни отзыв токена вручную, ни автоматический отзыв старого токена при повторной продаже — не требуется `IMPLEMENTATION_PLAN.md` и не входит в Блок 12 (there's no сценария повторной продажи одного отчёта — `purchases_report_id_buyer_id_idx` не даёт купить второй раз при активной покупке). Проверка `revoked_at IS NULL` в этом блоке — просто соблюдение контракта, заложенного схемой Блока 9, на будущее (когда/если появится админский "отозвать ссылку").

---

## Новый `ErrorCode`

| Код | HTTP | Когда |
|---|---|---|
| `ACCESS_TOKEN_INVALID` | 404 | токен не найден / просрочен (`expires_at <= now()`) / отозван (`revoked_at IS NOT NULL`) / отчёт удалён (`reports.deleted_at IS NOT NULL`) |

---

## Конфиг — `config/AppProperties.java` (новый)

```java
@ConfigurationProperties(prefix = "app")
public record AppProperties(String baseUrl) {}
```
Зарегистрировать в `Application.java`:
```java
@EnableConfigurationProperties({
        TelegramProperties.class,
        S3Properties.class,
        BePaidProperties.class,
        AppProperties.class   // новое
})
```
`application.yml`/`application-local.yml` — правок не требуют, `app.base-url` там уже есть (Блок 9).

---

## DTO (`purchase/dto/`) — новые

```java
public record ReportViewDto(
        UUID id,
        UUID carId,
        Long priceByn,
        String conclusionText,
        List<String> stopFactors,
        List<ReportSectionViewDto> sections,
        List<PaintMeasurementDto> paintMeasurements,   // переиспользуем как есть — там нет s3Key
        List<ReportMediaViewDto> globalMedia
) {}

public record ReportSectionViewDto(
        UUID id,
        String sectionKey,
        int orderNo,
        String summary,
        List<SectionItemDto> items,                     // переиспользуем как есть
        List<ReportMediaViewDto> media
) {}

public record ReportMediaViewDto(UUID id, String kind, String url, String status, int orderNo) {}
```
`PaintMeasurementDto`/`SectionItemDto` — существующие DTO из `car/dto/`, импортируются как есть, в них нет медиа-полей, трогать/дублировать не нужно.

---

## `purchase/service/ReportAccessService.java` — новый

```java
public interface ReportAccessService {
    ReportViewDto getReportByToken(String rawToken);
}
```

### `ReportAccessServiceImpl`

```java
@Service
public class ReportAccessServiceImpl implements ReportAccessService {

    private final DSLContext dslContext;
    private final ReportService reportService;
    private final S3Presigner s3Presigner;
    private final S3Properties s3Properties;

    // конструктор — стандартный, 4 поля

    @Override
    public ReportViewDto getReportByToken(String rawToken) {
        String tokenHash = HexFormat.of().formatHex(sha256(rawToken));

        Record row = dslContext.select(
                        REPORT_ACCESS_TOKENS.EXPIRES_AT,
                        REPORT_ACCESS_TOKENS.REVOKED_AT,
                        PURCHASES.REPORT_ID,
                        REPORTS.DELETED_AT)
                .from(REPORT_ACCESS_TOKENS)
                .join(PURCHASES).on(PURCHASES.ID.eq(REPORT_ACCESS_TOKENS.PURCHASES_ID))
                .join(REPORTS).on(REPORTS.ID.eq(PURCHASES.REPORT_ID))
                .where(REPORT_ACCESS_TOKENS.TOKEN_HASH.eq(tokenHash))
                .fetchOne();

        if (row == null
                || row.get(REPORT_ACCESS_TOKENS.REVOKED_AT) != null
                || row.get(REPORT_ACCESS_TOKENS.EXPIRES_AT).isBefore(OffsetDateTime.now())
                || row.get(REPORTS.DELETED_AT) != null) {
            throw new AppException(ErrorCode.ACCESS_TOKEN_INVALID);
        }

        UUID reportId = row.get(PURCHASES.REPORT_ID);
        ReportDto report = reportService.getReportForModeration(reportId);

        return toViewDto(report);
    }

    private ReportViewDto toViewDto(ReportDto report) {
        return new ReportViewDto(
                report.id(), report.carId(), report.priceByn(), report.conclusionText(),
                report.stopFactors(),
                report.sections().stream().map(this::toSectionViewDto).toList(),
                report.paintMeasurements(),
                report.globalMedia().stream().map(this::toMediaViewDto).toList());
    }

    private ReportSectionViewDto toSectionViewDto(ReportSectionDto section) {
        return new ReportSectionViewDto(
                section.id(), section.sectionKey(), section.orderNo(), section.summary(),
                section.items(),
                section.media().stream().map(this::toMediaViewDto).toList());
    }

    private ReportMediaViewDto toMediaViewDto(ReportMediaDto media) {
        return new ReportMediaViewDto(
                media.id(), media.kind(), generateViewUrl(media.s3Key()), media.status(), media.orderNo());
    }

    private String generateViewUrl(String s3Key) {
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(s3Properties.presignedUrlTtlMinutes()))
                .getObjectRequest(b -> b.bucket(s3Properties.bucket()).key(s3Key))
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }
}
```
Импорты: `software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest` (аналог `PutObjectPresignRequest`, уже используемого в `MediaServiceImpl`), `java.time.Duration`, `java.util.HexFormat`, статический `org.apache.commons.codec.digest.DigestUtils.sha256` (та же пара, что уже в `PurchaseServiceImpl`).

---

## Правка `purchase/service/impl/PurchaseServiceImpl.java` (решение №4)

```java
private String createAccessToken(UUID purchaseId) {           // было void
    String rawToken = randomToken();

    dslContext.insertInto(REPORT_ACCESS_TOKENS)
            .set(REPORT_ACCESS_TOKENS.PURCHASES_ID, purchaseId)
            .set(REPORT_ACCESS_TOKENS.TOKEN_HASH, HexFormat.of().formatHex(sha256(rawToken)))
            .set(REPORT_ACCESS_TOKENS.EXPIRES_AT, OffsetDateTime.now().plusDays(30))
            .execute();

    return rawToken;
}
```
И в `applySuccessfulPayment(...)`:
```java
String rawToken = createAccessToken(purchase.getId());

String email = dslContext.select(USERS.EMAIL)
        .from(USERS)
        .where(USERS.ID.eq(purchase.getBuyerId()))
        .fetchOne(USERS.EMAIL);

if (email != null) {
    String viewUrl = appProperties.baseUrl() + "/reports/view?token=" + rawToken;
    notificationSender.notify(Channel.EMAIL, email,
            "Оплата прошла успешно! Ссылка на отчёт: " + viewUrl);
}
```
Новая зависимость конструктора `PurchaseServiceImpl` — `AppProperties appProperties`.

---

## `purchase/controller/ReportAccessController.java` — новый класс

```java
@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
public class ReportAccessController {

    private final ReportAccessService reportAccessService;

    @GetMapping("/view")
    public ResponseEntity<ReportViewDto> view(@RequestParam String token) {
        return ResponseEntity.ok(reportAccessService.getReportByToken(token));
    }
}
```

---

## `config/SecurityConfig.java` — одна правка

В `defaultChain` добавить перед `.anyRequest().authenticated()` (рядом с уже существующим `/webhooks/**`):
```java
.requestMatchers("/reports/view").permitAll()
```
Маршрут публичный по смыслу — доступ к отчёту контролируется самим токеном (в URL), а не JWT покупателя (у покупателя с телефона может не быть сохранённой сессии/токена спустя 30 дней — ссылка должна работать сама по себе, как обычная "магическая ссылка" из письма).

---

## Тесты

Новый `src/test/java/by/marketplace/purchase/ReportAccessFlowTest.java extends AbstractIntegrationTest`, фикстуры (`insertInspector`/`insertReport`/`insertBuyer`) — тот же копипаст, что уже в `PurchaseFlowTest`, либо вынести в общий `utils/ReportFixtures` (тот же незакрытый TODO, что уже отмечен "по вкусу" в `PLAN_BEPAID.md`, тесты).

Ключевой момент тестируемости: единственное место, где `rawToken` существует в открытом виде — текст уведомления (`TestNotificationSender.getMessages()`, формат `"email: текст"`; в БД — только SHA-256 хэш). Тест должен вытащить токен из текста уведомления регэкспом на `token=(\S+)$`, ровно как это делал бы настоящий покупатель, кликая по ссылке из письма.

Сценарии:
- Полный путь: `insertReport(..., PUBLISHED)` → `insertPurchase(..., "pending", "fake-token")` → `POST /webhooks/bepaid` с `status=successful` (как в `PurchaseFlowTest.handleWebhook_successful_...`) → достать `rawToken` из `testNotificationSender.getMessages()` → `GET /reports/view?token={rawToken}` без `Authorization` → `200`, тело — `ReportViewDto` с `id`/`carId` отчёта; если у отчёта есть `report_media` (загрузить как в `ModerationFlowTest.uploadAndConfirmVideo()`) — `globalMedia[0].url()` не равен исходному `s3Key`, начинается с `s3Properties.endpoint()`/содержит query-подпись (`X-Amz-Signature` или аналог MinIO).
- `GET /reports/view?token=incorrect-token` → `404 ACCESS_TOKEN_INVALID`.
- Токен с `expires_at` в прошлом (создать напрямую через `DSLContext.insertInto(REPORT_ACCESS_TOKENS)...` с `EXPIRES_AT = now().minusDays(1)`, зная сырой токен заранее, т.к. сам тест его генерирует) → `404 ACCESS_TOKEN_INVALID`.
- Токен с `revoked_at` не `null` → `404 ACCESS_TOKEN_INVALID`.
- Отчёт удалён после покупки (`UPDATE reports SET deleted_at = now()` напрямую, либо через уже существующий `POST /admin/reports/{id}/delete` из `ModerationFlowTest`) → тот же валидный (не просроченный, не отозванный) токен → `404 ACCESS_TOKEN_INVALID`.
- Регрессия на баг из "Контекста": после успешного вебхука `testNotificationSender.getMessages()` содержит строку с `"/reports/view?token="` (а не старую заглушку `"ссылку и текст добавим позже"`) — это одновременно проверка бага и единственный способ добыть `rawToken` для остальных тестов сверху.

---

## Проверка против реального hoster.by (вне юнит-тестов)

Гоча №7: MinIO-тест доказывает механику presigned GET, но не совместимость с hoster.by. Перед выкаткой — один ручной smoke-тест против реального endpoint. Варианты (что проверить единообразно, способ — на твой выбор):

1. **Сверить схему своего тарифа** у hoster.by (панель/саппорт): реальный endpoint, стиль доступа (path-style vs virtual-hosted), валидное значение `region` (их гайд называет `US`). Это снимает все догадки про `s3.hoster.by` / `us-east-1` / path-style.
2. **Живой round-trip**: presigned PUT объекта → presigned GET этого объекта → GET по ссылке должен вернуть тот же объект. Прогнать против hoster.by теми же кредами `S3_ACCESS_KEY`/`S3_SECRET_KEY` (скриптом через `aws cli --endpoint-url` или маленьким java-классом).
3. Если текущий конфиг не подходит — скорректировать значения в `application.yml` (`s3.endpoint`, `s3.region`) и, при необходимости, `forcePathStyle`/`pathStyleAccessEnabled` в `S3Config`. Код `generateViewUrl`/`ReportAccessServiceImpl` при этом не меняется.

---

## Порядок реализации (чтобы компилировалось на каждом шаге)

1. Новый `ErrorCode.ACCESS_TOKEN_INVALID`.
2. `config/AppProperties.java` + регистрация в `Application.java`.
3. `purchase/dto/ReportViewDto.java` / `ReportSectionViewDto.java` / `ReportMediaViewDto.java`.
4. `purchase/service/ReportAccessService.java` + `ReportAccessServiceImpl` (сначала без presigned URL — просто прокинуть `s3Key` как `url`, скомпилировать; потом добавить `generateViewUrl`).
5. `purchase/controller/ReportAccessController.java`.
6. Правка `config/SecurityConfig.java` (`/reports/view` → `permitAll()`).
7. Правка `PurchaseServiceImpl` — `createAccessToken` возвращает `rawToken`, `applySuccessfulPayment` собирает `viewUrl` через `AppProperties`, конструктор получает новую зависимость.
8. `ReportAccessFlowTest`.
9. `./gradlew compileJava compileTestJava` после каждого шага; `./gradlew test` — вне sandbox-сессии (Testcontainers недоступны).
10. Smoke-тест против реального hoster.by (раздел "Проверка против реального hoster.by") — до выкатки; при несовпадении конфига — правки только в `application.yml`/`S3Config`, код блока не трогаем.
