import { describe, it, expect, beforeAll } from 'vitest';
import type { Hono } from 'hono';
import {
  buildTestApp,
  apiRequest,
  registerUser,
  readJson,
  type BillingBody,
  type UserBody,
} from '../test-support/integration.js';

describe('my billing', () => {
  let app: Hono;
  let adminCookie: string;
  beforeAll(async () => {
    app = await buildTestApp();
    adminCookie = (await registerUser(app, { email: 'admin@example.com' })).cookie;
  });

  it('starts empty, then reflects admin-granted credits', async () => {
    const { res, cookie } = await registerUser(app);
    const userId = (await readJson<UserBody>(res)).user.userId;

    const before = await readJson<BillingBody>(
      await apiRequest(app, 'GET', '/api/me/billing', { cookie }),
    );
    expect(before.summary.classesRemaining).toBe(0);
    expect(before.summary.subscription).toBeNull();
    expect(before.purchases).toEqual([]);

    const granted = await apiRequest(app, 'POST', `/api/admin/customers/${userId}/credits`, {
      cookie: adminCookie,
      body: { amount: 5, note: 'welcome credits' },
    });
    expect(granted.status).toBe(201);

    const after = await readJson<BillingBody>(
      await apiRequest(app, 'GET', '/api/me/billing', { cookie }),
    );
    expect(after.summary.classesRemaining).toBe(5);
  });

  it('requires authentication', async () => {
    const res = await apiRequest(app, 'GET', '/api/me/billing');
    expect(res.status).toBe(401);
  });
});
