import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setTokens } from '../auth/session';
import { setConsent } from '../lib/consent';
import { makeAccessToken } from '../mocks/state';
import { appRoutes } from '../routes';
import { renderWithRouter } from '../test/utils';

const realLocation = window.location;

beforeEach(() => {
  // залогинен (нужен на checkout и возврате)
  setTokens({
    accessToken: makeAccessToken('buyer@example.com'),
    refreshToken: 'refresh-abc',
    expiresIn: Math.floor(Date.now() / 1000) + 3600,
  });
  setConsent('denied'); // не трогаем аналитику/Metrika в тестах
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
});

describe('Сквозной флоу покупки (WEB-6/7/10)', () => {
  it('карточка → checkout → «Оплатить» → редирект bePaid + pendingPurchase', async () => {
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { assign, pathname: '/', search: '', href: 'http://localhost:5173/' },
    });

    const user = userEvent.setup();
    renderWithRouter(appRoutes, { initialEntries: ['/cars/c-1'] });

    await user.click(await screen.findByRole('link', { name: 'Купить' }));

    // checkout: цена, строка про оферту, кнопка
    expect(await screen.findByText('Подтверждение покупки')).toBeInTheDocument();
    expect(screen.getByText(/вы принимаете условия оферты/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Оплатить' }));
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));

    const redirectUrl = assign.mock.calls[0]![0] as string;
    expect(redirectUrl).toContain('/purchase/success?purchaseId=p-2');
    const pending = JSON.parse(sessionStorage.getItem('podbor.pendingPurchase')!);
    expect(pending.reportId).toBe('r-1');
  });

  it('возврат с bePaid → опрос → «Оплачено»', async () => {
    renderWithRouter(appRoutes, { initialEntries: ['/purchase/success?purchaseId=p-1'] });
    expect(await screen.findByText('Оплачено')).toBeInTheDocument();
    expect((await screen.findAllByRole('link', { name: 'Мои покупки' })).length).toBeGreaterThan(0);
  });

  it('«Мои покупки» → «Открыть отчёт» → отчёт рендерится', async () => {
    const user = userEvent.setup();
    renderWithRouter(appRoutes, { initialEntries: ['/purchases'] });
    await user.click(await screen.findByRole('link', { name: 'Открыть отчёт' }));
    expect(await screen.findByText('Сводка по секциям')).toBeInTheDocument();
    expect(screen.getByText('Volkswagen Passat, 2017')).toBeInTheDocument();
  });
});