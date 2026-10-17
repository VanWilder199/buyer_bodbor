import { Button } from '@podbor/ui/components/ui/button';
import { ReportView } from '@podbor/ui';
import type { ReportHeader, ReportViewData } from '@podbor/ui';
import { useQuery } from '@tanstack/react-query';
import { FileQuestion } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { ReportLoading, ReportScreen } from '../components/ReportScreen';
import { useMediaRefetch } from '../hooks/useMediaRefetch';
import { useNoIndex } from '../hooks/useNoIndex';
import { readReportCar, readReportToken, saveReportToken, type ReportCar } from '../lib/reportSession';

/** `staleTime` отчёта — 50 минут (G-18 ниже; без него отчёт весит 25–45 МБ). */
const REPORT_STALE_MS = 50 * 60_000;

/**
 * WEB-4: главный экран продукта — отчёт по ссылке из письма `/reports/view?token=`.
 * Публичный (без авторизации), без хрома приложения.
 */
export function ReportViewPage() {
  const [searchParams] = useSearchParams();
  useNoIndex();

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

  const handleMediaError = useMediaRefetch(['report', 'view', token]);
  const header: ReportHeader = car ?? { carTitle: 'Отчёт об осмотре' };

  return (
    <ReportScreen>
      {!token || query.isError || !query.data ? (
        <InvalidLink />
      ) : query.isLoading ? (
        <ReportLoading />
      ) : (
        <ReportView report={query.data} header={header} onMediaError={handleMediaError} />
      )}
    </ReportScreen>
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