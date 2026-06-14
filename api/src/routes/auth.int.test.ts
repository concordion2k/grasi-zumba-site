import { describe, it, expect, beforeAll } from 'vitest';
import type { Hono } from 'hono';
import {
  buildTestApp,
  apiRequest,
  registerUser,
  sessionCookie,
  readJson,
  type UserBody,
} from '../test-support/integration.js';

describe('auth routes', () => {
  let app: Hono;
  beforeAll(async () => {
    app = await buildTestApp();
  });

  it('registers a user, sets a session cookie, and returns the public user', async () => {
    const { res } = await registerUser(app, { email: 'newbie@example.com' });
    expect(res.status).toBe(201);
    expect(res.headers.get('set-cookie')).toBeTruthy();
    const body = await readJson<UserBody>(res);
    expect(body.user.email).toBe('newbie@example.com');
    expect(body.user.role).toBe('customer');
  });

  it('rejects registration that does not accept the terms', async () => {
    const res = await apiRequest(app, 'POST', '/api/auth/register', {
      body: {
        name: 'No Terms',
        email: 'noterms@example.com',
        password: 'password1234',
        birthday: '1990-01-01',
        acceptedTerms: false,
      },
    });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate email', async () => {
    await registerUser(app, { email: 'dupe@example.com' });
    const again = await registerUser(app, { email: 'dupe@example.com' });
    expect(again.res.status).toBe(409);
  });

  it('promotes bootstrap admin emails to the admin role', async () => {
    const { res } = await registerUser(app, { email: 'admin@example.com' });
    const body = await readJson<UserBody>(res);
    expect(body.user.role).toBe('admin');
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    await registerUser(app, { email: 'login@example.com', password: 'password1234' });
    const ok = await apiRequest(app, 'POST', '/api/auth/login', {
      body: { email: 'login@example.com', password: 'password1234' },
    });
    expect(ok.status).toBe(200);
    expect(sessionCookie(ok)).toBeTruthy();

    const bad = await apiRequest(app, 'POST', '/api/auth/login', {
      body: { email: 'login@example.com', password: 'wrong-password' },
    });
    expect(bad.status).toBe(401);
  });

  it('returns the current user only with a valid session', async () => {
    const { cookie } = await registerUser(app, { email: 'me@example.com' });
    const anon = await apiRequest(app, 'GET', '/api/auth/me');
    expect(anon.status).toBe(401);

    const authed = await apiRequest(app, 'GET', '/api/auth/me', { cookie });
    expect(authed.status).toBe(200);
    expect((await readJson<UserBody>(authed)).user.email).toBe('me@example.com');
  });

  it('does not enumerate accounts on forgot-password and rejects a bad reset token', async () => {
    const forgot = await apiRequest(app, 'POST', '/api/auth/forgot-password', {
      body: { email: 'ghost@example.com' },
    });
    expect(forgot.status).toBe(200);

    const reset = await apiRequest(app, 'POST', '/api/auth/reset-password', {
      body: { token: 'not-a-real-token', password: 'newpassword1234' },
    });
    expect(reset.status).toBe(400);
  });
});
