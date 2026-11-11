import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app';
const document = {
  title: 'Website scope',
  kind: 'text',
  pages: ['Two revisions are included. Online stores are excluded.'],
};
const brief = {
  terms: ['deliverables', 'exclusions', 'revisions', 'payment', 'timeline', 'ownership'].map(
    (category) => ({
      category,
      status: 'unclear',
      title: category,
      explanation: 'Check the supplied wording.',
      evidence: [{ blockId: 'p1-b1', quote: 'Two revisions are included.' }],
    }),
  ),
  questions: ['Which deliverables were agreed?'],
};
const provider = { model: 'test-provider', generate: async () => brief };
describe('analysis HTTP boundary', () => {
  it('reports provider availability without a secret', async () => {
    const res = await request(createApp()).get('/api/status');
    expect(res.status).toBe(200);
    expect(res.body.configured).toBe(false);
  });
  it('reports missing provider as unavailable rather than a fake brief', async () => {
    const res = await request(createApp()).post('/api/brief').send({ document });
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/configured/i);
    expect(res.body.brief).toBeUndefined();
  });
  it('rejects over-limit or empty input even when the provider is unavailable', async () => {
    const app = createApp();
    expect(
      (
        await request(app)
          .post('/api/brief')
          .send({ document: { ...document, pages: ['x'.repeat(60001)] } })
      ).status,
    ).toBe(400);
    expect((await request(app).post('/api/review').send({ document, request: '' })).status).toBe(
      400,
    );
  });
  it('returns real verified offsets from a stub provider response', async () => {
    const res = await request(createApp(provider)).post('/api/brief').send({ document });
    expect(res.status).toBe(200);
    expect(res.body.brief.terms[0].evidence[0]).toMatchObject({ start: 0, end: 27 });
    expect(res.body.brief.provenance).toEqual({ kind: 'provider', model: 'test-provider' });
  });
  it('rejects fabricated citations and does not expose provider errors', async () => {
    const bad = {
      ...brief,
      terms: brief.terms.map((t) => ({
        ...t,
        evidence: [{ blockId: 'p1-b1', quote: 'Payment is guaranteed.' }],
      })),
    };
    expect(
      (
        await request(createApp({ ...provider, generate: async () => bad }))
          .post('/api/brief')
          .send({ document })
      ).status,
    ).toBe(502);
    const res = await request(
      createApp({
        ...provider,
        generate: async () => {
          throw new Error('private provider detail');
        },
      }),
    )
      .post('/api/brief')
      .send({ document });
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain('private provider detail');
  });
  it('rejects unapproved origins, malformed JSON, and oversized bodies', async () => {
    const app = createApp(provider, ['http://localhost:5173']);
    expect(
      (
        await request(app)
          .post('/api/brief')
          .set('Origin', 'https://unrelated.example')
          .send({ document })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post('/api/brief')
          .set('Content-Type', 'application/json')
          .send('{broken')
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/brief')
          .send({ huge: 'x'.repeat(700000) })
      ).status,
    ).toBe(413);
  });
  it('requires clarification when provider admits missing context', async () => {
    const output = {
      items: [
        {
          title: 'Another revision',
          verdict: 'included',
          basis: 'missing_context',
          explanation: 'Usage not supplied.',
          evidence: [{ blockId: 'p1-b1', quote: 'Two revisions are included.' }],
        },
      ],
      questions: [],
    };
    const res = await request(createApp({ ...provider, generate: async () => output }))
      .post('/api/review')
      .send({ document, request: 'Another round please.' });
    expect(res.status).toBe(502);
  });
});
