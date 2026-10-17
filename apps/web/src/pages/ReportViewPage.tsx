import { Button } from '@podbor/ui/components/ui/button';
import { Skeleton } from '@podbor/ui/components/ui/skeleton';
import { ReportView } from '@podbor/ui';
import type { ReportHeader, ReportMedia, ReportViewData } from '@podbor/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileQuestion } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { OfflineBanner } from '../components/OfflineBanner';
import { readReportCar, readReportToken, saveReportToken, type ReportCar } from '../lib/reportSession';

/** Частота повтора загрузки медиа при протухших presigned-ссылках: не чаще 1 раза за 30 с. */
const MEDIA_REFETCH_INTERVAL_MS = 30_000;
/** `staleTime` отчёта — 50 минут (G-18 ниже; без него отчёт весит 25–45 МБ). */
const REPORT_STALE_MS = 50 * 60_000;

/**
 * WEB-4: главный экран продукта — отчёт по ссылке из письма `/reports/view?token=`.
 * Публичный (без авторизации), без хрома приложения.
 */
export function ReportViewPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Токен: сначала из URL, иначе — из sessionStorage (переживает перезагрузку).
  const urlToken = searchParams.get('token');
  const [storedToken] = useState<string | null>(() => readReportToken());
  const token = urlToken ?? storedToken;

  // Убираем токен из адресной строки и сохраняем в sessionStorage (Referrer-Policy уже no-referrer).
  useEffect(() => {
    if (urlToken) {
      saveReportToken(urlToken);
      window.history.replaceState(null, '', '/reports/view');
    }
  }, [urlToken]);

  const [car] = useState<ReportCar | null>(() => readReportCar());

  const query = useQuery({
    queryKey: ['report', 'view', token],
    queryFn: () => api.get<ReportViewData>(`/reports/view?token=${encodeURIComponent(token ?? '')}`, { auth: false }),
    enabled: !!token,
    staleTime: REPORT_STALE_MS,
    // 404 ACCESS_TOKEN_INVALID показываем сразу; повтор ошибки — только по событию медиа.
    retry: false,
  });

  const lastMediaRefetch = useRef(0);
  const handleMediaError = useCallback(
    (_media: ReportMedia) => {
      const now = Date.now();
      if (now - lastMediaRefetch.current < MEDIA_REFETCH_INTERVAL_MS) return;
      lastMediaRefetch.current = now;
      // Протухла presigned-ссылка: перезапрашиваем отчёт (свежие URL) не чаще 1 раза за 30 с.
      void queryClient.invalidateQueries({ queryKey: ['report', 'view'] });
    },
    [queryClient],
  );

  const header: ReportHeader = car ?? { carTitle: 'Отчёт об осмотре' };

  return (
    <div className="min-h-dvh">
      <OfflineBanner />
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-12 w-full max-w-xl items-center justify-between px-4">
          <Link to="/" className="text-title font-bold tracking-tight text-primary">
            АвтоОтчёт
          </Link>
          <Link to="/purchases">
            <Button variant="ghost" size="sm">
              Мои покупки
            </Button>
          </Link>
        </div>
      </header>

      {!token || query.isError || !query.data ? (
        <InvalidLink />
      ) : query.isLoading ? (
        <ReportLoading />
      ) : (
        <ReportView report={query.data} header={header} onMediaError={handleMediaError} />
      )}
    </div>
  );
}

function InvalidLink() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <FileQuestion className="size-10 text-muted-foreground" aria-hidden />
      <div>
        <h1 className="text-title font-semibold">Ссылка недействительна</h1>
        <p className="mt-1 text-body text-muted-foreground">
          Ссылка на отчёт истекла (ссылки живут 30 дней), была использована или скопирована не полностью.
        </p>
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

function ReportLoading() {
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-5">
      <Skeleton className="h-6 w-2/3 rounded" />
      <Skeleton className="h-4 w-1/2 rounded" />
      <Skeleton className="h-32 w-full rounded-card" />
      <Skeleton className="h-24 w-full rounded-card" />
      <Skeleton className="h-24 w-full rounded-card" />
    </div>
  );
}