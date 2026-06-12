import Stripe from 'stripe';
import { env } from '../env.js';

let client: Stripe | undefined;

/** Lazily-constructed Stripe client. Throws if the secret key isn't configured. */
export function stripe(): Stripe {
  if (!env.stripeSecretKey) throw new Error('Stripe is not configured (STRIPE_SECRET_KEY missing)');
  return (client ??= new Stripe(env.stripeSecretKey));
}

export const stripeEnabled = (): boolean => Boolean(env.stripeSecretKey);
