import { Hono } from 'hono';
import type Stripe from 'stripe';
import type { AppEnv } from '../types.js';
import { requireAuth, currentUser } from '../middleware/auth.js';
import { checkoutSchema } from '../schemas.js';
import { env } from '../env.js';
import { stripe, stripeEnabled } from '../lib/stripe.js';
import { getOrCreateStripeCustomer } from '../domain/billing-stripe.js';
import { badRequest } from '../lib/errors.js';

type Item = 'pack_5' | 'pack_10' | 'pack_20' | 'dropin' | 'subscription';

const CATALOG: Record<
  Item,
  {
    price: () => string;
    mode: Stripe.Checkout.SessionCreateParams.Mode;
    credits: number;
    kind: string;
    note: string;
  }
> = {
  pack_5: {
    price: () => env.stripePrices.pack5,
    mode: 'payment',
    credits: 5,
    kind: 'pack',
    note: '5-class pack',
  },
  pack_10: {
    price: () => env.stripePrices.pack10,
    mode: 'payment',
    credits: 10,
    kind: 'pack',
    note: '10-class pack',
  },
  pack_20: {
    price: () => env.stripePrices.pack20,
    mode: 'payment',
    credits: 20,
    kind: 'pack',
    note: '20-class pack',
  },
  dropin: {
    price: () => env.stripePrices.dropin,
    mode: 'payment',
    credits: 1,
    kind: 'dropin',
    note: 'Drop-in class',
  },
  subscription: {
    price: () => env.stripePrices.subscription,
    mode: 'subscription',
    credits: 0,
    kind: 'subscription',
    note: 'Unlimited subscription',
  },
};

/** Create a Stripe Checkout session for the current user. Mounted under /billing. */
export const checkoutRoutes = new Hono<AppEnv>();
checkoutRoutes.use('*', requireAuth);

checkoutRoutes.post('/checkout', async (c) => {
  if (!stripeEnabled()) throw badRequest('Online payments are not configured yet');
  const user = currentUser(c);
  const { item } = checkoutSchema.parse(await c.req.json());
  const cfg = CATALOG[item as Item];
  const price = cfg.price();
  if (!price) throw badRequest('This item is not available for purchase yet');

  const customer = await getOrCreateStripeCustomer(user);
  const site = env.frontendOrigin;
  const session = await stripe().checkout.sessions.create({
    mode: cfg.mode,
    customer,
    line_items: [{ price, quantity: 1 }],
    success_url: `${site}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/pricing?checkout=canceled`,
    allow_promotion_codes: true,
    metadata: { userId: user.userId, kind: cfg.kind, credits: String(cfg.credits), note: cfg.note },
    ...(cfg.mode === 'subscription'
      ? { subscription_data: { metadata: { userId: user.userId } } }
      : {}),
  });

  return c.json({ url: session.url });
});

/**
 * Open the Stripe Billing Customer Portal for the current user (cancel/manage the subscription,
 * update the card, view invoices). Stripe hosts it; our subscription state syncs back via the
 * customer.subscription.* webhooks. Returns the URL to redirect the browser to.
 */
checkoutRoutes.post('/portal', async (c) => {
  if (!stripeEnabled()) throw badRequest('Online payments are not configured yet');
  const user = currentUser(c);
  const customer = await getOrCreateStripeCustomer(user);
  const session = await stripe().billingPortal.sessions.create({
    customer,
    return_url: `${env.frontendOrigin}/dashboard`,
  });
  return c.json({ url: session.url });
});
