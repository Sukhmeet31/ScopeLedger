import { describe, expect, it } from 'vitest';
import { createDocument } from '../shared/documents';
import { resolveEvidence, verifyBrief, verifyReview } from '../shared/evidence';

describe('source identity and coverage', () => {
  it('preserves Unicode offsets and actual PDF pages', async () => {
    const doc = await createDocument({ title: 'Agreement', kind: 'pdf', pages: ['Hello 🌿.\n\nTwo revisions.', 'Fee: ₹60,000.'] });
    expect(doc.text).toBe('Hello 🌿.\n\nTwo revisions.\n\nFee: ₹60,000.');
    expect(doc.blocks[1]).toMatchObject({ id: 'p1-b2', page: 1, start: 11, end: 25, text: 'Two revisions.' });
    expect(resolveEvidence(doc, { blockId: 'p2-b1', quote: '₹60,000' })).toMatchObject({ start: 32, end: 39, page: 2 });
  });
  it('changes identity when source pages change', async () => {
    const a = await createDocument({ title: 'A', kind: 'text', pages: ['Two rounds.'] });
    const b = await createDocument({ title: 'A', kind: 'text', pages: ['Three rounds.'] });
    expect(a.hash).not.toBe(b.hash);
    expect(a.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(a.blocks[0].page).toBeUndefined();
  });
  it.each([
    ['blank', { title: 'A', kind: 'text', pages: ['  '] }, /text/i],
    ['scanned page', { title: 'A', kind: 'pdf', pages: ['Terms', ''] }, /page 2/i],
    ['page limit', { title: 'A', kind: 'pdf', pages: Array(31).fill('Terms') }, /30/],
    ['character limit', { title: 'A', kind: 'text', pages: ['x'.repeat(60001)] }, /60,000/],
  ])('rejects %s instead of truncating', async (_name, input, error) => {
    await expect(createDocument(input)).rejects.toThrow(error);
  });
});

describe('evidence validation', () => {
  it('rejects unknown blocks and invented quotations', async () => {
    const doc = await createDocument({ title: 'A', kind: 'text', pages: ['Two revisions included.'] });
    expect(() => resolveEvidence(doc, { blockId: 'p9-b1', quote: 'Two revisions' })).toThrow(/source/i);
    expect(() => resolveEvidence(doc, { blockId: 'p1-b1', quote: 'Unlimited revisions' })).toThrow(/quote/i);
  });
  it('rejects an ambiguous repeated quote in the same block', async () => {
    const doc = await createDocument({ title: 'A', kind: 'text', pages: ['Pay now. Pay now.'] });
    expect(() => resolveEvidence(doc, { blockId: 'p1-b1', quote: 'Pay now.' })).toThrow(/ambiguous/i);
  });
  it('requires evidence for an included verdict and rejects unsupported verdicts', async () => {
    const doc = await createDocument({ title: 'A', kind: 'text', pages: ['Two revisions included.'] });
    const item = { title: 'Another revision', verdict: 'included', explanation: 'Covered.', evidence: [] };
    expect(() => verifyReview(doc, { items: [item], questions: [] })).toThrow();
    expect(() => verifyReview(doc, { items: [{ ...item, verdict: 'safe' }], questions: [] })).toThrow();
  });
  it('allows an explicit clarification with missing evidence', async () => {
    const doc = await createDocument({ title: 'A', kind: 'text', pages: ['Website design.'] });
    const review = verifyReview(doc, { items: [{ title: 'Revisions', verdict: 'unclear', explanation: 'No allowance supplied.', evidence: [] }], questions: ['How many rounds were agreed?'] });
    expect(review.items[0].verdict).toBe('unclear');
    expect(review.documentHash).toBe(doc.hash);
  });
  it('requires all six unique brief categories', async () => {
    const doc = await createDocument({ title: 'A', kind: 'text', pages: ['Website design.'] });
    expect(() => verifyBrief(doc, { terms: [], questions: [] })).toThrow();
  });
});
