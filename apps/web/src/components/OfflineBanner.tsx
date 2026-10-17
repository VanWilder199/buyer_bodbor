import { useOnline } from './useOnline';

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      data-slot="offline-banner"
      className="sticky top-0 z-40 bg-destructive px-4 py-2 text-center text-sm font-medium text-white"
    >
      Нет связи с интернетом
    </div>
  );
}