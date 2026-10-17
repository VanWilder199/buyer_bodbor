import { Button } from '@podbor/ui/components/ui/button';
import { Card } from '@podbor/ui/components/card';
import { Skeleton } from '@podbor/ui/components/ui/skeleton';
import { formatByn, formatDate } from '@podbor/ui/lib/format';
import { ShoppingBag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { PurchaseDtoEnriched, PurchaseStatus } from '@podbor/api';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { apiErrorMessage } from '../api/errorMessages';

const STATUS_LABEL: Record<PurchaseStatus, string> = {
  pending: 'Ожидает оплаты',
  paid: 'Оплачено',
  failed: 'Не прошла',
};

/** WEB-10 (минимальная версия): список покупок. Открытие отчёта из истории — позже. */
export function PurchasesPage() {
  const query = useQuery({
    queryKey: ['purchases'],
    queryFn: () => api.get<PurchaseDtoEnriched[]>('/purchases'),
  });

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-card" />
        <Skeleton className="h-20 w-full rounded-card" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <p className="text-body text-muted-foreground">{apiErrorMessage(query.error)}</p>
        <Link to="/">
          <Button variant="secondary">На главную</Button>
        </Link>
      </div>
    );
  }

  const purchases = query.data ?? [];

  if (purchases.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <ShoppingBag className="size-10 text-muted-foreground" aria-hidden />
        <p className="font-semibold">Покупок пока нет</p>
        <Link to="/">
          <Button>Найти машину</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="px-1 text-heading font-semibold">Мои покупки</h1>
      <Card className="divide-y divide-border px-0 py-1">
        {purchases.map((p) => (
          <PurchaseRow key={p.id} purchase={p} />
        ))}
      </Card>
    </div>
  );
}

function PurchaseRow({ purchase }: { purchase: PurchaseDtoEnriched }) {
  const title = purchase.car
    ? `${purchase.car.make} ${purchase.car.model}, ${purchase.car.year}`
    : `Отчёт № ${purchase.reportId.slice(0, 8)}`;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">
          {formatDate(purchase.createdAt)} · {STATUS_LABEL[purchase.status]}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-semibold">{formatByn(purchase.amountByn)}</span>
        <PurchaseAction purchase={purchase} />
      </div>
    </div>
  );
}

function PurchaseAction({ purchase }: { purchase: PurchaseDtoEnriched }) {
  if (purchase.status === 'paid') {
    return (
      <Link to={`/purchases/${purchase.id}/report`}>
        <Button size="sm">Открыть отчёт</Button>
      </Link>
    );
  }
  if (purchase.status === 'failed') {
    return (
      <Link to={`/checkout/${purchase.reportId}`}>
        <Button size="sm" variant="secondary">
          Купить снова
        </Button>
      </Link>
    );
  }
  return (
    <p className="text-xs text-muted-foreground">Платёж обрабатывается</p>
  );
}