import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from './types.js';
import { env } from './env.js';
import { handleError } from './lib/errors.js';
import { loadUser } from './middleware/auth.js';
import { csrfGuard } from './middleware/csrf.js';
import { authRoutes } from './routes/auth.js';
import { classRoutes } from './routes/classes.js';
import { bookingRoutes, myBookingsRoutes } from './routes/bookings.js';
import { profileRoutes } from './routes/profile.js';
import { adminRoutes } from './routes/admin.js';
import { contactRoutes } from './routes/contact.js';
import { unsubscribeRoutes } from './routes/unsubscribe.js';
import { waiverPublicRoutes, waiverMeRoutes } from './routes/waiver.js';
import { meBillingRoutes } from './routes/billing.js';
import { checkoutRoutes } from './routes/checkout.js';
import { stripeWebhookRoutes } from './routes/stripe.js';
import { getSettings } from './domain/settings.js';

export function createApp() {
  const app = new Hono<AppEnv>();

  // In production the SPA and API are same-origin (served via one CloudFront distribution), so CORS
  // is a no-op. It only matters when the frontend dev server talks to the API cross-origin.
  app.use(
    '*',
    cors({
      origin: env.frontendOrigin,
      credentials: true,
      allowHeaders: ['Content-Type', 'X-Requested-With'],
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );

  app.use('*', csrfGuard);
  app.use('*', loadUser);
  app.onError(handleError);

  app.get('/api/health', (c) => c.json({ status: 'ok' }));
  app.get('/api/settings', async (c) => c.json({ settings: await getSettings() }));

  app.route('/api/auth', authRoutes);
  app.route('/api/contact', contactRoutes);
  app.route('/api/unsubscribe', unsubscribeRoutes);
  app.route('/api/waiver', waiverPublicRoutes); // public: text + blank PDF
  app.route('/api/me/waiver', waiverMeRoutes); // auth: status, sign, signed PDF
  app.route('/api/classes', classRoutes); // public list/get
  app.route('/api/classes', bookingRoutes); // book/cancel (auth)
  app.route('/api/me', myBookingsRoutes);
  app.route('/api/me', profileRoutes);
  app.route('/api/me/billing', meBillingRoutes);
  app.route('/api/billing', checkoutRoutes); // auth: create checkout session
  app.route('/api/stripe', stripeWebhookRoutes); // public webhook (CSRF-exempt)
  app.route('/api/admin', adminRoutes);

  app.notFound((c) => c.json({ error: 'Not found' }, 404));

  return app;
}
