import { Button } from '@podbor/ui/components/ui/button';
import { Skeleton } from '@podbor/ui/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { OfflineBanner } from './OfflineBanner';

/** Лёгкая шапка экрана отчёта: бренд + «Мои покупки». Без шапки входа/выхода. */
export function ReportTopBar() {
  return (
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
  );
}

/** Оболочка экрана отчёта: офлайн-баннер + шапка + контент (max-w-xl как у ReportView). */
export function ReportScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <OfflineBanner />
      <ReportTopBar />
      {children}
    </div>
  );
}

/** Скелеты загрузки отчёта. */
export function ReportLoading() {
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