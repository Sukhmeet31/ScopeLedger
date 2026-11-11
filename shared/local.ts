import { createDocument } from './documents';
import { resolveEvidence, verifyBrief, verifyReview } from './evidence';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  ReviewInputSchema,
  type DocumentInput,
  type Evidence,
  type Project,
  type ProjectBrief,
  type RequestReview,
  type ReviewItem,
  type SourceBlock,
  type SourceDocument,
  type Term,
} from './schema';

// Retrieval hints only. These expressions never establish meaning or scope.
const keywords: Record<Term['category'], RegExp> = {
  deliverables: /\b(deliverables?|scope|services?|include[ds]?|provide[ds]?|design|develop\w*)\b/i,
  exclusions: /\b(exclud\w*|exclusions?|out.of.scope|not included|separate\w*|additional\w*)\b/i,
  revisions: /\b(revisions?|rounds?|amendments?|changes?|feedback)\b/i,
  payment: /\b(pay\w*|fees?|deposits?|invoices?|price|cost|refund\w*)\b/i,
  timeline:
    /\b(deadlines?|timelines?|schedule\w*|weeks?|days?|dates?|delivery|approval|depend\w*)\b/i,
  ownership:
    /\b(ownership|copyright|intellectual|licen[cs]\w*|handoff|rights?|transfers?|source files)\b/i,
};

function passage(doc: SourceDocument, block: SourceBlock, matchAt: number): Evidence | null {
  const start = Math.max(0, Math.min(matchAt - 160, block.text.length - 1000));
  const quote = block.text.slice(start, start + 1000);
  try {
    return resolveEvidence(doc, { blockId: block.id, quote });
  } catch {
    return null;
  }
}

export async function createLocalProject(input: DocumentInput): Promise<Project> {
  const document = await createDocument(input);
  const terms = CATEGORIES.map((category) => {
    const evidence = document.blocks
      .flatMap((block) => {
        const match = keywords[category].exec(block.text);
        const e = match ? passage(document, block, match.index) : null;
        return e ? [e] : [];
      })
      .slice(0, 3);
    return {
      category,
      status: 'unclear',
      title: `${CATEGORY_LABELS[category]} to review`,
      evidence,
      explanation: evidence.length
        ? 'Keyword matches suggest these passages may be relevant. Read the full agreement, then edit and confirm your summary.'
        : 'No keyword match. This does not mean the agreement has no relevant term. Read the source and add a quote yourself.',
    };
  });
  return {
    schemaVersion: 1,
    mode: 'local',
    document,
    brief: verifyBrief(
      document,
      {
        terms,
        questions: [
          'Have you checked the full agreement for exceptions, conditions, and related clauses?',
          'Which terms need a conversation with the client before work starts?',
        ],
      },
      { kind: 'local' },
    ),
    reviews: [],
    drafts: [],
    note: '',
  };
}

const stopwords = new Set(
  'about after again also before could from have into just more only please should that their them then there these they this want what when where which with would your'.split(
    ' ',
  ),
);
export function reviewLocal(
  document: SourceDocument,
  request: string,
  context: string,
): RequestReview {
  const input = ReviewInputSchema.parse({ document: document.input, request, context });
  const words = [
    ...new Set(
      (input.request.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !stopwords.has(w)),
    ),
  ];
  const related = document.blocks
    .map((block) => {
      const lower = block.text.toLowerCase();
      const matches = words.filter((w) => lower.includes(w));
      return { block, score: matches.length, at: matches.length ? lower.indexOf(matches[0]) : -1 };
    })
    .filter((b) => b.score > 0)
    .sort((a, b) => b.score - a.score);
  const evidence = related
    .flatMap(({ block, at }) => {
      const e = passage(document, block, at);
      return e ? [e] : [];
    })
    .slice(0, 3);
  return verifyReview(
    document,
    {
      items: [
        {
          title: input.request.length > 180 ? input.request.slice(0, 177) + '…' : input.request,
          verdict: 'unclear',
          basis: 'missing_context',
          evidence,
          explanation:
            'No scope decision has been made. These are word matches, not an interpretation. Read the full request and agreement, then record your decision and reasoning.',
        },
      ],
      questions: [
        'Does the request contain separate changes or conditions? Review each before recording an overall decision.',
        'Are revision usage, approvals, and any later agreements clear? Ask the client about anything unresolved.',
      ],
    },
    { request: input.request, context: input.context, provenance: { kind: 'local' } },
  );
}

export function updateLocalTerm(
  document: SourceDocument,
  brief: ProjectBrief,
  term: Term,
): ProjectBrief {
  if (brief.documentHash !== document.hash)
    throw new Error('The brief belongs to another agreement.');
  return verifyBrief(
    document,
    { ...brief, terms: brief.terms.map((t) => (t.category === term.category ? term : t)) },
    { kind: 'manual' },
  );
}

export function updateLocalDecision(
  document: SourceDocument,
  review: RequestReview,
  index: number,
  item: ReviewItem,
): RequestReview {
  if (review.documentHash !== document.hash)
    throw new Error('The review belongs to another agreement.');
  if (!Number.isInteger(index) || index < 0 || index >= review.items.length)
    throw new Error('Unknown review item.');
  return {
    ...verifyReview(
      document,
      { ...review, items: review.items.map((i, n) => (n === index ? item : i)) },
      { request: review.request, context: review.context, provenance: { kind: 'manual' } },
    ),
    id: review.id,
    createdAt: review.createdAt,
  };
}
