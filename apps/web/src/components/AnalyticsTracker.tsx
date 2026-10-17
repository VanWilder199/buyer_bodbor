import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPage } from '../lib/analytics';

/**
 * WEB-15: трекинг просмотров в SPA. Монтируется в AppShell — на страницах
 * отчёта (вне AppShell) Метрика не грузится; на `/reports/view` к тому же
 * отдаётся только pathname (S-10).
 */
export function AnalyticsTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPage(location);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);
  return null;
}