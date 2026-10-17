import type { CarDto, PurchaseDtoEnriched, ReportPreviewDto } from '@podbor/api';
import type { ReportViewData } from '@podbor/ui';
import { mockReport } from './report';

export const mockCar: CarDto = {
  id: 'c-1',
  vin: 'WVWZZZ3CZHE123456',
  avbyListingUrl: 'https://cars.av.by/volkswagen/passat/112233445',
  make: 'Volkswagen',
  model: 'Passat',
  year: 2017,
  listingStatus: 'active',
};

export const mockReportPreview: ReportPreviewDto = {
  id: 'r-1',
  priceByn: 150000,
  publishedAt: '2026-09-12T14:00:00+03:00',
  inspector: { displayName: 'Иван', companyName: null, reportsCount: 12 },
  summary: { stopFactorsCount: 2, badCount: 1, warnCount: 5 },
  purchased: false,
};

export const mockPurchase: PurchaseDtoEnriched = {
  id: 'p-1',
  reportId: 'r-1',
  amountByn: 150000,
  status: 'paid',
  createdAt: '2026-09-12T14:05:00+03:00',
  paidAt: '2026-09-12T14:07:00+03:00',
  car: { make: 'Volkswagen', model: 'Passat', year: 2017, vin: 'WVWZZZ3CZHE123456' },
  inspectorDisplayName: 'Иван',
  reportPublishedAt: '2026-09-12T14:00:00+03:00',
};

/** Отчёт для `GET /reports/view?token=`. */
export const mockReportView: ReportViewData = mockReport;