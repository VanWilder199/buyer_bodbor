/* Шрифт Onest: self-hosted, импорт в entry приложения (CSP default-src 'self'). */
import '@fontsource-variable/onest';
import { Toaster } from '@podbor/ui/components/ui/sonner';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { setUnauthorizedHandler } from './api/client';
import { clearSession } from './auth/session';
import { initSentry } from './lib/sentry';
import { createQueryClient } from './queryClient';
import { createAppRouter } from './routes';
import './index.css';

const queryClient = createQueryClient();

// WEB-15: Sentry — только если задан VITE_SENTRY_DSN (динамический импорт).
void initSentry();

// INVALID_REFRESH_TOKEN / 400 от /auth/refresh → разлогин и редирект на /login?next=…
setUnauthorizedHandler(() => {
  clearSession();
  queryClient.clear();
  const path = window.location.pathname + window.location.search;
  if (!window.location.pathname.startsWith('/login')) {
    const next = encodeURIComponent(path);
    window.location.assign(`/login?next=${next}`);
  }
});

/** `VITE_API_MOCKS=1` — без бэкенда: запросы `/api/*` перехватывает MSW (см. `mocks/handlers.ts`). */
async function enableMocks() {
  if (import.meta.env.VITE_API_MOCKS !== '1') return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

enableMocks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={createAppRouter()} />
        <Toaster />
      </QueryClientProvider>
    </StrictMode>,
  );
});