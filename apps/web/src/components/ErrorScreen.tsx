import { Button } from '@podbor/ui/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { Link, useRouteError } from 'react-router-dom';
import { apiErrorMessage } from '../api/errorMessages';

/** Глобальный `errorElement`: сетевая/неожиданная ошибка. */
export function ErrorScreen() {
  const error = useRouteError();
  const message = apiErrorMessage(error);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <AlertTriangle className="size-10 text-destructive" aria-hidden />
      <div>
        <h1 className="text-heading font-semibold">Не получилось загрузить страницу</h1>
        <p className="mt-1 text-body text-muted-foreground">{message}</p>
      </div>
      <Link to="/">
        <Button>На главную</Button>
      </Link>
    </div>
  );
}