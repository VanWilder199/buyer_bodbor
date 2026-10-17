/*
 * Минимальный markdown-рендерер для юридических текстов (WEB-13).
 * Поддерживает: `##` заголовки, `-` списки, `[текст](url)` ссылки, абзацы.
 * Никакого HTML — контент из репозитория, рендерим как React-узлы.
 */
import { Fragment, type ReactNode } from 'react';

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  for (const match of text.matchAll(LINK_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) nodes.push(text.slice(lastIndex, index));
    const href = match[2] ?? '#';
    nodes.push(
      <a key={key++} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
        {match[1] ?? href}
      </a>,
    );
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/** Рендер markdown-строки в React-узлы. */
export function renderMarkdown(markdown: string): ReactNode {
  const blocks: ReactNode[] = [];
  let paragraphs: string[] = [];
  let list: string[] | null = null;
  let key = 0;

  const flushParagraph = () => {
    if (paragraphs.length > 0) {
      blocks.push(
        <p key={key++} className="text-body leading-relaxed text-ink">
          {paragraphs.map((p, i) => (
            <Fragment key={i}>
              {inline(p)}
              {i < paragraphs.length - 1 && <br />}
            </Fragment>
          ))}
        </p>,
      );
      paragraphs = [];
    }
  };

  const flushList = () => {
    if (list) {
      blocks.push(
        <ul key={key++} className="list-disc space-y-1 pl-5 text-body leading-relaxed text-ink">
          {list.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>,
      );
      list = null;
    }
  };

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push(
        <h2 key={key++} className="pt-4 text-heading font-semibold text-ink">
          {line.slice(3)}
        </h2>,
      );
      continue;
    }
    if (line.startsWith('- ')) {
      flushParagraph();
      list = list ?? [];
      list.push(line.slice(2));
      continue;
    }
    // обычный текст: соседние строки собираем в один абзац (перенос строки)
    flushList();
    paragraphs.push(line);
  }
  flushParagraph();
  flushList();
  return <>{blocks}</>;
}