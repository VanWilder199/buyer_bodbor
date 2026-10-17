import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { appRoutes } from '../routes';
import { renderWithRouter } from '../test/utils';

describe('Поиск по VIN (WEB-5)', () => {
  it('главная → ввод VIN → поиск → карточка машины', async () => {
    const user = userEvent.setup();
    renderWithRouter(appRoutes, { initialEntries: ['/'] });

    await user.type(screen.getByLabelText('VIN или ссылка объявления'), 'wvwzzz3czhe123456');
    await user.click(screen.getByRole('button', { name: 'Найти' }));

    // SearchPage находит машину и переходит на /cars/c-1
    expect(await screen.findByText(/Volkswagen Passat, 2017/)).toBeInTheDocument();
    expect(screen.getByText('WVWZZZ3CZHE123456')).toBeInTheDocument();
  });

  it('не найденный VIN → «Отчётов по этой машине пока нет»', async () => {
    renderWithRouter(appRoutes, { initialEntries: ['/search?q=WVWZZZ3CZHE999999'] });
    expect(await screen.findByText(/Отчётов по этой машине пока нет/)).toBeInTheDocument();
  });
});