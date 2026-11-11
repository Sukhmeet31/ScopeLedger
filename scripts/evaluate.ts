import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { createDocument } from '../shared/documents';
import { verifyReview } from '../shared/evidence';
import { GroqProvider } from '../server/provider';

const cases = z.array(z.object({ id: z.string(), agreement: z.string(), request: z.string(), context: z.string(), expectedVerdicts: z.array(z.enum(['included', 'addition', 'unclear'])) })).parse(JSON.parse(await readFile(new URL('../eval/cases.json', import.meta.url), 'utf8')));
if (!process.env.GROQ_API_KEY) {
  console.log(JSON.stringify({ status: 'NOT_RUN', reason: 'GROQ_API_KEY is not configured. No model-quality claim can be made.', cases: cases.length }, null, 2));
  process.exitCode = 2;
} else {
  const provider = new GroqProvider(process.env.GROQ_API_KEY, process.env.GROQ_MODEL || 'llama-3.3-70b-versatile');
  let passed = 0;
  const results = [];
  for (const test of cases) {
    const start = performance.now();
    try {
      const document = await createDocument({ title: `Synthetic evaluation: ${test.id}`, kind: 'text', pages: [test.agreement] });
      const raw = await provider.generate('review', document, test.request, test.context);
      const review = verifyReview(document, raw, { request: test.request, context: test.context, provenance: { kind: 'provider', model: provider.model } });
      const actual = review.items.map(i => i.verdict).sort();
      const expected = [...test.expectedVerdicts].sort();
      const matches = JSON.stringify(actual) === JSON.stringify(expected);
      if (matches) passed++;
      results.push({ id: test.id, status: matches ? 'PASS' : 'FAIL', evidence: 'VALID', expected, actual, elapsedMs: Math.round(performance.now() - start), items: review.items, questions: review.questions });
    } catch {
      results.push({ id: test.id, status: 'ERROR', reason: 'Provider or output validation failed. No successful verdict recorded.', elapsedMs: Math.round(performance.now() - start) });
    }
  }
  console.log(JSON.stringify({ status: passed === cases.length ? 'PASS' : 'FAIL', model: provider.model, runAt: new Date().toISOString(), passed, total: cases.length, note: 'Six synthetic smoke cases, not a legal-accuracy benchmark. Review the explanations and evidence manually.', results }, null, 2));
  if (passed !== cases.length) process.exitCode = 1;
}
