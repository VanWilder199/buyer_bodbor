import { Button } from '@podbor/ui/components/ui/button';
import { Skeleton } from '@podbor/ui/components/ui/skeleton';
import { Car as CarIcon, Search } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { CarDto } from '@podbor/api';
import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiErrorMessage } from '../api/errorMessages';
import { api } from '../api/client';
import { useSession } from '../auth/useSession';
import { detectInput, isValidVin, normalizeAvbyUrl, normalizeVin } from '../lib/vin';

/** WEB-5: результат поиска по VIN или ссылке av.by. */
export function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const navigate = useNavigate();
  const { loggedIn } = useSession();

  const kind = useMemo(() => detectInput(q), [q]);
  const vin = useMemo(() => (kind === 'vin' ? normalizeVin(q) : ''), [kind, q]);
  const url = useMemo(() => (kind === 'url' ? normalizeAvbyUrl(q) : null), [kind, q]);

  const carQuery = useQuery({
    queryKey: ['car', 'search', vin],
    // GET /cars/search — публичный (G-1 сделан на моках).
    queryFn: () => api.get<CarDto>(`/cars/search?vin=${encodeURIComponent(vin)}`, { auth: false }),
    enabled: kind === 'vin' && isValidVin(vin),
    // Поиск — пользовательское действие: 404/ошибку показываем сразу, без ретраев.
    retry: false,
  });

  // URL av.by: нужно залогиниться (POST /cars/resolve закрыт JWT) → resolve → карточка машины.
  const resolveMutation = useMutation({
    mutationFn: (target: string) => api.post<CarDto>('/cars/resolve', { url: target }),
    onSuccess: (car) => navigate(`/cars/${car.id}`),
  });

  useEffect(() => {
    if (kind !== 'url' || !url) return;
    if (!loggedIn) {
      const next = encodeURIComponent(`/search?q=${encodeURIComponent(q)}`);
      navigate(`/login?next=${next}`);
      return;
    }
    resolveMutation.mutate(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, url, loggedIn]);

  // Найдена машина → на её страницу (данные подтянет CarPage через GET /cars/:id).
  useEffect(() => {
    if (carQuery.data) navigate(`/cars/${carQuery.data.id}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carQuery.data]);

  // --- UI ---
  if (!q) {
    return <EmptyNote text="Введите VIN или ссылку объявления, чтобы найти машину." />;
  }
  if (kind === null) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <Search className="size-10 text-muted-foreground" aria-hidden />
        <p className="text-body text-muted-foreground">Не распознали VIN или ссылку. Проверьте ввод.</p>
        <Link to="/">
          <Button variant="secondary">Попробовать снова</Button>
        </Link>
      </div>
    );
  }

  if (kind === 'url') {
    if (!loggedIn) {
      return <EmptyNote text="Для поиска по ссылке нужно войти. Перенаправляем…" />;
    }
    if (resolveMutation.isPending) return <LoadingRows />;
    if (resolveMutation.isError) {
      return <EmptyNote text={apiErrorMessage(resolveMutation.error)} />;
    }
    return <LoadingRows />;
  }

  // VIN
  if (carQuery.isLoading) return <LoadingRows />;
  if (carQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <CarIcon className="size-10 text-muted-foreground" aria-hidden />
        <p className="text-body text-muted-foreground">Отчётов по этой машине пока нет.</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Если у вас есть ссылка на объявление av.by — вставьте её в поиск, чтобы оставить заявку.
        </p>
        <Link to="/">
          <Button variant="secondary">На главную</Button>
        </Link>
      </div>
    );
  }
  return <LoadingRows />;
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <p className="text-body text-muted-foreground">{text}</p>
      <Link to="/">
        <Button variant="secondary">На главную</Button>
      </Link>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 py-4">
      <Skeleton className="h-40 w-full rounded-card" />
      <Skeleton className="h-20 w-full rounded-card" />
      <Skeleton className="h-20 w-full rounded-card" />
    </div>
  );
}