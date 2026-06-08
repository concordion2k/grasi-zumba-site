import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { unsubscribeSchema } from '../schemas.js';
import { verifyUnsubscribeToken } from '../lib/tokens.js';
import { getUserById, updateUser } from '../domain/users.js';
import { badRequest } from '../lib/errors.js';

/** Public one-click unsubscribe. The tokenised link in notification emails points the frontend
 *  here; we verify the token and turn off all notification preferences. Mounted under /unsubscribe. */
export const unsubscribeRoutes = new Hono<AppEnv>();

unsubscribeRoutes.post('/', async (c) => {
  const { token } = unsubscribeSchema.parse(await c.req.json());
  const userId = verifyUnsubscribeToken(token);
  if (!userId) throw badRequest('This unsubscribe link is invalid or has expired');

  const user = await getUserById(userId);
  if (!user) throw badRequest('This unsubscribe link is invalid or has expired');

  await updateUser(userId, {
    notifyNewClass: false,
    notifyBookingConfirm: false,
    notifyClassChange: false,
  });
  return c.json({ ok: true, name: user.name.split(' ')[0] || user.name });
});
