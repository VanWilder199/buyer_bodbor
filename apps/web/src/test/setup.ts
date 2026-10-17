import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setUnauthorizedHandler } from '../api/client';
import { resetMockState } from '../mocks/state';
import { server } from '../mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  server.events.removeAllListeners();
  resetMockState();
  localStorage.clear();
  sessionStorage.clear();
  document.title = '';
  setUnauthorizedHandler(undefined);
});

// happy-dom не отдаёт `style.transform` — заглушка (нужна vaul/Drawer).
const nativeGetComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = ((element: Element, pseudo?: string | null) => {
  const style = nativeGetComputedStyle(element, pseudo);
  if (!style.transform) {
    try {
      Object.defineProperty(style, 'transform', { value: 'none', configurable: true });
    } catch {
      // объект стилей запечатан — оставляем как есть
    }
  }
  return style;
}) as typeof window.getComputedStyle;

afterAll(() => server.close());