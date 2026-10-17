import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createQueryClient } from '../queryClient';

/** Рендер маршрутов в изолированном роутере + свежий QueryClient. */
export function renderWithRouter(
  routes: Parameters<typeof createMemoryRouter>[0],
  {
    initialEntries = ['/'],
    queryClient = createQueryClient(),
  }: {
    initialEntries?: string[];
    queryClient?: QueryClient;
  } = {},
): RenderResult & { queryClient: QueryClient } {
  const router = createMemoryRouter(routes, { initialEntries });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}