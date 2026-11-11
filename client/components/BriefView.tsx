import { ArrowRight, ArrowUpRight, CircleHelp } from 'lucide-react';
import { CATEGORY_LABELS, type Evidence, type Project } from '../../shared/schema';
export function BriefView({
  project,
  onEvidence,
  onReview,
  onNote,
}: {
  project: Project;
  onEvidence: (e: Evidence) => void;
  onReview: () => void;
  onNote: (text: string) => void;
}) {
  const order = ['payment', 'revisions', 'deliverables', 'exclusions', 'timeline', 'ownership'];
  return (
    <>
      <div className="brief-grid">
        {[...project.brief.terms]
          .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category))
          .map((term) => (
            <article
              key={term.category}
              className={`term panel ${term.category === 'deliverables' || term.category === 'exclusions' ? 'wide' : ''}`}
            >
              <div className="term-label">
                {CATEGORY_LABELS[term.category]}
                {term.status !== 'found' && (
                  <span className="uncertain-tag">
                    {term.status === 'unclear' ? 'Unclear' : 'Not found in supplied text'}
                  </span>
                )}
              </div>
              <h2>{term.title}</h2>
              <p>{term.explanation}</p>
              <div className="citations">
                {term.evidence.map((e, i) => (
                  <button
                    key={i}
                    className="citation"
                    aria-label={`View ${term.category} evidence${i ? ` ${i + 1}` : ''}`}
                    onClick={() => onEvidence(e)}
                  >
                    {e.page ? `Page ${e.page}` : 'Source'} · {CATEGORY_LABELS[term.category]}{' '}
                    <ArrowUpRight size={12} />
                  </button>
                ))}
              </div>
            </article>
          ))}
      </div>
      {project.brief.questions.length > 0 && (
        <div className="questions panel">
          <CircleHelp size={18} />
          <div>
            <h3>Worth clarifying before you commit</h3>
            <ul>
              {project.brief.questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <div className="next-action">
        <div>
          <h3>Something new from the client?</h3>
          <p>Check the request against the terms above.</p>
        </div>
        <button className="button primary" onClick={onReview}>
          Review a request <ArrowRight size={15} />
        </button>
      </div>
      <details className="notes">
        <summary>Your private project note</summary>
        <label className="sr-only" htmlFor="project-note">
          Personal project note
        </label>
        <textarea
          id="project-note"
          value={project.note}
          onChange={(e) => onNote(e.target.value)}
          maxLength={5000}
          rows={3}
          placeholder="Your note — separate from the agreement and AI analysis."
        />
        <p className="small muted">
          Notes are not sent to AI and do not change the quoted terms. Save or export to keep them.
        </p>
      </details>
    </>
  );
}
