import {
  BriefOutputSchema,
  CitationSchema,
  ReviewOutputSchema,
  type Evidence,
  type ProjectBrief,
  type Provenance,
  type RequestReview,
  type SourceDocument,
} from './schema';

export function resolveEvidence(doc: SourceDocument, raw: unknown): Evidence {
  const citation = CitationSchema.parse(raw);
  const block = doc.blocks.find((b) => b.id === citation.blockId);
  if (!block) throw new Error('Unknown source block.');
  const local = block.text.indexOf(citation.quote);
  if (local < 0) throw new Error('The quote does not match the source.');
  if (block.text.indexOf(citation.quote, local + 1) >= 0)
    throw new Error('Ambiguous repeated quote. A longer, unique quotation is required.');
  return {
    ...citation,
    start: block.start + local,
    end: block.start + local + citation.quote.length,
    ...(block.page ? { page: block.page } : {}),
  };
}

export function verifyBrief(
  doc: SourceDocument,
  raw: unknown,
  provenance: Provenance = { kind: 'imported' },
): ProjectBrief {
  const output = BriefOutputSchema.parse(raw);
  if (new Set(output.terms.map((t) => t.category)).size !== 6)
    throw new Error('All six unique term categories are required.');
  const terms = output.terms.map((t) => {
    if (t.status === 'found' && !t.evidence.length)
      throw new Error('A found term must cite its source.');
    return { ...t, evidence: t.evidence.map((e) => resolveEvidence(doc, e)) };
  });
  return {
    documentHash: doc.hash,
    terms,
    questions: output.questions,
    provenance,
    createdAt: new Date().toISOString(),
  };
}

export function verifyReview(
  doc: SourceDocument,
  raw: unknown,
  meta: { request?: string; context?: string; provenance?: Provenance } = {},
): RequestReview {
  const output = ReviewOutputSchema.parse(raw);
  const items = output.items.map((item) => {
    if (item.verdict !== 'unclear' && !item.evidence.length)
      throw new Error('An included or additional-work assessment requires source evidence.');
    if (item.verdict !== 'unclear' && item.basis !== 'explicit')
      throw new Error('Missing context, conflicts, and unstated terms require clarification.');
    return { ...item, evidence: item.evidence.map((e) => resolveEvidence(doc, e)) };
  });
  return {
    id: crypto.randomUUID(),
    documentHash: doc.hash,
    request: meta.request ?? '',
    context: meta.context ?? '',
    items,
    questions: output.questions,
    provenance: meta.provenance ?? { kind: 'imported' },
    createdAt: new Date().toISOString(),
  };
}
