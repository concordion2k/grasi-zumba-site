import { describe, it, expect, beforeAll } from 'vitest';
import type { Hono } from 'hono';
import {
  buildTestApp,
  apiRequest,
  registerUser,
  readJson,
  type ClassBody,
  type BillingBody,
  type ErrorBody,
  type UserBody,
} from '../test-support/integration.js';

const classBody = {
  title: 'Booking Class',
  description: '',
  startTime: '2099-02-01T15:00:00.000Z',
  durationMinutes: 60,
  street1: '1 Studio Way',
  city: 'Davenport',
  state: 'FL',
  zip: '33896',
  capacity: 5,
};

describe('booking flow (waiver + credit gates, atomic consume/refund)', () => {
  let app: Hono;
  let adminCookie: string;
  let classId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    adminCookie = (await registerUser(app, { email: 'admin@example.com' })).cookie;
    const res = await apiRequest(app, 'POST', '/api/admin/classes', {
      cookie: adminCookie,
      body: classBody,
    });
    classId = (await readJson<ClassBody>(res)).class.classId;
  });

  async function newCustomer(): Promise<{ cookie: string; userId: string }> {
    const { res, cookie } = await registerUser(app);
    const { user } = await readJson<UserBody>(res);
    return { cookie, userId: user.userId };
  }
  const signWaiver = (cookie: string) =>
    apiRequest(app, 'POST', '/api/me/waiver', {
      cookie,
      body: { fullName: 'Test Dancer', agreeLiability: true, consentElectronic: true },
    });
  const grantCredits = (userId: string, amount: number) =>
    apiRequest(app, 'POST', `/api/admin/customers/${userId}/credits`, {
      cookie: adminCookie,
      body: { amount, note: 'test grant' },
    });
  const book = (cookie: string) =>
    apiRequest(app, 'POST', `/api/classes/${classId}/book`, { cookie });

  it('requires a signed waiver before booking', async () => {
    const { cookie } = await newCustomer();
    const res = await book(cookie);
    expect(res.status).toBe(403);
    expect((await readJson<ErrorBody>(res)).details?.code).toBe('waiver_required');
  });

  it('requires a credit (or subscription) once the waiver is signed', async () => {
    const { cookie } = await newCustomer();
    await signWaiver(cookie);
    const res = await book(cookie);
    expect(res.status).toBe(403);
    expect((await readJson<ErrorBody>(res)).details?.code).toBe('insufficient_credits');
  });

  it('books with a credit, increments bookedCount, blocks double-book, refunds on cancel', async () => {
    const { cookie, userId } = await newCustomer();
    await signWaiver(cookie);
    expect((await grantCredits(userId, 2)).status).toBe(201);

    expect((await book(cookie)).status).toBe(201);

    const detail = await readJson<ClassBody>(
      await apiRequest(app, 'GET', `/api/classes/${classId}`, { cookie }),
    );
    expect(detail.class.bookedCount).toBe(1);
    expect(detail.class.bookedByMe).toBe(true);

    const billing = await readJson<BillingBody>(
      await apiRequest(app, 'GET', '/api/me/billing', { cookie }),
    );
    expect(billing.summary.classesRemaining).toBe(1); // one credit consumed

    expect((await book(cookie)).status).toBe(409); // already booked

    const cancel = await apiRequest(app, 'DELETE', `/api/classes/${classId}/book`, { cookie });
    expect(cancel.status).toBe(200);

    const after = await readJson<BillingBody>(
      await apiRequest(app, 'GET', '/api/me/billing', { cookie }),
    );
    expect(after.summary.classesRemaining).toBe(2); // credit refunded
  });
});
