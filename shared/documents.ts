import { DocumentInputSchema, LIMITS, type SourceBlock, type SourceDocument } from './schema';

export async function createDocument(raw: unknown): Promise<SourceDocument> {
  const parsed = DocumentInputSchema.parse(raw);
  if (parsed.kind === 'text' && parsed.pages.length !== 1)
    throw new Error('Plain text must contain one text section.');
  if (parsed.pages.reduce((sum, p) => sum + p.length, 0) > LIMITS.characters)
    throw new Error('Use an agreement of at most 60,000 characters.');
  const pages = parsed.pages.map((p, index) => {
    const text = p.replace(/\r\n?/g, '\n').trim();
    if (!text)
      throw new Error(
        parsed.kind === 'pdf'
          ? `Page ${index + 1} has no readable text. Scanned or partially scanned PDFs need OCR first; paste verified text instead.`
          : 'Add readable agreement text.',
      );
    return text;
  });
  const input = { ...parsed, pages };
  const text = pages.join('\n\n');
  if (text.length > LIMITS.characters)
    throw new Error('Use an agreement of at most 60,000 characters, including page separators.');
  const blocks: SourceBlock[] = [];
  let pageStart = 0;
  pages.forEach((page, p) => {
    const matcher = /[^\n]+(?:\n(?!\n)[^\n]+)*/g;
    let match: RegExpExecArray | null;
    let blockNumber = 0;
    while ((match = matcher.exec(page)) !== null) {
      if (!match[0].trim()) continue;
      const start = pageStart + match.index;
      blocks.push({
        id: `p${p + 1}-b${++blockNumber}`,
        ...(input.kind === 'pdf' ? { page: p + 1 } : {}),
        start,
        end: start + match[0].length,
        text: match[0],
      });
    }
    pageStart += page.length + 2;
  });
  if (blocks.length > 1000)
    throw new Error(
      'This agreement has too many separate sections. Combine short lines and try again.',
    );
  const bytes = new TextEncoder().encode(JSON.stringify({ kind: input.kind, pages }));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    hash,
    input,
    text,
    blocks,
    createdAt: new Date().toISOString(),
  };
}
