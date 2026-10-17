import { Button } from '@podbor/ui/components/ui/button';
import { Card } from '@podbor/ui/components/card';
import { Skeleton } from '@podbor/ui/components/ui/skeleton';
import { formatByn, formatDate } from '@podbor/ui/lib/format';
import { Car as CarIcon, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { CarDto, ReportPreviewDto } from '@podbor/api';
import { Link, useParams } from 'react-router-dom';
import { apiErrorMessage } from '../api/errorMessages';
import { api } from '../api/client';

/**
 * Страница машины (WEB-9, минимальная версия): карточка машины + список опубликованных
 * отчётов. Полные состояния (skeleton/empty/error, waitingCount, direct-URL) — дальше.
 */
export function CarPage() {
  const { carId } = useParams<{ carId: string }>();

  const carQuery = useQuery({
    queryKey: ['car', carId],
    // GET /cars/{id} — публичный (G-4/G-1 на моках).
    queryFn: () => api.get<CarDto>(`/cars/${carId}`, { auth: false }),
    enabled: !!carId,
  });

  const reportsQuery = useQuery({
    queryKey: ['reports', carId],
    // GET /reports?carId= — публичный (G-2/G-1 на моках).
    queryFn: () => api.get<ReportPreviewDto[]>(`/reports?carId=${encodeURIComponent(carId ?? '')}`, { auth: false }),
    enabled: !!carId,
  });

  if (carQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full rounded-card" />
        <Skeleton className="h-24 w-full rounded-card" />
      </div>
    );
  }
  if (carQuery.isError || !carQuery.data) {
    return <ErrorNote text={apiErrorMessage(carQuery.error)} />;
  }

  const car = carQuery.data;
  const reports = reportsQuery.data ?? [];

  return (
    <div className="space-y-5">
      <Card className="space-y-2">
        <h1 className="text-title font-semibold">
          {car.make} {car.model}, {car.year}
        </h1>
        <p className="font-mono text-sm text-muted-foreground">{car.vin}</p>
        {car.avbyListingUrl && (
          <a
            href={car.avbyListingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            Объявление на av.by <ExternalLink className="size-4" aria-hidden />
          </a>
        )}
      </Card>

      {reports.length === 0 ? (
        <Card className="space-y-3 py-6 text-center">
          <CarIcon className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <div>
            <p className="font-semibold">Отчётов по этой машине пока нет</p>
            <p className="mt-1 text-sm text-muted-foreground">Оставьте заявку — подборщик осмотрит авто.</p>
          </div>
          <Link to={`/cars/${carId}/request`}>
            <Button block>Хочу отчёт</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="px-1 text-heading font-semibold">Отчёты · {reports.length}</h2>
          {reports.map((report) => (
            <Card key={report.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{report.inspector.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(report.publishedAt)}
                  {report.inspector.companyName ? ` · ${report.inspector.companyName}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-semibold">{formatByn(report.priceByn)}</span>
                {report.purchased ? (
                  <Link to={`/purchases/${report.id}/report`}>
                    <Button size="sm" variant="secondary">
                      Открыть
                    </Button>
                  </Link>
                ) : (
                  <Link to={`/checkout/${report.id}`} state={{ car, report }}>
                    <Button size="sm">Купить</Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Link to="/sample" className="block text-center text-sm font-medium text-primary">
        Посмотреть пример отчёта
      </Link>
    </div>
  );
}

function ErrorNote({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <p className="text-body text-muted-foreground">{text}</p>
      <Link to="/">
        <Button variant="secondary">На главную</Button>
      </Link>
    </div>
  );
}