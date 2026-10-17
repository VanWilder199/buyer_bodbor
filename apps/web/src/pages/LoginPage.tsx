import { Button } from '@podbor/ui/components/ui/button';
import { FieldMessage, Input } from '@podbor/ui/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@podbor/ui/components/ui/input-otp';
import { ApiError } from '@podbor/api';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiErrorMessage } from '../api/errorMessages';
import { parseLoginInput, sendOtp, verifyOtp, type LoginTarget } from '../auth/login';

const NEXT_RE = /^\/(?![/\\])/;
const MAX_RESEND = 3;

/** WEB-3: вход по OTP. Шаг 1 — телефон или email, шаг 2 — код из 6 цифр. */
export function LoginPage() {
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get('next') ?? '/';
  const next = NEXT_RE.test(rawNext) ? rawNext : '/';
  const navigate = useNavigate();

  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [input, setInput] = useState('');
  const [target, setTarget] = useState<LoginTarget | null>(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [resendCount, setResendCount] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  const startResendTimer = () => setResendIn(60);

  const submitTarget = async () => {
    const parsed = parseLoginInput(input);
    if (!parsed) {
      setError('Не распознали телефон или email. Проверьте ввод.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendOtp(parsed);
      setTarget(parsed);
      setStep('otp');
      setOtp('');
      setResendCount(1);
      startResendTimer();
    } catch (e) {
      if (e instanceof ApiError && e.errorCode === 'OTP_RATE_LIMIT_EXCEEDED') {
        setError('Слишком много попыток. Попробуйте через час.');
      } else {
        setError(apiErrorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0 || resendCount >= MAX_RESEND || !target) return;
    setError(null);
    try {
      await sendOtp(target);
      setResendCount((c) => c + 1);
      startResendTimer();
    } catch (e) {
      if (e instanceof ApiError && e.errorCode === 'OTP_RATE_LIMIT_EXCEEDED') {
        setError('Слишком много попыток. Попробуйте через час.');
      } else {
        setError(apiErrorMessage(e));
      }
    }
  };

  const verify = async (code: string) => {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(target.destination, target.kind === 'sms' ? 'SMS' : 'EMAIL', code);
      navigate(next, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.errorCode === 'OTP_EXPIRED') {
        setError('Код истёк. Запросите новый.');
        setStep('input');
        setOtp('');
      } else if (e instanceof ApiError && e.errorCode === 'OTP_INVALID') {
        setError('Неверный код. Проверьте и попробуйте ещё раз.');
        setOtp('');
      } else {
        setError(apiErrorMessage(e));
        setOtp('');
      }
    } finally {
      setBusy(false);
    }
  };

  const onInputSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitTarget();
  };

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <h1 className="text-title font-semibold">{step === 'input' ? 'Вход' : 'Введите код'}</h1>
        <p className="mt-1 text-body text-muted-foreground">
          {step === 'input'
            ? 'Телефон или email для доступа к отчётам и покупкам.'
            : `Мы отправили код на ${target?.destination}.`}
        </p>
      </div>

      {step === 'input' ? (
        <form onSubmit={onInputSubmit} className="space-y-3">
          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            placeholder="Телефон или email"
            aria-label="Телефон или email"
            autoComplete="username"
            autoFocus
          />
          <FieldMessage error>{error}</FieldMessage>
          <Button block size="lg" type="submit" loading={busy}>
            {busy ? '' : 'Получить код'}
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(v) => {
                setOtp(v);
                setError(null);
              }}
              onComplete={(v) => void verify(v)}
              disabled={busy}
              inputMode="numeric"
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <FieldMessage error>{error}</FieldMessage>
          <div className="text-center">
            {resendIn > 0 ? (
              <span className="text-sm text-muted-foreground">Отправить ещё раз через {resendIn} с</span>
            ) : resendCount >= MAX_RESEND ? (
              <span className="text-sm text-muted-foreground">Лимит отправок на час исчерпан</span>
            ) : (
              <button
                type="button"
                onClick={() => void resend()}
                className="text-sm font-medium text-primary"
              >
                Отправить ещё раз
              </button>
            )}
          </div>
          {target && (
            <p className="text-center text-sm text-muted-foreground">
              Если код не подходит, введите код из предыдущего сообщения.
            </p>
          )}
          <Button variant="ghost" block size="sm" onClick={() => setStep('input')}>
            ← Изменить телефон или email
          </Button>
        </div>
      )}
    </div>
  );
}