import type Stripe from 'stripe';
import { stripe } from '../lib/stripe.js';
import { updateUser, type UserRecord } from './users.js';
import { applyStripePayment, setStripeSubscription, recordStripeInvoice } from './billing.js';
import type { LedgerEntryType } from '@grasi/shared';

/** Reuse the user's Stripe customer, creating one on first checkout. */
export async function getOrCreateStripeCustomer(user: UserRecord): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe().customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user.userId },
  });
  await updateUser(user.userId, { stripeCustomerId: customer.id });
  return customer.id;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function activeStatus(status: Stripe.Subscription.Status): boolean {
  return status === 'active' || status === 'trialing';
}

/** current_period_end (unix seconds) → ISO; defaults ~30 days out if absent. */
function renewsAt(sub: Stripe.Subscription): string {
  const end = (sub as unknown as { current_period_end?: number }).current_period_end;
  return new Date(end ? end * 1000 : Date.now() + 30 * DAY_MS).toISOString();
}

/**
 * Apply a verified Stripe webhook event to our ledger/subscription state. Each money event is
 * idempotent (per-object marker), so Stripe's at-least-once retries are safe.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      if (!userId) break;
      if (session.mode === 'payment') {
        const type: LedgerEntryType =
          session.metadata?.kind === 'dropin' ? 'dropin_payment' : 'package_purchase';
        await applyStripePayment(userId, {
          objectId: session.id,
          type,
          credits: Number(session.metadata?.credits ?? 0),
          amountCents: session.amount_total ?? 0,
          note: session.metadata?.note ?? 'Purchase',
        });
      } else if (session.mode === 'subscription' && session.subscription) {
        const sub = await stripe().subscriptions.retrieve(session.subscription as string);
        await setStripeSubscription(userId, {
          active: activeStatus(sub.status),
          renewsAt: renewsAt(sub),
        });
      }
      break;
    }
    case 'invoice.paid': {
      const invoice = event.data.object;
      const subId = (invoice as unknown as { subscription?: string | null }).subscription;
      if (!subId) break;
      const sub = await stripe().subscriptions.retrieve(subId);
      const userId = sub.metadata?.userId;
      if (!userId) break;
      await setStripeSubscription(userId, {
        active: activeStatus(sub.status),
        renewsAt: renewsAt(sub),
      });
      await recordStripeInvoice(userId, { objectId: invoice.id, amountCents: invoice.amount_paid });
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      if (!userId) break;
      const active =
        event.type === 'customer.subscription.deleted' ? false : activeStatus(sub.status);
      await setStripeSubscription(userId, { active, renewsAt: renewsAt(sub) });
      break;
    }
    default:
      break;
  }
}
