import { screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { clearSession, setTokens } from '../auth/session';
import { makeAccessToken } from '../mocks/state';
import { appRoutes } from '../routes';
import { renderWithRouter } from '../test/utils';

function login() {
  setTokens({
    accessToken: makeAccessToken('buyer@example.com'),
    refreshToken: 'refresh-abc',
    expiresIn: Math.floor(Date.now() / 1000) + 3600,
  });
}

describe('Мои покупки и открытие отчёта (WEB-10)', () => {
  beforeEach(() => login());

  it('гость без сессии → редирект на /login', async () => {
    clearSession();
    renderWithRouter(appRoutes, { initialEntries: ['/purchases'] });
    expect(await screen.findByLabelText('Телефон или email')).toBeInTheDocument();
  });

  it('paid-покупка → кнопка «Открыть отчёт» → отчёт с шапкой машины', async () => {
    renderWithRouter(appRoutes, { initialEntries: ['/purchases'] });
    const open = await screen.findByRole('link', { name: 'Открыть отчёт' });
    expect(open.getAttribute('href')).toBe('/purchases/p-1/report');
    expect(await screen.findByText('Volkswagen Passat, 2017')).toBeInTheDocument();
  });

  it('страница /purchases/p-1/report рендерит отчёт', async () => {
    renderWithRouter(appRoutes, { initialEntries: ['/purchases/p-1/report'] });
    expect(await screen.findByText('Volkswagen Passat, 2017')).toBeInTheDocument();
    expect(await screen.findByText('Сводка по секциям')).toBeInTheDocument();
  });
});