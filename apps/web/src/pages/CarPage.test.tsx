import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getMockState } from '../mocks/state';
import { appRoutes } from '../routes';
import { renderWithRouter } from '../test/utils';

describe('Страница машины (WEB-9)', () => {
  it('карточка машины + список отчётов с тизером и кнопкой «Купить»', async () => {
    renderWithRouter(appRoutes, { initialEntries: ['/cars/c-1'] });

    expect(await screen.findByText('Volkswagen Passat, 2017')).toBeInTheDocument();
    expect(await screen.findByText('Отчёты · 1')).toBeInTheDocument();
    expect(screen.getByText('Остановочных факторов: 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Купить' })).toHaveAttribute('href', '/checkout/r-1');
    // ссылка на объявление av.by
    const listing = screen.getByRole('link', { name: /Объявление на av.by/ });
    expect(listing).toHaveAttribute('target', '_blank');
    expect(listing).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('0 отчётов → блок «Хочу отчёт» с waitingCount', async () => {
    const s = getMockState();
    s.cars.push({
      id: 'c-2',
      vin: 'X',
      avbyListingUrl: null,
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      listingStatus: 'active',
      waitingCount: 3,
    });

    renderWithRouter(appRoutes, { initialEntries: ['/cars/c-2'] });

    expect(await screen.findByText('Toyota Camry, 2020')).toBeInTheDocument();
    expect(await screen.findByText(/Сейчас его ждут ещё 3 человека/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Хочу отчёт' })).toBeInTheDocument();
  });
});