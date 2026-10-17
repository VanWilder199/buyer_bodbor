import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { ReportMedia } from '@podbor/ui';
import { useCallback, useRef } from 'react';

/** Не чаще 1 раза за 30 с: перезапрос отчёта при ошибке загрузки медиа (протухшая presigned-ссылка). */
const MEDIA_REFETCH_INTERVAL_MS = 30_000;

export function useMediaRefetch(queryKey: QueryKey) {
  const queryClient = useQueryClient();
  const last = useRef(0);

  const handleMediaError = useCallback(
    (_media: ReportMedia) => {
      const now = Date.now();
      if (now - last.current < MEDIA_REFETCH_INTERVAL_MS) return;
      last.current = now;
      void queryClient.invalidateQueries({ queryKey });
    },
    [queryClient, queryKey],
  );

  return handleMediaError;
}