import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { resolveEvidence } from '../../shared/evidence';
import type { ReviewItem, SourceDocument, Term } from '../../shared/schema';

export function AnnotationEditor({
  document,
  value,
  onSave,
  onClose,
}: {
  document: SourceDocument;
  value: Term | ReviewItem;
  onSave: (value: Term | ReviewItem) => void;
  onClose: () => void;
}) {
  const isTerm = 'category' in value;
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(value.title);
  const [explanation, setExplanation] = useState(
    isTerm || value.recordedByUser ? value.explanation : '',
  );
  const [status, setStatus] = useState(isTerm ? value.status : value.verdict);
  const [quotes, setQuotes] = useState(
    value.evidence.map((e) => ({ blockId: e.blockId, quote: e.quote })),
  );
  const [error, setError] = useState('');
  useEffect(() => {
    if (dialog.current?.showModal) dialog.current.showModal();
    else dialog.current?.setAttribute('open', '');
  }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (!title.trim() || !explanation.trim())
        throw new Error('Add a title and your explanation.');
      const evidence = quotes.map((q) => resolveEvidence(document, q));
      const common = { ...value, title: title.trim(), explanation: explanation.trim(), evidence };
      onSave(
        isTerm
          ? { ...common, category: value.category, status: status as Term['status'] }
          : {
              ...common,
              verdict: status as ReviewItem['verdict'],
              basis: status === 'unclear' ? 'missing_context' : 'explicit',
            },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check your entry.');
    }
  }
  return (
    <dialog
      ref={dialog}
      className="intake-dialog annotation-dialog"
      aria-labelledby="annotation-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <form onSubmit={submit}>
        <div className="dialog-top">
          <span className="eyebrow">YOUR READING OF THE AGREEMENT</span>
          <button type="button" className="icon-button" aria-label="Close editor" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <h2 id="annotation-title">
          {isTerm ? 'Make this term useful.' : 'Record your scope decision.'}
        </h2>
        <p className="small muted">
          Read conditions and exceptions in the full source. Your interpretation is recorded
          locally; no AI is used.
        </p>
        <label className="field-label" htmlFor="annotation-summary">
          Summary title
        </label>
        <input
          id="annotation-summary"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={isTerm ? 160 : 180}
          required
        />
        <label className="field-label" htmlFor="annotation-status">
          {isTerm ? 'Term status' : 'Scope decision'}
        </label>
        <select
          id="annotation-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          {isTerm ? (
            <>
              <option value="unclear">Needs review or clarification</option>
              <option value="found">Confirmed by me</option>
              <option value="not_found">I could not find a term</option>
            </>
          ) : (
            <>
              <option value="unclear">Needs clarification</option>
              <option value="included">Appears included — my decision</option>
              <option value="addition">Potential addition — my decision</option>
            </>
          )}
        </select>
        <label className="field-label" htmlFor="annotation-explanation">
          Your explanation
        </label>
        <textarea
          id="annotation-explanation"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={3}
          maxLength={1600}
          required
        />
        <h3>Supporting words</h3>
        <p className="small muted">
          Confirmed terms and included/additional decisions need an exact quote. Select any passage,
          then quote up to 1,000 characters verbatim. Suggested passages are starting points only.
        </p>
        {quotes.map((q, i) => {
          const block = document.blocks.find((b) => b.id === q.blockId);
          return (
            <fieldset className="quote-editor" key={i}>
              <legend>Quote {i + 1}</legend>
              <label className="field-label" htmlFor={`source-${i}`}>
                Source passage {i + 1}
              </label>
              <select
                id={`source-${i}`}
                value={q.blockId}
                onChange={(e) => {
                  const selected = document.blocks.find((b) => b.id === e.target.value)!;
                  setQuotes((qs) =>
                    qs.map((entry, n) =>
                      n === i
                        ? {
                            blockId: selected.id,
                            quote: selected.text.length <= 1000 ? selected.text : '',
                          }
                        : entry,
                    ),
                  );
                }}
              >
                {document.blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.page ? `Page ${b.page} · ` : ''}
                    {b.id} — {b.text.slice(0, 90)}
                  </option>
                ))}
              </select>
              <details>
                <summary>Read the full passage</summary>
                <p className="source-passage">{block?.text}</p>
              </details>
              <label className="field-label" htmlFor={`quote-${i}`}>
                Exact quote {i + 1}
              </label>
              <textarea
                id={`quote-${i}`}
                rows={3}
                value={q.quote}
                onChange={(e) =>
                  setQuotes((qs) =>
                    qs.map((entry, n) => (n === i ? { ...entry, quote: e.target.value } : entry)),
                  )
                }
                required
              />
              <div className="quote-actions">
                <span className="small muted">{q.quote.length} / 1,000 characters</span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setQuotes((qs) => qs.filter((_, n) => n !== i))}
                >
                  Remove quote {i + 1}
                </button>
              </div>
            </fieldset>
          );
        })}
        <button
          type="button"
          className="button"
          disabled={quotes.length >= 6}
          onClick={() => {
            const b = document.blocks[0];
            setQuotes((qs) => [
              ...qs,
              { blockId: b.id, quote: b.text.length <= 1000 ? b.text : '' },
            ]);
          }}
        >
          <Plus size={14} /> Add source quote
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary">{isTerm ? 'Save term' : 'Save decision'}</button>
        </div>
      </form>
    </dialog>
  );
}
