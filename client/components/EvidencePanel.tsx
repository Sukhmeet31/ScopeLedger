import { useEffect, useRef, useState } from 'react';
import { FileText, ArrowUpRight } from 'lucide-react';
import type { Evidence, SourceDocument } from '../../shared/schema';
export function EvidencePanel({ document, selected, focusRequest = 0 }: { document: SourceDocument; selected: Evidence | null; focusRequest?: number }) {
  const [all, setAll] = useState(false);
  const region = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!focusRequest) return;
    setAll(false);
    region.current?.focus({ preventScroll: true });
    if (window.matchMedia?.('(max-width: 760px)').matches) region.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [focusRequest]);
  useEffect(() => { setAll(false); }, [selected]);
  const chosen = document.blocks.find(b => b.id === selected?.blockId) ?? document.blocks[0];
  const blocks = all ? document.blocks : [chosen];
  return <section className="source-panel panel" aria-label="Supporting source" tabIndex={-1} ref={region}>
    <div className="source-head"><FileText size={23} strokeWidth={1.3} /><div><h2>{document.input.title}</h2><p>{document.input.kind === 'pdf' ? `${document.input.pages.length} pages · extracted text` : 'Original supplied text'}</p></div></div>
    <div className="source-body">{blocks.map(block => {
      const start = selected?.blockId === block.id ? selected.start - block.start : -1;
      const end = selected?.blockId === block.id ? selected.end - block.start : -1;
      return <article key={block.id}><div className="source-label">{block.page ? `Page ${block.page} · ` : ''}Agreement excerpt</div><p>{start >= 0 ? <>{block.text.slice(0, start)}<mark>{block.text.slice(start, end)}</mark>{block.text.slice(end)}</> : block.text}</p></article>;
    })}</div>
    <div className="source-footer"><button onClick={() => setAll(v => !v)} className="text-button">{all ? 'Return to selected source' : 'Read full agreement'} <ArrowUpRight size={13} /></button><p>A matching quote shows its source; it does not prove the interpretation.</p></div>
  </section>;
}
