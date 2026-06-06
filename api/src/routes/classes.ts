import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import type { ZumbaClassWithBookingState } from '@grasi/shared';
import { listClassesInRange, getClass, toZumbaClass } from '../domain/classes.js';
import { listUserBookings } from '../domain/bookings.js';
import { notFound } from '../lib/errors.js';

export const classRoutes = new Hono<AppEnv>();

const DAY_MS = 24 * 60 * 60 * 1000;

/** Public: list classes in a date range (defaults to the next 90 days). */
classRoutes.get('/', async (c) => {
  const now = Date.now();
  const from = c.req.query('from') ?? new Date(now - DAY_MS).toISOString();
  const to = c.req.query('to') ?? new Date(now + 90 * DAY_MS).toISOString();

  const classes = await listClassesInRange(from, to);

  // One query for the viewer's bookings, then a cheap set lookup per class.
  let bookedSet = new Set<string>();
  if (c.var.user) {
    const bookings = await listUserBookings(c.var.user.userId);
    bookedSet = new Set(bookings.map((b) => b.classId));
  }

  const result: ZumbaClassWithBookingState[] = classes.map((record) => {
    const cls = toZumbaClass(record);
    return {
      ...cls,
      bookedByMe: bookedSet.has(cls.classId),
      spotsRemaining: Math.max(0, cls.capacity - cls.bookedCount),
    };
  });
  return c.json({ classes: result });
});

/** Public: a single class. */
classRoutes.get('/:classId', async (c) => {
  const record = await getClass(c.req.param('classId'));
  if (!record) throw notFound('Class not found');
  const cls = toZumbaClass(record);
  let bookedByMe = false;
  if (c.var.user) {
    const bookings = await listUserBookings(c.var.user.userId);
    bookedByMe = bookings.some((b) => b.classId === cls.classId);
  }
  return c.json({
    class: { ...cls, bookedByMe, spotsRemaining: Math.max(0, cls.capacity - cls.bookedCount) },
  });
});
