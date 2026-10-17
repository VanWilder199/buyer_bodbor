import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { getMockState, resetMockState, setFailOnce } from './state';

export const worker = setupWorker(...handlers);

// Управление моками из консоли браузера (только dev, VITE_API_MOCKS=1):
//   __mocks.reset()
//   __mocks.failOnce('POST', '/purchases', 409, 'PURCHASE_ALREADY_EXISTS')
//   __mocks.state
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__mocks = {
    reset: resetMockState,
    state: getMockState,
    failOnce: (method: string, path: string, status = 500, errorCode?: string) =>
      setFailOnce({ method, path, status, errorCode }),
  };
}