import type { Context } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { env } from '../env.js';

export const SESSION_COOKIE = 'grasi_session';

/** Max session lifetime in seconds (30 days). */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export function setSessionCookie(c: Context, token: string) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}
