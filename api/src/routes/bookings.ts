import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import type { BookingWithClass } from '@grasi/shared';
import { requireAuth, currentUser } from '../middleware/auth.js';
import { bookClass, cancelBooking, listUserBookings } from '../domain/bookings.js';
import { getClass, toZumbaClass } from '../domain/classes.js';
import { hasSignedCurrentWaiver } from '../domain/waiver.js';
import { bookingUsedCredit, refundBookingCredit } from '../domain/billing.js';
import { dispatchBookingConfirmed } from '../notifications/dispatch.js';
import { HttpError } from '../lib/errors.js';

/** Booking actions, mounted under /classes. All require authentication. */
export const bookingRoutes = new Hono<AppEnv>();
bookingRoutes.use('*', requireAuth);

bookingRoutes.post('/:classId/book', async (c) => {
  const user = currentUser(c);
  const classId = c.req.param('classId');
  // Gate 1: a signed, current-version liability waiver is required before booking.
  if (!(await hasSignedCurrentWaiver(user.userId))) {
    throw new HttpError(403, 'Please sign the liability waiver before booking a class.', {
      code: 'waiver_required',
    });
  }
  const cls = await getClass(classId);
  if (!cls) {
    throw new HttpError(404, 'This class is no longer available.', { code: 'class_not_found' });
  }

  // Gate 2: the booking must be paid for — an active subscription covers it, otherwise it costs one
  // class credit. No subscription and no credits → can't book (prompt them to buy). The credit is
  // then spent atomically inside bookClass, so this check + the spend can't disagree.
  const subscribed = Boolean(user.subscription?.active);
  if (!subscribed && (user.classCredits ?? 0) < 1) {
    throw new HttpError(
      403,
      'You need a class credit to book. Buy a class pack or a drop-in to continue.',
      { code: 'insufficient_credits' },
    );
  }
  const payment = subscribed
    ? ({ method: 'subscription' } as const)
    : ({ method: 'credit', classTitle: cls.title } as const);
  await bookClass({ userId: user.userId, name: user.name, email: user.email }, classId, payment);

  // Confirmation email (fire-and-forget, honours the user's preference).
  dispatchBookingConfirmed(user, cls);
  return c.json({ ok: true }, 201);
});

bookingRoutes.delete('/:classId/book', async (c) => {
  const user = currentUser(c);
  const classId = c.req.param('classId');
  // Read the credit flag + class title before cancelling (cancel deletes the booking item).
  const [usedCredit, cls] = await Promise.all([
    bookingUsedCredit(user.userId, classId),
    getClass(classId),
  ]);
  await cancelBooking(user.userId, classId);
  if (usedCredit) {
    await refundBookingCredit(user.userId, cls?.title ?? 'class').catch((err) =>
      console.error('[billing] refund credit failed', err),
    );
  }
  return c.json({ ok: true });
});

/** A user's own bookings, joined with class details. Mounted under /me. */
export const myBookingsRoutes = new Hono<AppEnv>();
myBookingsRoutes.use('*', requireAuth);

myBookingsRoutes.get('/bookings', async (c) => {
  const user = currentUser(c);
  const bookings = await listUserBookings(user.userId);
  const withClasses: BookingWithClass[] = [];
  for (const b of bookings) {
    const cls = await getClass(b.classId);
    if (cls) {
      withClasses.push({
        booking: { userId: user.userId, classId: b.classId, bookedAt: b.bookedAt },
        class: toZumbaClass(cls),
      });
    }
  }
  // Soonest upcoming first.
  withClasses.sort((a, b) => a.class.startTime.localeCompare(b.class.startTime));
  return c.json({ bookings: withClasses });
});
