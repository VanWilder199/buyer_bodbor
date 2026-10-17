import type { RouteObject } from 'react-router-dom';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ErrorScreen } from './components/ErrorScreen';
import { guestOnlyLoader, requireAuthLoader } from './auth/guards';
import { NotFoundPage } from './pages/NotFoundPage';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { CarPage } from './pages/CarPage';
import { CarRequestPage } from './pages/CarRequestPage';
import { LoginPage } from './pages/LoginPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PurchaseResultPage } from './pages/PurchaseResultPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { SampleReportPage } from './pages/SampleReportPage';
import { ReportViewPage } from './pages/ReportViewPage';
import { PurchaseReportPage } from './pages/PurchaseReportPage';
import { DevReportPage } from './pages/DevReportPage';

/**
 * Маршруты приложения. `createMemoryRouter` в тестах использует этот же массив.
 * Поиск и карточка машины — публичные (на моках G-1 «сделан»), вход нужен только
 * на «Хочу отчёт», покупку и мои покупки.
 */
export const appRoutes: RouteObject[] = [
  {
    element: <AppShell />,
    errorElement: <ErrorScreen />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/cars/:carId', element: <CarPage /> },
      { path: '/cars/:carId/request', element: <CarRequestPage />, loader: requireAuthLoader },
      { path: '/login', element: <LoginPage />, loader: guestOnlyLoader },
      { path: '/checkout/:reportId', element: <CheckoutPage />, loader: requireAuthLoader },
      { path: '/purchase/success', element: <PurchaseResultPage outcome="success" />, loader: requireAuthLoader },
      { path: '/purchase/fail', element: <PurchaseResultPage outcome="fail" />, loader: requireAuthLoader },
      { path: '/purchase/cancel', element: <PurchaseResultPage outcome="cancel" />, loader: requireAuthLoader },
      { path: '/purchases', element: <PurchasesPage />, loader: requireAuthLoader },
      { path: '/sample', element: <SampleReportPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  // Экран отчёта — публичный, вне AppShell (без шапки входа/выхода).
  { path: '/reports/view', element: <ReportViewPage /> },
  // Открытие купленного отчёта из «Моих покупок» (WEB-10) — требует входа.
  { path: '/purchases/:purchaseId/report', element: <PurchaseReportPage />, loader: requireAuthLoader },
  // Витрина отчёта — только в dev-сборке (выкидывается в проде).
  ...(import.meta.env.DEV
    ? [{ path: '/dev/report', element: <DevReportPage /> } as RouteObject]
    : []),
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}