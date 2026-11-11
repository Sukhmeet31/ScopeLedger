import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FileUp, X, ArrowRight, LoaderCircle } from 'lucide-react';
import { createDocument } from '../../shared/documents';
import { LIMITS, type DocumentInput } from '../../shared/schema';
import { readAgreement } from '../files';
export function Intake({ onClose, onAnalyze, busy, error, configured }: { onClose: () => void; onAnalyze: (input: DocumentInput) => Promise<void>; busy: boolean; error: string; configured: boolean | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState('My project agreement');
  const [text, setText] = useState('');
  const [fileInput, setFileInput] = useState<DocumentInput | null>(null);
  const [reading, setReading] = useState(false);
  const [localError, setLocalError] = useState('');
  const fileVersion = useRef(0);
  useEffect(() => { const el = dialog.current; if (el?.showModal) el.showModal(); else el?.setAttribute('open', ''); return () => { fileVersion.current++; }; }, []);
  async function selectFile(file: File) {
    const version = ++fileVersion.current; setReading(true); setLocalError('');
    try { const input = await readAgreement(file); if (version === fileVersion.current) { setFileInput(input); setTitle(input.title); setText(input.pages.join('\n\n')); } }
    catch (error) { if (version === fileVersion.current) setLocalError(error instanceof Error ? error.message : 'The file could not be read.'); }
    finally { if (version === fileVersion.current) setReading(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setLocalError('');
    try { const input = fileInput ? { ...fileInput, title } : { title, kind: 'text' as const, pages: [text] }; const document = await createDocument(input); await onAnalyze(document.input); }
    catch (error) { setLocalError(error instanceof Error ? error.message : 'Check the agreement and try again.'); }
  }
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); onClose(); }} aria-labelledby="intake-title" className="intake-dialog"><form onSubmit={submit}>
    <div className="dialog-top"><span className="eyebrow">START WITH WHAT’S AGREED</span><button type="button" onClick={onClose} className="icon-button" aria-label="Close agreement intake"><X size={20} /></button></div>
    <h2 id="intake-title">Bring your agreement.</h2><p className="muted">English agreements · PDF or TXT · up to 10 MB, 30 pages, 60,000 characters.</p>
    <label className="upload-zone"><FileUp size={27} strokeWidth={1.4} /><strong>{reading ? 'Extracting text on your device…' : 'Choose a text-based PDF or TXT'}</strong><span>Scanned PDFs and DOCX are not supported yet.</span><input aria-label="Upload agreement" type="file" accept=".pdf,.txt" disabled={reading || busy} onChange={e => { const file = e.target.files?.[0]; if (file) void selectFile(file); e.target.value = ''; }} /></label>
    <label className="field-label" htmlFor="agreement-title">Project or agreement name</label><input id="agreement-title" value={title} maxLength={180} onChange={e => setTitle(e.target.value)} required />
    <div className="label-row"><label className="field-label" htmlFor="agreement-text">{fileInput ? 'Extracted text preview' : 'Or paste the agreement'}</label>{fileInput && <button type="button" className="text-button" onClick={() => setFileInput(null)}>Edit as verified plain text</button>}</div>
    <textarea id="agreement-text" value={text} onChange={e => setText(e.target.value)} readOnly={Boolean(fileInput)} placeholder="Paste the full agreement, including conditions and exclusions…" rows={7} required />
    <p className="counter">{text.length.toLocaleString()} / {LIMITS.characters.toLocaleString()} characters{fileInput?.kind === 'pdf' ? ` · ${fileInput.pages.length} PDF pages` : ''}</p>
    <div className="privacy-note"><strong>You choose when text leaves this device.</strong><p>Analyze sends the extracted text to this server and its Groq AI provider. The original file is not uploaded. Saving to this browser is a separate choice.</p></div>
    {configured === false && <p className="notice">Live AI is not configured on this server yet. The example workspace works without it.</p>}
    {(localError || error) && <p className="error" role="alert">{localError || error}</p>}
    <div className="dialog-actions"><p className="small muted">A successful analysis replaces the current workspace. Export any work you want to keep.</p><button className="button primary" disabled={busy || reading || !text.trim() || text.length > LIMITS.characters}>{busy ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={16} />}{busy ? 'Analyzing agreement…' : 'Analyze agreement'}</button></div>
  </form></dialog>;
}
