import { createDocument } from '../shared/documents';
import { verifyBrief, verifyReview } from '../shared/evidence';
import type { DocumentInput, Project, RequestReview, SourceDocument } from '../shared/schema';
async function post(path: string, body: unknown, signal: AbortSignal) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.any([signal, AbortSignal.timeout(55_000)]) });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'The request could not be completed.');
  return data;
}
export async function requestBrief(input: DocumentInput, signal: AbortSignal): Promise<Project> {
  const document = await createDocument(input);
  const data = await post('/api/brief', { document: document.input }, signal);
  if (data.brief?.documentHash !== document.hash) throw new Error('The response belongs to a different document version.');
  const brief = verifyBrief(document, data.brief, { kind: 'provider', model: String(data.brief.provenance?.model ?? 'configured model') });
  return { schemaVersion: 1, mode: 'live', document, brief, reviews: [], drafts: [], note: '' };
}
export async function requestReview(document: SourceDocument, request: string, context: string, signal: AbortSignal): Promise<RequestReview> {
  const data = await post('/api/review', { document: document.input, request, context }, signal);
  if (data.review?.documentHash !== document.hash) throw new Error('The response belongs to a different document version.');
  return verifyReview(document, data.review, { request, context, provenance: { kind: 'provider', model: String(data.review.provenance?.model ?? 'configured model') } });
}
