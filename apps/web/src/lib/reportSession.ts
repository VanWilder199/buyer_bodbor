/*
 * Сессия просмотра отчёта по ссылке из письма (WEB-4).
 * Токен убирается из адресной строки (`replaceState`) и живёт в `sessionStorage`;
 * машина берётся из собственного флоу, если пришли с checkout (до G-10 в шапке нет car).
 */

const REPORT_TOKEN_KEY = 'podbor.reportToken';
const REPORT_CAR_KEY = 'podbor.reportCar';

export function saveReportToken(token: string): void {
  sessionStorage.setItem(REPORT_TOKEN_KEY, token);
}

export function readReportToken(): string | null {
  return sessionStorage.getItem(REPORT_TOKEN_KEY);
}

export function clearReportToken(): void {
  sessionStorage.removeItem(REPORT_TOKEN_KEY);
}

export interface ReportCar {
  carTitle: string;
  carSubtitle?: string;
}

export function saveReportCar(car: ReportCar): void {
  sessionStorage.setItem(REPORT_CAR_KEY, JSON.stringify(car));
}

export function readReportCar(): ReportCar | null {
  const raw = sessionStorage.getItem(REPORT_CAR_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ReportCar;
  } catch {
    return null;
  }
}