import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { contactSchema } from '../schemas.js';
import { publish } from '../notifications/events.js';
import { rateLimit } from '../lib/ratelimit.js';

/** Public contact form. Mounted at /api/contact. */
export const contactRoutes = new Hono<AppEnv>();

contactRoutes.post('/', async (c) => {
  const input = contactSchema.parse(await c.req.json());

  // Honeypot: bots fill the hidden field. Pretend success without sending.
  if (input.company && input.company.trim() !== '') {
    return c.json({ ok: true });
  }

  // Light per-IP rate limit (5 inquiries / 10 min) to deter abuse of the public endpoint.
  const ip = (c.req.header('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown';
  if (!(await rateLimit(`contact#${ip}`, 5, 600))) {
    return c.json({ error: 'Too many messages — please try again in a little while.' }, 429);
  }

  await publish({
    type: 'contact.inquiry',
    name: input.name,
    email: input.email,
    message: input.message,
  });
  return c.json({ ok: true });
});
