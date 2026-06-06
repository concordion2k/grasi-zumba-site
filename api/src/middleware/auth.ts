import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { AppEnv } from '../types.js';
import { SESSION_COOKIE } from '../lib/cookies.js';
import { getSessionUserId } from '../domain/sessions.js';
import { getUserById, type UserRecord } from '../domain/users.js';
import { unauthorized, forbidden } from '../lib/errors.js';

/** Populate `c.var.user` from the session cookie, if any. Always continues. */
export const loadUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    const userId = await getSessionUserId(token);
    if (userId) {
      const user = await getUserById(userId);
      if (user) c.set('user', user);
    }
  }
  await next();
};

/** Require an authenticated user. */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.var.user) throw unauthorized();
  await next();
};

/** Require an authenticated admin. */
export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.var.user) throw unauthorized();
  if (c.var.user.role !== 'admin') throw forbidden('Admin access required');
  await next();
};

/** Convenience: get the current user, asserting presence (use after requireAuth). */
export function currentUser(c: { var: { user?: UserRecord } }): UserRecord {
  if (!c.var.user) throw unauthorized();
  return c.var.user;
}
