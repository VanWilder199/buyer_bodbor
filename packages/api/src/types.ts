/*
 * Ручные зеркала DTO бэкенда `backend-podbor` (покупатель).
 * Источник — `PLAN_FRONTEND.md`, часть 2, «Справочник API» и пробелы G-1…G-18.
 * После springdoc (G-8) эти типы заменяются на сгенерированные (WEB-12) —
 * см. комментарий в шапке каждого типа (имя Java-DTO).
 */

/** Канал отправки кода. `Channel.java`. */
export type Channel = 'SMS' | 'EMAIL';

/** Статус покупки — строка в нижнем регистре, enum в Java отсутствует. */
export type PurchaseStatus = 'pending' | 'paid' | 'failed';

/** Статус объявления (`CarDto.listingStatus`). */
export type ListingStatus = 'active' | 'inactive';

/** `AuthResponse.java`. `expiresIn` — epoch-секунды истечения refresh-токена (не TTL!). */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** `SendOtpRequest.java`. Ровно одно из полей; канал определяется неявно. */
export interface SendOtpRequest {
  phoneNumber?: string;
  email?: string;
}

/** `VerifyOtpRequest.java`. Канал явный и обязательный. */
export interface VerifyOtpRequest {
  destination: string;
  channel: Channel;
  otp: string;
}

/** `CarDto.java`. */
export interface CarDto {
  id: string;
  vin: string;
  avbyListingUrl: string | null;
  make: string;
  model: string;
  year: number;
  listingStatus: ListingStatus;
}

/** `CreateReportRequestDto.java` — тело «Хочу отчёт». */
export interface CreateReportRequestDto {
  email: string;
}

/** Ответ `POST /cars/{carId}` (после G-5; сейчас — голое число). */
export interface CreateReportResponseDto {
  requestId: number;
  waitingCount: number;
  alreadyRequested: boolean;
}

/** `InitiatePurchaseRequest.java`. */
export interface InitiatePurchaseRequest {
  reportId: string;
}

/** `InitiatePurchaseResponse.java`. */
export interface InitiatePurchaseResponse {
  purchaseId: string;
  redirectUrl: string;
}

/** `PurchaseDto.java` (базовый, до обогащения G-6). */
export interface PurchaseDto {
  id: string;
  reportId: string;
  amountByn: number;
  status: PurchaseStatus;
  createdAt: string;
  paidAt: string | null;
}

/** Обогащённый `PurchaseDto` после G-6 (машина, подборщик, дата публикации). */
export interface PurchaseDtoEnriched extends PurchaseDto {
  car: { make: string; model: string; year: number; vin: string } | null;
  inspectorDisplayName: string | null;
  reportPublishedAt: string | null;
}

/** Тизер отчёта для `GET /reports?carId=` (G-2, `ReportPreviewDto`). */
export interface ReportPreviewDto {
  id: string;
  priceByn: number;
  publishedAt: string;
  inspector: { displayName: string; companyName: string | null; reportsCount: number };
  summary: { stopFactorsCount: number; badCount: number; warnCount: number };
  purchased: boolean;
}

/** `ProblemDetail.java` — единый формат ошибок приложения. */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  instance?: string;
  timestamp?: string;
  path?: string;
  errorCode?: string;
  /** Массив строк вида `"поле: сообщение"` для валидационных 400 (spring `@Valid`). */
  errors?: string[];
}