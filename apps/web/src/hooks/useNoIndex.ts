import { useEffect } from 'react';

const ROBOTS_SELECTOR = 'meta[name="robots"]';

/**
 * WEB-16: страница не должна попадать в поиск (отчёт по токену — private).
 * Добавляет `<meta name="robots" content="noindex, nofollow">` на время жизни
 * компонента и восстанавливает прежнее значение после размонтирования.
 */
export function useNoIndex(): void {
  useEffect(() => {
    let meta = document.head.querySelector(ROBOTS_SELECTOR) as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
    }
    const previous = meta.content;
    meta.content = 'noindex, nofollow';
    return () => {
      if (!document.head.contains(meta)) return;
      if (previous) {
        meta.content = previous;
      } else {
        document.head.removeChild(meta);
      }
    };
  }, []);
}