import { Button } from '@podbor/ui/components/ui/button';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <h1 className="text-title font-semibold">Страница не найдена</h1>
      <p className="text-body text-muted-foreground">Такой страницы нет или она удалена.</p>
      <Link to="/">
        <Button>На главную</Button>
      </Link>
    </div>
  );
}