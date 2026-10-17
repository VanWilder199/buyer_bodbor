import { Button } from '@podbor/ui/components/ui/button';
import { Card } from '@podbor/ui/components/card';
import { FieldMessage, Input } from '@podbor/ui/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import type { CreateReportResponseDto } from '@podbor/api';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import { ApiError } from '@podbor/api';
import { api } from '../api/client';
import { apiErrorMessage } from '../api/errorMessages';
import { useSession } from '../auth/useSession';

const schema = z.object({
  email: z.string().email('Укажите корректный email'),
});
type FormValues = z.infer<typeof schema>;

/** WEB-8: «Хочу отчёт» — заявка на машину без отчёта. */
export function CarRequestPage() {
  const { carId } = useParams<{ carId: string }>();
  const { email } = useSession();
  const [done, setDone] = useState<CreateReportResponseDto | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: email ?? '' },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => api.post<CreateReportResponseDto>(`/cars/${carId}`, values),
    onSuccess: setDone,
    onError: (error) => {
      if (error instanceof ApiError) {
        const fieldError = error.fieldErrorFor('email');
        if (fieldError) setError('email', { message: fieldError });
      }
    },
  });

  if (done) {
    return (
      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="size-10 text-ok" aria-hidden />
        <h1 className="text-title font-semibold">Заявка отправлена</h1>
        <p className="max-w-sm text-body text-muted-foreground">
          Мы сообщим на email, когда появится отчёт.
          {done.waitingCount > 0 && ` Сейчас его ждут ещё ${done.waitingCount} ${plural(done.waitingCount)}.`}
        </p>
        <Link to="/">
          <Button variant="secondary">На главную</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <h1 className="text-title font-semibold">Хочу отчёт</h1>
        <p className="mt-1 text-body text-muted-foreground">
          Оставьте email — мы пришлём ссылку, когда подборщик осмотрит автомобиль.
        </p>
      </div>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
        <Input
          {...register('email')}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="email@example.com"
          aria-label="Email"
          aria-invalid={!!errors.email || undefined}
        />
        <FieldMessage error>{errors.email?.message}</FieldMessage>
        {mutation.isError && !errors.email && (
          <FieldMessage error>{apiErrorMessage(mutation.error)}</FieldMessage>
        )}
        <Button block size="lg" type="submit" loading={mutation.isPending}>
          {mutation.isPending ? '' : 'Отправить заявку'}
        </Button>
      </form>

      <Link to="/" className="block text-center text-sm font-medium text-primary">
        На главную
      </Link>
    </div>
  );
}

function plural(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'человек';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'человека';
  return 'человек';
}