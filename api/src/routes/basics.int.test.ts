import { describe, it, expect, beforeAll } from 'vitest';
import type { Hono } from 'hono';
import {
  buildTestApp,
  apiRequest,
  readJson,
  type HealthBody,
  type SettingsBody,
} from '../test-support/integration.js';

describe('app basics', () => {
  let app: Hono;
  beforeAll(async () => {
    app = await buildTestApp();
  });

  it('reports health', async () => {
    const res = await apiRequest(app, 'GET', '/api/health');
    expect(res.status).toBe(200);
    expect((await readJson<HealthBody>(res)).status).toBe('ok');
  });

  it('returns site settings (public)', async () => {
    const res = await apiRequest(app, 'GET', '/api/settings');
    expect(res.status).toBe(200);
    expect((await readJson<SettingsBody>(res)).settings).toBeTruthy();
  });

  it('404s unknown routes', async () => {
    const res = await apiRequest(app, 'GET', '/api/nope');
    expect(res.status).toBe(404);
  });

  it('blocks state-changing requests missing the CSRF header', async () => {
    // Raw request WITHOUT the X-Requested-With header the client normally sends.
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
      body: JSON.stringify({ email: 'x@example.com', password: 'whatever123' }),
    });
    expect(res.status).toBe(403);
  });
});
