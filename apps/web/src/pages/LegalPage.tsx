import { LEGAL_DOCS } from '../legal/content';
import { renderMarkdown } from '../lib/markdown';
import { NotFoundPage } from './NotFoundPage';

/** WEB-13: статичная юридическая страница (оферта, политика, возврат, контакты). */
export function LegalPage({ doc }: { doc: keyof typeof LEGAL_DOCS | string }) {
  const legal = LEGAL_DOCS[doc];
  if (!legal) return <NotFoundPage />;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-title font-semibold">{legal.title}</h1>
      <div className="space-y-3">{renderMarkdown(legal.markdown)}</div>
    </div>
  );
}