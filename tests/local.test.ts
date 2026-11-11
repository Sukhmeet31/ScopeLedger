import { describe, expect, it } from 'vitest';
import {
  createLocalProject,
  reviewLocal,
  updateLocalTerm,
  updateLocalDecision,
} from '../shared/local';
import { parseProject } from '../shared/project';
import { replaceReview } from '../client/workspace';
import { buildDraft } from '../shared/drafts';
import { LIMITS } from '../shared/schema';

const agreement = {
  title: 'Harbor illustration agreement',
  kind: 'pdf' as const,
  pages: [
    'Deliverables: three illustrations. Two revision rounds are included.\n\nPayment: 40% deposit, remainder on delivery.',
    'Ownership transfers after full payment.\n\nDeadline: 20 December, subject to timely client feedback.\n\nAnimation is excluded.',
  ],
};

describe('local workspace', () => {
  it('can save a complete reply for a maximum-size manual review', async () => {
    const p = await createLocalProject(agreement);
    const r = reviewLocal(p.document, 'r'.repeat(5000), '');
    r.items = Array.from({ length: 12 }, () => ({
      ...r.items[0],
      title: 't'.repeat(180),
      explanation: 'e'.repeat(1600),
    }));
    let manual = r;
    for (let i = 0; i < r.items.length; i++)
      manual = updateLocalDecision(p.document, manual, i, r.items[i]);
    const text = buildDraft(manual);
    expect(text).toContain('r'.repeat(5000));
    expect(text.length).toBeLessThanOrEqual(LIMITS.draft);
    p.reviews = [manual];
    p.drafts = [{ reviewId: manual.id, text, fee: '', schedule: '' }];
    expect((await parseProject(p)).drafts[0].text).toBe(text);
  });
  it('keeps long requests and recorded conditions in replies, including after import', async () => {
    const p = await createLocalProject(agreement);
    const request =
      'Please update the illustration with the detailed visual changes we discussed. '.repeat(3) +
      'Only start after my written approval; do not add animation.';
    const r = reviewLocal(p.document, request, 'Private working context');
    const updated = updateLocalDecision(p.document, r, 0, {
      ...r.items[0],
      verdict: 'included',
      basis: 'explicit',
      explanation: 'Work must wait for written approval.',
      evidence: p.brief.terms[0].evidence,
    });
    p.reviews = [updated];
    for (const review of [updated, (await parseProject(p)).reviews[0]]) {
      const draft = buildDraft(review);
      expect(draft).toContain(request);
      expect(draft).toContain('Work must wait for written approval.');
      expect(draft).not.toContain('Private working context');
      expect(draft).not.toContain('Review each before recording');
      expect(draft).not.toContain('Ask the client');
    }
  });
  it('suggests all six categories from an own agreement with exact offsets and page numbers', async () => {
    const p = await createLocalProject(agreement);
    expect(p.mode).toBe('local');
    expect(p.brief.provenance.kind).toBe('local');
    expect(p.brief.terms).toHaveLength(6);
    for (const term of p.brief.terms) {
      expect(term.status).toBe('unclear');
      expect(term.evidence.length).toBeGreaterThan(0);
      for (const e of term.evidence) {
        expect(p.document.text.slice(e.start, e.end)).toBe(e.quote);
        expect(e.page).toBeGreaterThan(0);
      }
    }
  });
  it('does not claim absent terms when English keywords are missing', async () => {
    const p = await createLocalProject({
      title: 'Other wording',
      kind: 'text',
      pages: ['Un texte à vérifier attentivement.'],
    });
    expect(p.brief.terms.every((t) => t.status === 'unclear' && t.evidence.length === 0)).toBe(
      true,
    );
    expect(p.brief.terms[0].explanation).toMatch(/No keyword match/);
  });
  it('bounds long passages and omits ambiguous repeated matches', async () => {
    const p = await createLocalProject({
      title: 'Long',
      kind: 'text',
      pages: ['Payment repeats. '.repeat(200)],
    });
    for (const term of p.brief.terms)
      for (const e of term.evidence) {
        expect(e.quote.length).toBeLessThanOrEqual(1000);
        expect(p.document.text.slice(e.start, e.end)).toBe(e.quote);
      }
  });
  it('keeps mixed requests and context intact, and never decides their scope automatically', async () => {
    const p = await createLocalProject(agreement);
    const request = 'Change illustration one and add animation, only after approval.';
    const r = reviewLocal(p.document, request, 'One revision used.');
    expect(r.request).toBe(request);
    expect(r.context).toBe('One revision used.');
    expect(r.items).toHaveLength(1);
    expect(r.items[0].verdict).toBe('unclear');
    expect(() => reviewLocal(p.document, 'x'.repeat(5001), '')).toThrow();
  });
  it('requires exact quotes for confirmations and rejects foreign records', async () => {
    const p = await createLocalProject(agreement);
    const term = p.brief.terms.find((t) => t.category === 'payment')!;
    const brief = updateLocalTerm(p.document, p.brief, {
      ...term,
      status: 'found',
      title: '40% deposit',
    });
    expect(brief.terms.find((t) => t.category === 'payment')?.status).toBe('found');
    expect(() =>
      updateLocalTerm(p.document, p.brief, { ...term, status: 'found', evidence: [] }),
    ).toThrow();
    const r = reviewLocal(p.document, 'Add animation', '');
    expect(() =>
      updateLocalDecision(p.document, r, 0, {
        ...r.items[0],
        verdict: 'addition',
        basis: 'explicit',
        evidence: [],
      }),
    ).toThrow();
    expect(() =>
      updateLocalDecision(p.document, { ...r, documentHash: 'bad' }, 0, r.items[0]),
    ).toThrow();
    expect(() => updateLocalTerm(p.document, { ...p.brief, documentHash: 'bad' }, term)).toThrow();
  });
  it('preserves edited drafts and persists a warning when decisions change', async () => {
    const p = await createLocalProject(agreement);
    const r = reviewLocal(p.document, 'Add animation', '');
    p.reviews = [r];
    p.drafts = [
      { reviewId: r.id, text: 'My carefully edited reply', fee: '200', schedule: '2 days' },
    ];
    const updated = updateLocalDecision(p.document, r, 0, {
      ...r.items[0],
      verdict: 'addition',
      basis: 'explicit',
      evidence: p.brief.terms.find((t) => t.category === 'exclusions')!.evidence,
    });
    const next = replaceReview(p, updated);
    expect(next.drafts[0]).toEqual({ ...p.drafts[0], needsReview: true });
    const imported = await parseProject(JSON.parse(JSON.stringify(next)));
    expect(imported.mode).toBe('local');
    expect(imported.drafts[0].needsReview).toBe(true);
    expect(imported.reviews[0].items[0].verdict).toBe('addition');
    expect(imported.reviews[0].provenance.kind).toBe('imported');
  });
});
