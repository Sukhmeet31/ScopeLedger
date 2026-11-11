import { z } from 'zod';

export const LIMITS = {
  fileBytes: 10 * 1024 * 1024,
  pages: 30,
  characters: 60_000,
  request: 5_000,
  reviews: 20,
  draft: 32_000,
} as const;
export const CATEGORIES = [
  'deliverables',
  'exclusions',
  'revisions',
  'payment',
  'timeline',
  'ownership',
] as const;
export const CATEGORY_LABELS = {
  deliverables: 'Deliverables',
  exclusions: 'Exclusions',
  revisions: 'Revision allowance',
  payment: 'Payment terms',
  timeline: 'Timeline & dependencies',
  ownership: 'Ownership & handoff',
};
const sentence = z.string().trim().min(1).max(1600);
export const DocumentInputSchema = z.strictObject({
  title: z.string().trim().min(1).max(180),
  kind: z.enum(['text', 'pdf']),
  pages: z
    .array(z.string().max(LIMITS.characters, 'Use an agreement of at most 60,000 characters.'))
    .min(1)
    .max(LIMITS.pages, 'Use a PDF of at most 30 pages.'),
});
export const CitationSchema = z.object({
  blockId: z.string().min(1).max(40),
  quote: z.string().min(1).max(1000),
});
const citations = z.array(CitationSchema).max(6);
const term = z.object({
  category: z.enum(CATEGORIES),
  status: z.enum(['found', 'unclear', 'not_found']),
  title: z.string().min(1).max(160),
  explanation: sentence,
  evidence: citations,
});
export const BriefOutputSchema = z.object({
  terms: z.array(term).length(6),
  questions: z.array(sentence).max(8),
});
const item = z.object({
  recordedByUser: z.boolean().optional(),
  title: z.string().min(1).max(180),
  verdict: z.enum(['included', 'addition', 'unclear']),
  explanation: sentence,
  evidence: citations,
  basis: z.enum(['explicit', 'missing_context', 'conflict', 'not_stated']).default('explicit'),
});
export const ReviewOutputSchema = z.object({
  items: z.array(item).min(1).max(12),
  questions: z.array(sentence).max(8),
});
export const ReviewInputSchema = z.strictObject({
  document: DocumentInputSchema,
  request: z.string().trim().min(1).max(LIMITS.request),
  context: z.string().trim().max(LIMITS.request).default(''),
});
export type DocumentInput = z.infer<typeof DocumentInputSchema>;
export type SourceBlock = { id: string; page?: number; start: number; end: number; text: string };
export type SourceDocument = {
  schemaVersion: 1;
  id: string;
  hash: string;
  input: DocumentInput;
  text: string;
  blocks: SourceBlock[];
  createdAt: string;
};
export type Evidence = z.infer<typeof CitationSchema> & {
  start: number;
  end: number;
  page?: number;
};
export type Provenance = {
  kind: 'example' | 'provider' | 'imported' | 'local' | 'manual';
  model?: string;
};
export type Term = Omit<z.infer<typeof term>, 'evidence'> & { evidence: Evidence[] };
export type ReviewItem = Omit<z.infer<typeof item>, 'evidence'> & { evidence: Evidence[] };
export type ProjectBrief = {
  documentHash: string;
  terms: Term[];
  questions: string[];
  provenance: Provenance;
  createdAt: string;
};
export type RequestReview = {
  workflow?: 'local';
  id: string;
  documentHash: string;
  request: string;
  context: string;
  items: ReviewItem[];
  questions: string[];
  provenance: Provenance;
  createdAt: string;
};
export type Draft = {
  reviewId: string;
  text: string;
  fee: string;
  schedule: string;
  needsReview?: boolean;
};
export type Project = {
  schemaVersion: 1;
  mode: 'sample' | 'live' | 'imported' | 'local';
  document: SourceDocument;
  brief: ProjectBrief;
  reviews: RequestReview[];
  drafts: Draft[];
  note: string;
};
