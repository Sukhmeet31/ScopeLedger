import { ArrowRight, ArrowUpRight, LoaderCircle, CircleHelp } from 'lucide-react';
import { SAMPLE_SCENARIOS, type SampleScenario } from '../../shared/sample';
import { LIMITS, type Evidence, type Project, type RequestReview } from '../../shared/schema';
export const VERDICT_LABELS = {
  included: 'Appears included',
  addition: 'Potential addition',
  unclear: 'Needs clarification',
};
export function ReviewView({
  project,
  review,
  busy,
  onSample,
  onAnalyze,
  onEvidence,
  onDraft,
  onSelect,
  input,
  onInput,
  onDecision,
}: {
  project: Project;
  review: RequestReview | null;
  busy: boolean;
  onSample: (key: SampleScenario) => void;
  onAnalyze: (request: string, context: string) => void;
  onEvidence: (e: Evidence) => void;
  onDraft: () => void;
  onSelect: (id: string) => void;
  input: { request: string; context: string };
  onInput: (input: { request: string; context: string }) => void;
  onDecision: (index: number) => void;
}) {
  const { request: text, context } = input;
  const overLimit = text.length > LIMITS.request || context.length > LIMITS.request;
  const sample = project.mode === 'sample';
  return (
    <>
      <section className="panel request-panel">
        <div className="panel-heading">
          <h2>The client’s request</h2>
          <span>{sample ? 'Fictional example' : 'Your project'}</span>
        </div>
        <div className="request-content">
          {sample ? (
            <>
              <p className="overline">FROM THE CLIENT · WILLOW STUDIO</p>
              <blockquote>“{review?.request}”</blockquote>
              <div className="scenario-tabs" aria-label="Example requests">
                {Object.entries(SAMPLE_SCENARIOS).map(([key, value]) => (
                  <button
                    key={key}
                    className={review?.request === value.request ? 'selected' : ''}
                    onClick={() => onSample(key as SampleScenario)}
                  >
                    {value.label}
                  </button>
                ))}
              </div>
              <p className="small muted sample-explanation">
                Prewritten examples demonstrate the workflow. They are not live AI results.
              </p>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!busy && !overLimit && text.trim()) onAnalyze(text, context);
              }}
            >
              <label className="field-label" htmlFor="client-request">
                Paste the new request
              </label>
              <textarea
                id="client-request"
                value={text}
                onChange={(e) => onInput({ ...input, request: e.target.value })}
                rows={4}
                placeholder="Could we also add…"
                required
              />
              <p className="counter">{text.length.toLocaleString()} / 5,000 characters</p>
              <label className="field-label" htmlFor="project-context">
                Relevant project context <span className="muted">(optional)</span>
              </label>
              <textarea
                id="project-context"
                value={context}
                onChange={(e) => onInput({ ...input, context: e.target.value })}
                rows={2}
                placeholder="For example: one revision round used; first design approved."
              />
              <p className="counter">{context.length.toLocaleString()} / 5,000 characters</p>
              {overLimit && (
                <p className="error" role="alert">
                  Request and context must each be at most 5,000 characters. Your full text is
                  preserved; shorten it before continuing.
                </p>
              )}
              <p className="small muted">
                Word matching happens on this device. Review related clauses, then record your own
                decision. No AI service is used.
              </p>
              <button className="button primary" disabled={busy || overLimit || !text.trim()}>
                {busy ? <LoaderCircle className="spin" size={15} /> : <ArrowRight size={15} />}
                {busy ? 'Finding clauses…' : 'Find related clauses'}
              </button>
            </form>
          )}
          {sample && review?.context && (
            <details className="context">
              <summary>Context supplied for this example</summary>
              <p>{review.context}</p>
            </details>
          )}
        </div>
      </section>
      {review && (
        <>
          <div className="section-heading">
            <h2>Here’s how it breaks down</h2>
            <span>
              {review.items.length} {review.items.length === 1 ? 'item' : 'items'} ·{' '}
              {sample
                ? 'example'
                : review.provenance.kind === 'manual'
                  ? 'your recorded decision'
                  : review.provenance.kind === 'imported'
                    ? 'imported record'
                    : 'awaiting your decision'}
            </span>
          </div>
          {!sample && (
            <div className="reviewed-request">
              <span className="overline">REVIEWED REQUEST</span>
              <p>{review.request}</p>
              {review.context && <p className="small muted">Context: {review.context}</p>}
            </div>
          )}
          {review.items.map((item, i) => (
            <article className="finding panel" key={`${review.id}-${i}`}>
              <div className={`verdict ${item.verdict}`}>{VERDICT_LABELS[item.verdict]}</div>
              <h3>{item.title}</h3>
              <p>{item.explanation}</p>
              <div className="citations">
                {item.evidence.map((e, j) => (
                  <button key={j} className="citation" onClick={() => onEvidence(e)}>
                    {e.page ? `Page ${e.page}` : 'Source'} · View supporting clause{' '}
                    <ArrowUpRight size={12} />
                  </button>
                ))}
              </div>
              {!sample && (
                <button className="button edit-annotation" onClick={() => onDecision(i)}>
                  Record decision
                </button>
              )}
            </article>
          ))}
          {review.questions.length > 0 && (
            <div className="questions panel">
              <CircleHelp size={18} />
              <div>
                <h3>Before deciding</h3>
                <ul>
                  {review.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <div className="next-action">
            <div>
              <h3>Keep the conversation moving.</h3>
              <p>Turn the findings into an editable reply.</p>
            </div>
            <button className="button primary" onClick={onDraft}>
              Prepare a reply <ArrowRight size={15} />
            </button>
          </div>
        </>
      )}
      {project.reviews.length > 1 && (
        <details className="history">
          <summary>Request history · {project.reviews.length}</summary>
          <div>
            {project.reviews.map((r) => (
              <button
                key={r.id}
                onClick={() => onSelect(r.id)}
                className={r.id === review?.id ? 'selected' : ''}
              >
                {r.request}
                <span>{r.items.length} items</span>
              </button>
            ))}
          </div>
          <p className="small muted">
            The most recent {LIMITS.reviews} reviews are kept in this workspace.
          </p>
        </details>
      )}
    </>
  );
}
