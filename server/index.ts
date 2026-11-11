import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';
import { GroqProvider } from './provider';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 5187);
const production = process.argv.includes('--production') || process.env.NODE_ENV === 'production';
const provider = process.env.GROQ_API_KEY
  ? new GroqProvider(process.env.GROQ_API_KEY, process.env.GROQ_MODEL || 'llama-3.3-70b-versatile')
  : undefined;
const origins = (process.env.APP_ORIGIN || `http://localhost:${port},http://127.0.0.1:${port}`)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const app = createApp(provider, origins);
if (production) {
  app.use(express.static(path.join(root, 'dist')));
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(root, 'dist/index.html'));
  });
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    root,
    server: { middlewareMode: true, hmr: { port: port + 1 } },
  });
  app.use(vite.middlewares);
}
app.listen(port, process.env.HOST || '127.0.0.1', () => {
  console.log(`ScopeLedger: http://localhost:${port}`);
  console.log(
    provider ? 'AI provider configured.' : 'Sample mode ready. Live AI requires GROQ_API_KEY.',
  );
});
