import express, { type ErrorRequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { createDocument } from '../shared/documents';
import { verifyBrief, verifyReview } from '../shared/evidence';
import { DocumentInputSchema, ReviewInputSchema } from '../shared/schema';
import type { AnalysisProvider } from './provider';

export function createApp(
  provider?: AnalysisProvider,
  origins = ['http://localhost:5173', 'http://127.0.0.1:5173'],
) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (req, res, next) => {
    res.set({
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    });
    const origin = req.get('origin');
    if (origin && !origins.includes(origin)) {
      res.status(403).json({ error: 'This origin is not allowed.' });
      return;
    }
    if (origin) {
      res.set('Access-Control-Allow-Origin', origin);
      res.vary('Origin');
    }
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    if (req.method === 'POST' && !req.is('application/json')) {
      res.status(415).json({ error: 'Send JSON content.' });
      return;
    }
    next();
  });
  app.use(
    '/api',
    rateLimit({
      windowMs: 10 * 60 * 1000,
      limit: 30,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Too many requests. Please try again in a few minutes.' },
    }),
  );
  app.use('/api', express.json({ limit: '512kb' }));
  app.get('/api/status', (_req, res) => {
    res.json({ configured: Boolean(provider), model: provider?.model ?? null });
  });

  for (const kind of ['brief', 'review'] as const) {
    app.post(`/api/${kind}`, async (req, res) => {
      let doc;
      let request = '';
      let context = '';
      try {
        if (kind === 'brief') {
          const input = z.strictObject({ document: DocumentInputSchema }).parse(req.body);
          doc = await createDocument(input.document);
        } else {
          const input = ReviewInputSchema.parse(req.body);
          doc = await createDocument(input.document);
          request = input.request;
          context = input.context;
        }
      } catch (error) {
        res
          .status(400)
          .json({
            error:
              error instanceof z.ZodError
                ? (error.issues[0]?.message ?? 'Invalid request.')
                : error instanceof Error
                  ? error.message
                  : 'Invalid document.',
          });
        return;
      }
      if (!provider) {
        res
          .status(503)
          .json({
            error:
              'AI analysis is not configured on this server. You can explore the sample project while the owner configures the provider.',
          });
        return;
      }
      try {
        const output = await provider.generate(kind, doc, request, context);
        const provenance = { kind: 'provider' as const, model: provider.model };
        if (kind === 'brief')
          res.json({ document: doc, brief: verifyBrief(doc, output, provenance) });
        else res.json({ review: verifyReview(doc, output, { request, context, provenance }) });
      } catch {
        res
          .status(502)
          .json({
            error:
              'The AI result was unavailable, incomplete, or could not be matched to the source. Nothing has been assessed as included. Please retry or review the agreement directly.',
          });
      }
    });
  }
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Unknown API route.' });
  });
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    const status =
      error?.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500;
    res
      .status(status)
      .json({
        error:
          status === 413
            ? 'Request body is too large.'
            : status === 400
              ? 'Invalid JSON.'
              : 'The request could not be processed.',
      });
  };
  app.use(errors);
  return app;
}
