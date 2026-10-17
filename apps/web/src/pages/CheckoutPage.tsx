import { Button } from '@podbor/ui/components/ui/button';
import { Card } from '@podbor/ui/components/card';
import { formatByn } from '@podbor/ui/lib/format';
import { ApiError } from '@podbor/api';
import type { CarDto, InitiatePurchaseResponse, PurchaseDtoEnriched, ReportPreviewDto } from '@podbor/api';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { apiErrorMessage } from '../api/errorMessages';
import { useSession } from '../auth/useSession';
import { saveReportCar } from '../lib/reportSession';

interface CheckoutState {
  car?: CarDto;
  report?: ReportPreviewDto;
}

/** WEB-6: подтверждение покупки и редирект на bePaid. */
export function CheckoutPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const location = useLocation();
  const { email } = useSession();
  const state = (location.state ?? {}) as CheckoutState;
  const car = state.car;
  const report = state.report;

  const purchaseMutation = useMutation({
    mutationFn: () =>
      api.post<InitiatePurchaseResponse>('/purchases', { reportId }).then((res) => {
        sessionStorage.setItem(
          'podbor.pendingPurchase',
          JSON.stringify({ purchaseId: res.purchaseId, reportId, carId: car?.id ?? null, startedAt: Date.now() }),
        );
        window.location.assign(res.redirectUrl);
      }),
  });

  const existingQuery = useQuery({
    queryKey: ['purchases', 'by-report', reportId],
    queryFn: () => api.get<PurchaseDtoEnriched[]>('/purchases'),
    enabled: purchaseMutation.isError && purchaseMutation.error instanceof ApiError && purchaseMutation.error.errorCode === 'PURCHASE_ALREADY_EXISTS',
  });

  // Запоминаем машину в sessionStorage — экран отчёта (WEB-4) покажет её в шапке до G-10.
  useEffect(() => {
    if (car) saveReportCar({ carTitle: `${car.make} ${car.model}, ${car.year}`, carSubtitle: car.vin });
  }, [car]);

  // Данные отчёта пришли из карточки машины (Link state). Прямой заход без state — просим выбрать заново.
  if (!car || !report) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <AlertTriangle className="size-10 text-muted-foreground" aria-hidden />
        <p className="max-w-sm text-body text-muted-foreground">
          Данные о заказе не найдены. Выберите отчёт на странице машины.
        </p>
        <Link to="/">
          <Button variant="secondary">На главную</Button>
        </Link>
      </div>
    );
  }

  const alreadyExists =
    purchaseMutation.isError && purchaseMutation.error instanceof ApiError && purchaseMutation.error.errorCode === 'PURCHASE_ALREADY_EXISTS';
  const existing = existingQuery.data?.find((p) => p.reportId === reportId);

  if (alreadyExists && existing) {
    return (
      <Card className="space-y-4 py-6 text-center">
        <ShieldCheck className="mx-auto size-10 text-ok" aria-hidden />
        <h1 className="text-title font-semibold">
          {existing.status === 'paid' ? 'Вы уже купили этот отчёт' : 'Предыдущая оплата ещё не завершена'}
        </h1>
        <p className="text-body text-muted-foreground">
          {existing.status === 'paid'
            ? 'Откройте отчёт из «Моих покупок».'
            : 'Если вы отменили оплату, повторить можно будет примерно через час.'}
        </p>
        <Link to="/purchases" className="block">
          <Button block>Мои покупки</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <h1 className="text-title font-semibold">Подтверждение покупки</h1>
        <div className="text-body">
          <p className="font-medium">
            {car.make} {car.model}, {car.year}
          </p>
          <p className="text-muted-foreground">{car.vin}</p>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-muted-foreground">Отчёт {report.inspector.displayName}</span>
          <span className="text-amount font-semibold">{formatByn(report.priceByn)}</span>
        </div>
      </Card>

      {!email && (
        <div className="rounded-control bg-warn-soft px-4 py-3 text-sm text-warn">
          Email не указан — ссылка на отчёт придёт только в «Мои покупки».
        </div>
      )}

      {purchaseMutation.isError && !alreadyExists && (
        <div className="rounded-control bg-bad-soft px-4 py-3 text-sm text-bad">{apiErrorMessage(purchaseMutation.error)}</div>
      )}

      <Button block size="lg" onClick={() => purchaseMutation.mutate()} loading={purchaseMutation.isPending}>
        {purchaseMutation.isPending ? '' : 'Оплатить'}
      </Button>
      <p className="text-center text-caption text-muted-foreground">
        Нажимая «Оплатить», вы принимаете условия оферты.
      </p>
    </div>
  );
}