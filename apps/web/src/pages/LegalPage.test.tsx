import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { appRoutes } from '../routes';
import { renderWithRouter } from '../test/utils';

describe('Юридические страницы (WEB-13)', () => {
  it('/legal/privacy рендерит заголовок и markdown-секции', async () => {
    renderWithRouter(appRoutes, { initialEntries: ['/legal/privacy'] });
    expect(await screen.findByText('Политика обработки персональных данных')).toBeInTheDocument();
    expect(screen.getByText(/Какие данные обрабатываются/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'контакты' })).toHaveAttribute('href', '/contacts');
  });

  it('/legal/offer рендерит оферту', async () => {
    renderWithRouter(appRoutes, { initialEntries: ['/legal/offer'] });
    expect(await screen.findByText('Публичная оферта')).toBeInTheDocument();
    expect(screen.getByText(/Текст публичной оферты/)).toBeInTheDocument();
  });

  it('подвал на главной содержит юр.ссылки', async () => {
    renderWithRouter(appRoutes, { initialEntries: ['/'] });
    expect(await screen.findByRole('link', { name: 'Оферта' })).toHaveAttribute('href', '/legal/offer');
    expect(screen.getByRole('link', { name: 'Политика обработки данных' })).toHaveAttribute('href', '/legal/privacy');
    expect(screen.getByRole('link', { name: 'Контакты' })).toHaveAttribute('href', '/contacts');
  });
});