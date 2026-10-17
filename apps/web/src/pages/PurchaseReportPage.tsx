import { Button } from '@podbor/ui/components/ui/button';
import { ReportView } from '@podbor/ui';
import type { ReportHeader, ReportViewData } from '@podbor/ui';
import { formatDate } from '@podbor/ui/lib/format';
import { useQuery } from '@tanstack/react-query';
import { FileQuestion } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import type { PurchaseDtoEnriched } from '@podbor/api';
import { api } from '../api/client';
import { apiErrorMessage } from '../api/errorMessages';
import { ReportLoading, ReportScreen } from '../components/ReportScreen';
import { useMediaRefetch } from '../hooks/useMediaRefetch';

/** `staleTime` отчёта — 50 минут (G-18). */
const REPORT_STALE_MS = 50 * 60_000;

/**
 * WEB-10: доступ к купленному отчёту без письма — `/purchases/:purchaseId/report`.
 * Требует входа. Шапка отчёта собирается из обогащённого `PurchaseDto` (G-6), до G-10.
 */
export function PurchaseReportPage() {
  const { purchaseId } = useParams<{ purchaseId: string }>();

  const purchaseQuery = useQuery({
    queryKey: ['purchases'],
    queryFn: () => api.get<PurchaseDtoEnriched[]>('/purchases'),
  });

  const reportQuery = useQuery({
    queryKey: ['purchase-report', purchaseId],
    queryFn: () => api.get<ReportViewData>(`/purchases/${purchaseId}/view`),
    enabled: !!purchaseId,
    staleTime: REPORT_STALE_MS,
    retry: false,
  });

  const handleMediaError = useMediaRefetch(['purchase-report', purchaseId]);
  const purchase = purchaseQuery.data?.find((p) => p.id === purchaseId);

  const header: ReportHeader = purchase?.car
    ? {
        carTitle: `${purchase.car.make} ${purchase.car.model}, ${purchase.car.year}`,
        carSubtitle: purchase.car.vin,
        inspectorName: purchase.inspectorDisplayName ?? undefined,
        inspectedAt: purchase.reportPublishedAt ? formatDate(purchase.reportPublishedAt) : undefined,
      }
    : { carTitle: 'Отчёт об осмотре' };

  return (
    <ReportScreen>
      {reportQuery.isLoading ? (
        <ReportLoading />
      ) : reportQuery.isError || !reportQuery.data ? (
        <ReportError error={reportQuery.error} />
      ) : (
        <ReportView report={reportQuery.data} header={header} onMediaError={handleMediaError} />
      )}
    </ReportScreen>
  );
}

function ReportError({ error }: { error: unknown }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <FileQuestion className="size-10 text-muted-foreground" aria-hidden />
      <div>
        <h1 className="text-title font-semibold">Отчёт недоступен</h1>
        <p className="mt-1 text-body text-muted-foreground">{apiErrorMessage(error)}</p>
      </div>
      <Link to="/purchases" className="block w-full max-w-xs">
        <Button block>Мои покупки</Button>
      </Link>
      <Link to="/" className="text-sm font-medium text-primary">
        На главную
      </Link>
    </div>
  );
}