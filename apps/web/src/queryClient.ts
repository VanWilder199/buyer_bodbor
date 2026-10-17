import { QueryClient } from '@tanstack/react-query';

/** retry: 2 только для идемпотентных запросов; мутации не ретраим никогда. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 2, refetchOnWindowFocus: true },
      mutations: { retry: 0 },
    },
  });
}