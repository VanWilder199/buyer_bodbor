import { Button } from '@podbor/ui/components/ui/button';
import { Card } from '@podbor/ui/components/card';
import { Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PurchaseDtoEnriched } from '@podbor/api';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useSession } from '../auth/useSession';

type Outcome = 'success' | 'fail' | 'cancel';
const POLL_TIMEOUT_MS = 2 * 60_000;

interface PendingPurchase {
  purchaseId: string;
  reportId: string;
  carId: string | null;
  startedAt: number;
}

function readPending(): PendingPurchase | null {
  const raw = sessionStorage.getItem('podbor.pendingPurchase');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingPurchase;
  } catch {
    return null;
  }
}

/** WEB-7: возврат с bePaid. `success` опрашивает статус, `fail`/`cancel` — нет. */
export function PurchaseResultPage({ outcome }: { outcome: Outcome }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { email } = useSession();

  const pending = useMemo(readPending, []);
  const purchaseId = searchParams.get('purchaseId') ?? pending?.purchaseId;
  const reportId = pending?.reportId;

  const [paid, setPaid] = useState(false);
  const [failed, setFailed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const settled = outcome !== 'success' || paid || failed || timedOut;

  const purchasesQuery = useQuery({
    queryKey: ['purchases', 'result', purchaseId],
    queryFn: () => api.get<PurchaseDtoEnriched[]>('/purchases'),
    enabled: outcome === 'success' && !!purchaseId && !settled,
    refetchInterval: settled ? false : 2000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (outcome !== 'success') return;
    const data = purchasesQuery.data;
    const p = data?.find((x) => x.id === purchaseId);
    if (p?.status === 'paid') {
      setPaid(true);
      sessionStorage.removeItem('podbor.pendingPurchase');
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    } else if (p?.status === 'failed') {
      setFailed(true);
    }
  }, [purchasesQuery.data, purchaseId, outcome, queryClient]);

  useEffect(() => {
    if (outcome !== 'success') return;
    const t = window.setTimeout(() => setTimedOut(true), POLL_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [outcome]);

  // Нет purchaseId — нечего ждать.
  useEffect(() => {
    if (outcome === 'success' && !purchaseId) navigate('/purchases', { replace: true });
  }, [outcome, purchaseId, navigate]);

  const retry = () => {
    if (reportId) navigate(`/checkout/${reportId}`);
  };

  if (outcome === 'success') {
    if (paid) {
      return (
        <Card className="space-y-4 py-8 text-center">
          <ShieldCheck className="mx-auto size-12 text-ok" aria-hidden />
          <h1 className="text-title font-semibold">Оплачено</h1>
          <p className="max-w-sm text-body text-muted-foreground">
            {email
              ? 'Ссылка на отчёт также отправлена на email.'
              : 'Email не указан — откройте отчёт из «Моих покупок».'}
          </p>
          <Link to="/purchases" className="block">
            <Button block>Мои покупки</Button>
          </Link>
        </Card>
      );
    }
    if (failed) {
      return (
        <ResultCard
          title="Оплата не прошла"
          text="Платёж не был завершён. Можно попробовать ещё раз."
          actions={
            <>
              <Button block onClick={retry} disabled={!reportId}>
                Попробовать снова
              </Button>
              <Link to="/purchases" className="block">
                <Button variant="secondary" block>
                  Мои покупки
                </Button>
              </Link>
            </>
          }
        />
      );
    }
    if (timedOut) {
      return (
        <ResultCard
          title="Платёж обрабатывается"
          text="Мы пришлём письмо, как только оплата подтвердится. Статус всегда есть в «Моих покупках»."
          actions={
            <Link to="/purchases" className="block">
              <Button block>Мои покупки</Button>
            </Link>
          }
        />
      );
    }
    return (
      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
        <p className="text-body text-muted-foreground">Проверяем оплату…</p>
      </Card>
    );
  }

  // fail / cancel — без опроса
  const isCancel = outcome === 'cancel';
  return (
    <ResultCard
      title={isCancel ? 'Оплата отменена' : 'Оплата не прошла'}
      text={
        isCancel
          ? 'Вы отменили оплату. Если захотите продолжить, повтор можно сделать примерно через час.'
          : 'Платёж не был завершён. Можно попробовать ещё раз.'
      }
      actions={
        <>
          {!isCancel && (
            <Button block onClick={retry} disabled={!reportId}>
              Попробовать снова
            </Button>
          )}
          <Link to="/purchases" className="block">
            <Button variant="secondary" block>
              Мои покупки
            </Button>
          </Link>
        </>
      }
    />
  );
}

function ResultCard({
  title,
  text,
  actions,
}: {
  title: string;
  text: string;
  actions: React.ReactNode;
}) {
  return (
    <Card className="space-y-4 py-8 text-center">
      <XCircle className="mx-auto size-10 text-muted-foreground" aria-hidden />
      <div>
        <h1 className="text-title font-semibold">{title}</h1>
        <p className="mt-1 max-w-sm text-body text-muted-foreground">{text}</p>
      </div>
      <div className="space-y-2">{actions}</div>
    </Card>
  );
}