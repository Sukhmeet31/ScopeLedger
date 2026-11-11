import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  FileText,
  MessageSquare,
  PenLine,
  Plus,
  Download,
  Upload,
  X,
  Layers,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import type { DocumentInput, Draft, Evidence, Project } from '../shared/schema';
import { LIMITS } from '../shared/schema';
import { loadSample, reviewSample, type SampleScenario } from '../shared/sample';
import { buildDraft } from '../shared/drafts';
import { parseProject } from '../shared/project';
import { requestBrief, requestReview } from './api';
import { appendReview } from './workspace';
import { saveProject, restoreProject, clearProject } from './storage';
import { downloadText } from './files';
import { BriefView } from './components/BriefView';
import { ReviewView } from './components/ReviewView';
import { DraftView } from './components/DraftView';
import { EvidencePanel } from './components/EvidencePanel';
import { Intake } from './components/Intake';

type View = 'brief' | 'review' | 'draft';
const HEADINGS = {
  brief: [
    'THE PROJECT BRIEF',
    'Know what you agreed.',
    'Your key terms, with the original words always in reach.',
  ],
  review: [
    'THE SCOPE CHECK',
    'New request. Clear boundaries.',
    'See what fits, what changes, and what needs a conversation.',
  ],
  draft: [
    'THE NEXT CONVERSATION',
    'Put clarity into words.',
    'A thoughtful reply, ready for your own voice.',
  ],
};
export default function App() {
  const [project, setProject] = useState<Project | null>(null);
  const [view, setView] = useState<View>('brief');
  const [reviewId, setReviewId] = useState('');
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  function showEvidence(next: Evidence) {
    setEvidence(next);
    setFocusRequest((v) => v + 1);
  }
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [intake, setIntake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const operation = useRef(0);
  const abort = useRef<AbortController | null>(null);
  function cancel() {
    operation.current++;
    abort.current?.abort();
    setBusy(false);
  }
  function replace(next: Project) {
    cancel();
    setProject(next);
    setView('brief');
    setReviewId(next.reviews[0]?.id ?? '');
    setEvidence(next.brief.terms.find((t) => t.category === 'payment')?.evidence[0] ?? null);
    setFocusRequest(0);
    setError('');
  }
  useEffect(() => {
    let alive = true;
    void loadSample()
      .then((p) => {
        if (alive) replace(p);
      })
      .catch(() => {
        if (alive) setError('Could not load the example. Reload this page to try again.');
      });
    void fetch('/api/status')
      .then((r) => r.json())
      .then((s) => {
        if (alive) setConfigured(s.configured === true);
      })
      .catch(() => {
        if (alive) setConfigured(false);
      });
    return () => {
      alive = false;
      operation.current++;
      abort.current?.abort();
    };
  }, []);
  const review = project?.reviews.find((r) => r.id === reviewId) ?? null;
  const draft = project?.drafts.find((d) => d.reviewId === reviewId) ?? null;
  function navigate(next: View) {
    setView(next);
    setError('');
  }
  function changeDraft(patch: Partial<Draft>) {
    setProject((p) =>
      !p || !review
        ? p
        : {
            ...p,
            drafts: [
              ...p.drafts.filter((d) => d.reviewId !== review.id),
              {
                reviewId: review.id,
                text: buildDraft(review),
                fee: '',
                schedule: '',
                ...p.drafts.find((d) => d.reviewId === review.id),
                ...patch,
              },
            ],
          },
    );
  }
  function prepareDraft() {
    if (!review) return;
    if (!draft) changeDraft({});
    navigate('draft');
  }
  async function sample(key?: SampleScenario) {
    cancel();
    const version = operation.current;
    try {
      if (!key || !project) {
        const next = await loadSample();
        if (version === operation.current) replace(next);
      } else {
        const next = await reviewSample(key);
        if (version === operation.current) {
          setProject((p) => (p ? appendReview(p, next) : p));
          setReviewId(next.id);
          setEvidence(next.items.flatMap((i) => i.evidence)[0] ?? null);
        }
      }
    } catch {
      setError('The example could not be loaded. Your current work is still here.');
    }
  }
  async function analyze(input: DocumentInput) {
    cancel();
    const version = operation.current;
    abort.current = new AbortController();
    setBusy(true);
    setError('');
    try {
      const next = await requestBrief(input, abort.current.signal);
      if (version === operation.current) {
        replace(next);
        setIntake(false);
        setMessage('Agreement analyzed. Review the citations and any open questions.');
      }
    } catch (e) {
      if (version === operation.current)
        setError(e instanceof Error ? e.message : 'Analysis failed. Please try again.');
    } finally {
      if (version === operation.current) setBusy(false);
    }
  }
  async function analyzeRequest(request: string, context: string) {
    if (!project) return;
    cancel();
    const version = operation.current;
    abort.current = new AbortController();
    setBusy(true);
    setError('');
    try {
      const next = await requestReview(project.document, request, context, abort.current.signal);
      if (version === operation.current) {
        setProject((p) => (p ? appendReview(p, next) : p));
        setReviewId(next.id);
        setEvidence(next.items.flatMap((i) => i.evidence)[0] ?? null);
      }
    } catch (e) {
      if (version === operation.current)
        setError(e instanceof Error ? e.message : 'Review failed. Please try again.');
    } finally {
      if (version === operation.current) setBusy(false);
    }
  }
  async function restore() {
    cancel();
    const version = operation.current;
    try {
      const next = await restoreProject();
      if (version !== operation.current) return;
      if (next) {
        replace(next);
        setMessage('Restored saved project. Imported findings remain yours to verify.');
      } else setMessage('There is no saved project on this device yet.');
    } catch {
      setError('Could not restore this record. Your current project is unchanged.');
    }
  }
  async function importRecord(file: File) {
    cancel();
    const version = operation.current;
    try {
      if (file.size > LIMITS.fileBytes) throw new Error('Record exceeds 10 MB.');
      const next = await parseProject(JSON.parse(await file.text()));
      if (version === operation.current) {
        replace(next);
        setMessage(
          'Project imported. Source quotes were checked; imported interpretations are not freshly analyzed.',
        );
      }
    } catch {
      if (version === operation.current)
        setError(
          'Could not import this project record. Check its format and size. Your current project is unchanged.',
        );
    }
  }
  if (!project)
    return (
      <main className="loading">
        <Layers size={34} />
        <h1>Opening ScopeLedger…</h1>
        {error && <p role="alert">{error}</p>}
      </main>
    );
  return (
    <div className="app-shell">
      <aside className="rail">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('brief');
          }}
        >
          <span className="brand-icon">
            <Layers size={23} strokeWidth={1.5} />
          </span>
          scopeledger<span className="brand-dot">.</span>
        </a>
        <p className="brand-caption">GOOD WORK. CLEAR TERMS.</p>
        <div className="rail-section">YOUR WORKSPACE</div>
        <div className="project-chip">
          <div className="project-avatar">
            {project.document.input.title.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <strong>{project.document.input.title}</strong>
            <span>{project.mode === 'sample' ? 'Example project' : 'Current project'}</span>
          </div>
        </div>
        <nav aria-label="Workspace">
          <button
            className={view === 'brief' ? 'active' : ''}
            aria-current={view === 'brief' ? 'page' : undefined}
            aria-label="Project brief"
            onClick={() => navigate('brief')}
          >
            <FileText size={18} /> Project brief <span>01</span>
          </button>
          <button
            className={view === 'review' ? 'active' : ''}
            aria-current={view === 'review' ? 'page' : undefined}
            aria-label="Request review"
            onClick={() => navigate('review')}
          >
            <MessageSquare size={18} /> Request review <span>02</span>
          </button>
          <button
            className={view === 'draft' ? 'active' : ''}
            aria-current={view === 'draft' ? 'page' : undefined}
            aria-label="Drafts"
            onClick={() => navigate('draft')}
          >
            <PenLine size={18} /> Drafts <span>03</span>
          </button>
        </nav>
        <div className="rail-bottom">
          <div className="little-mark">↗</div>
          <h3>
            Your work.
            <br />
            Clear boundaries.
          </h3>
          <p>Bring the agreement back into the conversation.</p>
          <button className="text-button" onClick={() => void sample()}>
            <RotateCcw size={13} /> Reset to example
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>{' '}
            {view === 'brief' ? 'Project brief' : view === 'review' ? 'Request review' : 'Drafts'}
          </div>
          <div className="top-actions">
            <span className={`mode-badge ${project.mode}`}>
              {project.mode === 'sample'
                ? 'EXAMPLE WORKSPACE'
                : project.mode === 'imported'
                  ? 'IMPORTED RECORD'
                  : 'LIVE ANALYSIS'}
            </span>
            <button
              className="button compact"
              onClick={() => {
                setError('');
                setIntake(true);
              }}
            >
              <Plus size={15} /> Use your agreement
            </button>
          </div>
        </header>
        <main id="main-content">
          <div className="page-heading">
            <p className="eyebrow">{HEADINGS[view][0]}</p>
            <h1>{HEADINGS[view][1]}</h1>
            <p>{HEADINGS[view][2]}</p>
          </div>
          <div className="project-meta">
            <span className="project-tag">
              {project.mode === 'sample'
                ? 'WILLOW STUDIO · WEBSITE REDESIGN'
                : project.document.input.title}
            </span>
            <span>
              <ShieldCheck size={14} /> Quotes checked against supplied text
            </span>
          </div>
          {project.mode === 'sample' ? (
            <div className="example-note">
              <span className="status-dot" /> Explore a fictional project. All findings are
              prewritten examples.
              <button
                className="text-button"
                onClick={() => {
                  setError('');
                  setIntake(true);
                }}
              >
                Start your own <ArrowUpRight size={13} />
              </button>
            </div>
          ) : (
            <div className="example-note">
              {project.mode === 'imported'
                ? 'Imported findings — verify the interpretation against the source.'
                : `AI-assisted findings · ${project.brief.provenance.model}. Review before relying on them.`}
            </div>
          )}
          {message && (
            <div className="notice toast" role="status">
              {message}
              <button
                className="icon-button"
                aria-label="Dismiss notice"
                onClick={() => setMessage('')}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {error && !intake && (
            <div className="error toast" role="alert">
              {error}
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError('')}
              >
                <X size={15} />
              </button>
            </div>
          )}
          <div className="workspace-grid">
            <div className="main-column">
              {view === 'brief' ? (
                <BriefView
                  project={project}
                  onEvidence={showEvidence}
                  onReview={() => navigate('review')}
                  onNote={(note) => setProject((p) => (p ? { ...p, note } : p))}
                />
              ) : view === 'review' ? (
                <ReviewView
                  key={project.document.id}
                  project={project}
                  review={review}
                  busy={busy}
                  onSample={(key) => void sample(key)}
                  onAnalyze={(request, context) => void analyzeRequest(request, context)}
                  onEvidence={showEvidence}
                  onDraft={prepareDraft}
                  onSelect={(id) => {
                    setReviewId(id);
                    setEvidence(
                      project.reviews
                        .find((r) => r.id === id)
                        ?.items.flatMap((i) => i.evidence)[0] ?? null,
                    );
                  }}
                />
              ) : (
                <DraftView
                  draft={draft}
                  onChange={changeDraft}
                  onMessage={setMessage}
                  onReview={() => navigate('review')}
                />
              )}
            </div>
            <aside className="source-column">
              <div className="source-eyebrow">
                THE ORIGINAL WORDS <span>↙</span>
              </div>
              <EvidencePanel
                key={project.document.id}
                document={project.document}
                selected={evidence}
                focusRequest={focusRequest}
              />
              <div className="source-tip">
                <span>↳</span>
                <p>Click any source link to see the exact words behind a finding.</p>
              </div>
            </aside>
          </div>
          <section className="records" aria-label="Project records">
            <div>
              <strong>Your workspace, your choice.</strong>
              <p>Not saved automatically. Browser saves and exports include the full agreement.</p>
            </div>
            <div className="record-actions">
              <button
                onClick={() => {
                  try {
                    saveProject(project);
                    setMessage('Saved on this device. Later edits need another save.');
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Save on this device
              </button>
              <button onClick={() => void restore()}>Restore saved project</button>
              <button
                onClick={() =>
                  downloadText(
                    'scopeledger-project.json',
                    JSON.stringify(project, null, 2),
                    'application/json',
                  )
                }
              >
                <Download size={13} /> Export
              </button>
              <label className="file-button">
                <Upload size={13} /> Import
                <input
                  type="file"
                  aria-label="Import project record"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void importRecord(file);
                    e.target.value = '';
                  }}
                />
              </label>
              <button
                onClick={() => {
                  try {
                    clearProject();
                    setMessage('Saved browser copy deleted. The open workspace is still here.');
                  } catch {
                    setError('This browser would not allow deleting the saved copy.');
                  }
                }}
              >
                Delete saved copy
              </button>
            </div>
          </section>
          <footer className="page-footer">
            <span>Scope clarity for independent work.</span>
            <span>A working aid, not legal advice or a guarantee.</span>
          </footer>
        </main>
      </div>
      {intake && (
        <Intake
          onClose={() => {
            cancel();
            setIntake(false);
            setError('');
          }}
          onAnalyze={analyze}
          busy={busy}
          error={error}
          configured={configured}
        />
      )}
    </div>
  );
}
