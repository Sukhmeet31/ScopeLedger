import { expect, it } from 'vitest';
import { loadSample, reviewSample } from '../shared/sample';
import { parseProject } from '../shared/project';
import { buildDraft } from '../shared/drafts';
import { saveProject, restoreProject, clearProject } from '../client/storage';

it('sample scenarios demonstrate three distinct grounded outcomes', async () => {
  const project = await loadSample();
  expect(project.brief.terms).toHaveLength(6);
  expect((await reviewSample('mixed')).items.map((i: any) => i.verdict)).toEqual([
    'addition',
    'included',
  ]);
  expect((await reviewSample('included')).items[0].verdict).toBe('included');
  expect((await reviewSample('unclear')).items[0].verdict).toBe('unclear');
  for (const term of project.brief.terms)
    for (const e of term.evidence)
      expect(project.document.text.slice(e.start, e.end)).toBe(e.quote);
  await expect(reviewSample('arbitrary request')).rejects.toThrow(/sample/i);
});
it('imports rebuild evidence and explicitly mark imported provenance', async () => {
  const project = await loadSample();
  project.brief.terms[0].evidence[0].start = 9999;
  const imported = await parseProject(JSON.parse(JSON.stringify(project)));
  expect(imported.mode).toBe('imported');
  expect(imported.brief.provenance.kind).toBe('imported');
  expect(imported.brief.terms[0].evidence[0].start).not.toBe(9999);
});
it('rejects altered source, fabricated quotes and foreign-version reviews', async () => {
  const project = await loadSample();
  const changed = structuredClone(project);
  changed.document.input.pages[0] += 'Changed.';
  await expect(parseProject(changed)).rejects.toThrow(/version/i);
  const fabricated = structuredClone(project);
  fabricated.brief.terms[0].evidence[0].quote = 'Never written.';
  await expect(parseProject(fabricated)).rejects.toThrow(/quote/i);
  const stale = structuredClone(project);
  stale.reviews[0].documentHash = '0'.repeat(64);
  await expect(parseProject(stale)).rejects.toThrow(/version/i);
});
it('rejects drafts referring to a missing review', async () => {
  const project = await loadSample();
  project.drafts = [{ reviewId: 'missing', text: 'Draft', fee: '', schedule: '' }];
  await expect(parseProject(project)).rejects.toThrow(/review/i);
});
it('drafts include only user-supplied fee and schedule, preserving uncertainty', async () => {
  const review = await reviewSample('unclear');
  const draft = buildDraft(review, { fee: '₹8,000', schedule: '3 days after approval' });
  expect(draft).toContain('₹8,000');
  expect(draft).toContain('3 days after approval');
  expect(draft).toMatch(/clarif|confirm/i);
  expect(buildDraft(review)).not.toContain('₹');
});
it('explicit local saving preserves edited drafts and clearing removes the record', async () => {
  const values = new Map<string, string>();
  const storage = {
    setItem: (k: string, v: string) => values.set(k, v),
    getItem: (k: string) => values.get(k) ?? null,
    removeItem: (k: string) => values.delete(k),
  };
  const project = await loadSample();
  project.drafts = [
    { reviewId: project.reviews[0].id, text: 'My own edited reply.', fee: '', schedule: '' },
  ];
  saveProject(project, storage);
  expect((await restoreProject(storage))?.drafts[0].text).toBe('My own edited reply.');
  clearProject(storage);
  expect(await restoreProject(storage)).toBeNull();
});
it('storage failure is reported and never changes the active project', async () => {
  const project = await loadSample();
  const before = JSON.stringify(project);
  expect(() =>
    saveProject(project, {
      setItem: () => {
        throw new Error('quota');
      },
    }),
  ).toThrow(/save/i);
  expect(JSON.stringify(project)).toBe(before);
});
