import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import type { BookingWithClass } from '@grasi/shared';
import { requireAuth, currentUser } from '../middleware/auth.js';
import { bookClass, cancelBooking, listUserBookings } from '../domain/bookings.js';
import { getClass, toZumbaClass } from '../domain/classes.js';
import { hasSignedCurrentWaiver } from '../domain/waiver.js';
import { consumeBookingCredit, bookingUsedCredit, refundBookingCredit } from '../domain/billing.js';
import { dispatchBookingConfirmed } from '../notifications/dispatch.js';
import { HttpError } from '../lib/errors.js';

/** Booking actions, mounted under /classes. All require authentication. */
export const bookingRoutes = new Hono<AppEnv>();
bookingRoutes.use('*', requireAuth);

bookingRoutes.post('/:classId/book', async (c) => {
  const user = currentUser(c);
  const classId = c.req.param('classId');
  // Gate: a signed, current-version liability waiver is required before booking.
  if (!(await hasSignedCurrentWaiver(user.userId))) {
    throw new HttpError(403, 'Please sign the liability waiver before booking a class.', {
      code: 'waiver_required',
    });
  }
  await bookClass({ userId: user.userId, name: user.name, email: user.email }, classId);
  const cls = await getClass(classId);
  if (cls) {
    // Confirmation email (fire-and-forget, honours the user's preference).
    dispatchBookingConfirmed(user, cls);
    // Spend a class credit (best-effort; subscribers/credit-less customers are no-ops).
    await consumeBookingCredit(user, classId, cls.title).catch((err) =>
      console.error('[billing] consume credit failed', err),
    );
  }
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
