import { Copy, Download, Plus, ArrowRight } from 'lucide-react';
import type { Draft } from '../../shared/schema';
import { downloadText } from '../files';
export function DraftView({ draft, onChange, onMessage, onReview }: { draft: Draft | null; onChange: (patch: Partial<Draft>) => void; onMessage: (message: string) => void; onReview: () => void }) {
  if (!draft) return <div className="empty panel"><h2>Start with a request review.</h2><p>A reply needs a reviewed request and supporting agreement.</p><button className="button primary" onClick={onReview}>Review a request <ArrowRight size={15} /></button></div>;
  async function copy() { try { await navigator.clipboard.writeText(draft!.text); onMessage('Draft copied. Review it before sharing.'); } catch { onMessage('Clipboard access is unavailable. Select and copy the reply text directly.'); } }
  function appendProposal() {
    const lines = [draft!.fee.trim() && `Proposed additional fee for discussion: ${draft!.fee.trim()}`, draft!.schedule.trim() && `Proposed schedule impact for discussion: ${draft!.schedule.trim()}`].filter(Boolean).join('\n');
    if (!lines) { onMessage('Add a proposed fee or schedule first.'); return; }
    if ((draft!.text + lines).length + 2 > 20_000) { onMessage('The draft is too long. Shorten it before adding the proposal.'); return; }
    onChange({ text: draft!.text + '\n\n' + lines });
  }
  return <section className="panel draft-panel"><div className="panel-heading"><h2>A clear next step</h2><span>Editable · unsent · unaccepted</span></div><div className="draft-content"><p className="eyebrow">YOUR WORDS, YOUR DECISION</p><h3>Keep the relationship. Clarify the scope.</h3><p className="muted small">This starting draft is assembled from the review. Edit it before sharing.</p><label className="field-label" htmlFor="draft-text">Your reply</label><textarea id="draft-text" value={draft.text} maxLength={20_000} onChange={e => onChange({ text: e.target.value })} rows={15} />
    <details className="proposal"><summary>Add your own fee or schedule proposal</summary><div className="proposal-grid"><div><label className="field-label" htmlFor="fee">Proposed additional fee</label><input id="fee" placeholder="e.g. INR 8,000" value={draft.fee} maxLength={120} onChange={e => onChange({ fee: e.target.value })} /></div><div><label className="field-label" htmlFor="schedule">Proposed schedule impact</label><input id="schedule" placeholder="e.g. 3 days after approval" value={draft.schedule} maxLength={160} onChange={e => onChange({ schedule: e.target.value })} /></div></div><button className="button" onClick={appendProposal}><Plus size={14} /> Append proposal to reply</button><p className="small muted">These are your proposed terms. Nothing is sent or accepted automatically.</p></details>
    <div className="draft-actions"><button className="button" onClick={() => downloadText('scopeledger-reply.txt', draft.text)}><Download size={14} /> TXT</button><button className="button" onClick={() => downloadText('scopeledger-reply.md', draft.text, 'text/markdown;charset=utf-8')}><Download size={14} /> Markdown</button><button className="button primary" onClick={() => void copy()}><Copy size={14} /> Copy draft</button></div>
  </div></section>;
}
