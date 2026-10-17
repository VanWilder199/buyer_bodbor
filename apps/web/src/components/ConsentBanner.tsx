import { Button } from '@podbor/ui/components/ui/button';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { syncAnalytics } from '../lib/analytics';
import { setConsent, useConsent } from '../lib/consent';

/** WEB-15: cookie-баннер. Метрика загружается только после согласия. */
export function ConsentBanner() {
  const consent = useConsent();

  useEffect(() => {
    syncAnalytics();
  }, [consent]);

  if (consent !== null) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <p className="mb-3 text-sm text-muted-foreground">
        Мы используем cookie для статистики посещений. Подробнее — в{' '}
        <Link to="/legal/privacy" className="font-medium text-primary">
          политике обработки данных
        </Link>
        .
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setConsent('granted')}>
          Принять
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setConsent('denied')}>
          Отказаться
        </Button>
      </div>
    </div>
  );
}