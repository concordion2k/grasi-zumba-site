import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { env } from '../env.js';
import { stripe, stripeEnabled } from '../lib/stripe.js';
import { handleStripeEvent } from '../domain/billing-stripe.js';

/** Stripe webhook. Public + signature-verified (the raw body is required for verification, and the
 *  path is exempt from the CSRF header guard). Mounted under /stripe. */
export const stripeWebhookRoutes = new Hono<AppEnv>();

stripeWebhookRoutes.post('/webhook', async (c) => {
  if (!stripeEnabled() || !env.stripeWebhookSecret) {
    return c.json({ error: 'Stripe is not configured' }, 503);
  }
  const sig = c.req.header('stripe-signature');
  if (!sig) return c.json({ error: 'Missing signature' }, 400);

  const raw = await c.req.text();
  let event;
  try {
    event = await stripe().webhooks.constructEventAsync(raw, sig, env.stripeWebhookSecret);
  } catch {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    // Return 500 so Stripe retries the delivery.
    console.error('[stripe] failed to handle', event.type, err);
    return c.json({ error: 'Handler error' }, 500);
  }
  return c.json({ received: true });
});
