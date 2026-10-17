import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { appRoutes } from '../routes';
import { renderWithRouter } from '../test/utils';

describe('ReportViewPage (WEB-4)', () => {
  it('валидный токен → отчёт с шапкой «Отчёт об осмотре»', async () => {
    renderWithRouter(appRoutes, { initialEntries: ['/reports/view?token=r-1'] });
    expect(await screen.findByText('Отчёт об осмотре')).toBeInTheDocument();
    // содержимое отчёта из мока: сводка по секциям
    expect(await screen.findByText('Сводка по секциям')).toBeInTheDocument();
    // токен убран из адресной строки и сохранён в sessionStorage
    expect(sessionStorage.getItem('podbor.reportToken')).toBe('r-1');
  });

  it('нет токена → «Ссылка недействительна» + CTA «Мои покупки»', async () => {
    renderWithRouter(appRoutes, { initialEntries: ['/reports/view'] });
    expect(await screen.findByText('Ссылка недействительна')).toBeInTheDocument();
    // CTA «Мои покупки» есть (в шапке и на экране)
    expect((await screen.findAllByRole('link', { name: 'Мои покупки' })).length).toBeGreaterThan(0);
  });

  it('невалидный токен (ACCESS_TOKEN_INVALID) → «Ссылка недействительна»', async () => {
    renderWithRouter(appRoutes, { initialEntries: ['/reports/view?token=bad'] });
    expect(await screen.findByText('Ссылка недействительна')).toBeInTheDocument();
  });
});