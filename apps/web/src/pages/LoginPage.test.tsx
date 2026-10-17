import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { appRoutes } from '../routes';
import { renderWithRouter } from '../test/utils';

function renderLogin() {
  return renderWithRouter(appRoutes, { initialEntries: ['/login?next=/cars/c-1'] });
}

describe('LoginPage (WEB-3)', () => {
  it('кнопка «Получить код» неактивна без согласия (WEB-13)', async () => {
    renderLogin();
    const button = (await screen.findByRole('button', { name: 'Получить код' })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await userEvent.setup().click(screen.getByLabelText('Согласие на обработку персональных данных'));
    expect((screen.getByRole('button', { name: 'Получить код' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('invalid input → error, no navigation', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(await screen.findByLabelText('Телефон или email'), 'не телефон');
    await user.click(screen.getByLabelText('Согласие на обработку персональных данных'));
    await user.click(screen.getByRole('button', { name: 'Получить код' }));
    expect(await screen.findByText(/Не распознали телефон или email/)).toBeInTheDocument();
  });

  it('valid phone → OTP step; wrong code → error', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(await screen.findByLabelText('Телефон или email'), '+375291234567');
    await user.click(screen.getByLabelText('Согласие на обработку персональных данных'));
    await user.click(screen.getByRole('button', { name: 'Получить код' }));

    expect(await screen.findByText('Введите код')).toBeInTheDocument();
    const otp = await screen.findByRole('textbox');
    await user.type(otp, '111111');
    expect(await screen.findByText(/Неверный код/)).toBeInTheDocument();
  });

  it('correct code → navigates to next', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(await screen.findByLabelText('Телефон или email'), '+375291234567');
    await user.click(screen.getByLabelText('Согласие на обработку персональных данных'));
    await user.click(screen.getByRole('button', { name: 'Получить код' }));
    await screen.findByText('Введите код');

    await user.type(await screen.findByRole('textbox'), '042817');
    // Успешный вход → редирект на /cars/c-1 (карточка машины)
    expect(await screen.findByText(/Volkswagen Passat, 2017/)).toBeInTheDocument();
  });
});