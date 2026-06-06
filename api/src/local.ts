/**
 * Local development server. Run with `npm run dev:api`.
 *
 * Loads `.env`, then serves the same Hono app over plain HTTP so the Vite dev server can proxy to
 * it. Point it at DynamoDB Local (see api/README.md) via DYNAMODB_ENDPOINT.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Minimal .env loader (no dependency) — only for local dev.
try {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
} catch {
  console.warn('No .env file found — relying on the ambient environment.');
}

const { serve } = await import('@hono/node-server');
const { createApp } = await import('./app.js');

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: createApp().fetch, port });
console.log(`🎶 Grasi Zumba API listening on http://localhost:${port}`);
