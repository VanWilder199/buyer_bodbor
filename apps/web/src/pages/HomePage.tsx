import { Button } from '@podbor/ui/components/ui/button';
import { Input } from '@podbor/ui/components/ui/input';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/** WEB-5: главная — одно поле «VIN или ссылка av.by». */
export function HomePage() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="flex flex-col items-center gap-8 py-12 text-center">
      <div>
        <h1 className="text-title font-semibold">Проверка автомобиля перед покупкой</h1>
        <p className="mt-2 max-w-md text-body text-muted-foreground">
          Профессиональный осмотр подборщиком и подробный отчёт по каждой машине.
        </p>
      </div>

      <form onSubmit={submit} className="w-full max-w-md space-y-3">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="VIN или ссылка объявления av.by"
          aria-label="VIN или ссылка объявления"
          autoFocus
        />
        <Button block size="lg" type="submit">
          Найти
        </Button>
      </form>

      <Link to="/sample" className="text-sm font-medium text-primary">
        Посмотреть пример отчёта
      </Link>
    </div>
  );
}