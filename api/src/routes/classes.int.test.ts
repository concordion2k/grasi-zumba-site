import { describe, it, expect, beforeAll } from 'vitest';
import type { Hono } from 'hono';
import {
  buildTestApp,
  apiRequest,
  registerUser,
  readJson,
  type ClassBody,
  type ClassListBody,
} from '../test-support/integration.js';

// A week out: in the future, but within the public list's default 90-day window.
const startTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const classBody = {
  title: 'Morning Burn',
  description: 'High-energy cardio',
  startTime,
  durationMinutes: 60,
  street1: '123 Main St',
  city: 'Davenport',
  state: 'FL',
  zip: '33896',
  capacity: 12,
};

describe('classes routes', () => {
  let app: Hono;
  let adminCookie: string;
  beforeAll(async () => {
    app = await buildTestApp();
    adminCookie = (await registerUser(app, { email: 'admin@example.com' })).cookie;
  });

  it('lists no classes initially (public, no auth)', async () => {
    const res = await apiRequest(app, 'GET', '/api/classes');
    expect(res.status).toBe(200);
    expect((await readJson<ClassListBody>(res)).classes).toEqual([]);
  });

  it('blocks non-admins from creating a class', async () => {
    const { cookie } = await registerUser(app);
    const res = await apiRequest(app, 'POST', '/api/admin/classes', { cookie, body: classBody });
    expect(res.status).toBe(403);
  });

  it('validates the class payload', async () => {
    const res = await apiRequest(app, 'POST', '/api/admin/classes', {
      cookie: adminCookie,
      body: { ...classBody, capacity: 0 }, // capacity must be >= 1
    });
    expect(res.status).toBe(400);
  });

  it('lets an admin create a class that then appears in the public list + detail', async () => {
    const created = await apiRequest(app, 'POST', '/api/admin/classes', {
      cookie: adminCookie,
      body: classBody,
    });
    expect(created.status).toBe(201);
    const cls = (await readJson<ClassBody>(created)).class;
    expect(cls.title).toBe('Morning Burn');
    expect(cls.capacity).toBe(12);

    const list = await apiRequest(app, 'GET', '/api/classes');
    const ids = (await readJson<ClassListBody>(list)).classes.map((c) => c.classId);
    expect(ids).toContain(cls.classId);

    const detail = await apiRequest(app, 'GET', `/api/classes/${cls.classId}`);
    expect(detail.status).toBe(200);
    expect((await readJson<ClassBody>(detail)).class.classId).toBe(cls.classId);
  });
});
