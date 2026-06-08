import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { requireAuth, currentUser } from '../middleware/auth.js';
import { listLedger, myBilling } from '../domain/billing.js';
import { countUserBookings } from '../domain/bookings.js';

/** The signed-in customer's own billing view: credits, usage, and payment history.
 *  Mounted under /me/billing. */
export const meBillingRoutes = new Hono<AppEnv>();
meBillingRoutes.use('*', requireAuth);

meBillingRoutes.get('/', async (c) => {
  const user = currentUser(c);
  const [ledger, bookingsCount] = await Promise.all([
    listLedger(user.userId),
    countUserBookings(user.userId),
  ]);
  return c.json({
    summary: myBilling(user, ledger, bookingsCount),
    // Only the customer's actual payments (drop-ins, packs, subscription charges) — internal
    // credit grants/adjustments stay out of their view.
    purchases: ledger.filter((e) => e.amountCents > 0),
  });
});
