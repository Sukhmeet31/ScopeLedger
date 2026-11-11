import { z } from 'zod';
import { createDocument } from './documents';
import { verifyBrief, verifyReview } from './evidence';
import {
  BriefOutputSchema,
  DocumentInputSchema,
  LIMITS,
  ReviewOutputSchema,
  type Project,
} from './schema';

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const record = z.object({
  schemaVersion: z.literal(1),
  mode: z.enum(['sample', 'live', 'imported', 'local']).optional(),
  document: z.object({ hash, input: DocumentInputSchema }),
  brief: BriefOutputSchema.extend({ documentHash: hash }),
  reviews: z
    .array(
      ReviewOutputSchema.extend({
        workflow: z.literal('local').optional(),
        id: z.string().min(1).max(80),
        documentHash: hash,
        request: z.string().max(LIMITS.request),
        context: z.string().max(LIMITS.request),
        createdAt: z.iso.datetime(),
      }),
    )
    .max(LIMITS.reviews),
  drafts: z
    .array(
      z.object({
        reviewId: z.string().min(1).max(80),
        text: z.string().max(LIMITS.draft),
        fee: z.string().max(120),
        schedule: z.string().max(160),
        needsReview: z.boolean().optional(),
      }),
    )
    .max(LIMITS.reviews),
  note: z.string().max(5000),
});

export async function parseProject(raw: unknown): Promise<Project> {
  const value = record.parse(raw);
  const document = await createDocument(value.document.input);
  if (document.hash !== value.document.hash || value.brief.documentHash !== document.hash)
    throw new Error('The stored document version does not match its analysis.');
  const brief = verifyBrief(document, value.brief, { kind: 'imported' });
  const reviews = value.reviews.map((r) => {
    if (r.documentHash !== document.hash)
      throw new Error('A review belongs to a different document version.');
    return {
      ...verifyReview(document, r, {
        request: r.request,
        context: r.context,
        provenance: { kind: 'imported' },
      }),
      id: r.id,
      createdAt: r.createdAt,
      ...(r.workflow === 'local' || value.mode === 'local' ? { workflow: 'local' as const } : {}),
    };
  });
  if (new Set(reviews.map((r) => r.id)).size !== reviews.length)
    throw new Error('Duplicate review identifiers.');
  if (
    new Set(value.drafts.map((d) => d.reviewId)).size !== value.drafts.length ||
    value.drafts.some((d) => !reviews.some((r) => r.id === d.reviewId))
  )
    throw new Error('A draft must refer to exactly one saved review.');
  return {
    schemaVersion: 1,
    mode: value.mode === 'local' ? 'local' : 'imported',
    document,
    brief,
    reviews,
    drafts: value.drafts,
    note: value.note,
  };
}
