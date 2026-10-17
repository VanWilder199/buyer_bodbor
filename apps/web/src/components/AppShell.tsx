import { Button } from '@podbor/ui/components/ui/button';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { clearSession } from '../auth/session';
import { useSession } from '../auth/useSession';
import { AnalyticsTracker } from './AnalyticsTracker';
import { ConsentBanner } from './ConsentBanner';
import { OfflineBanner } from './OfflineBanner';

/** Шапка + офлайн-баннер + контент. Страница отчёта рендерится без этого хрома. */
export function AppShell() {
  const { loggedIn } = useSession();
  const navigate = useNavigate();

  const logout = () => {
    clearSession();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <AnalyticsTracker />
      <OfflineBanner />
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-3 px-4">
          <Link to="/" className="text-title font-bold tracking-tight text-primary">
            АвтоОтчёт
          </Link>
          <nav className="flex items-center gap-1">
            <Link to="/purchases">
              <Button variant="ghost" size="sm">
                Мои покупки
              </Button>
            </Link>
            {loggedIn ? (
              <Button variant="ghost" size="sm" onClick={logout}>
                Выйти
              </Button>
            ) : (
              <Link to="/login?next=/">
                <Button variant="ghost" size="sm">
                  Войти
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <Footer />
      <ConsentBanner />
    </div>
  );
}

/** Подвал с юридическими ссылками (WEB-13) — оферта, политика, возврат, контакты. */
function Footer() {
  return (
    <footer className="border-t border-border py-6">
      <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 text-sm text-muted-foreground">
        <Link to="/legal/offer">Оферта</Link>
        <Link to="/legal/privacy">Политика обработки данных</Link>
        <Link to="/legal/refund">Возврат</Link>
        <Link to="/contacts">Контакты</Link>
      </div>
    </footer>
  );
}