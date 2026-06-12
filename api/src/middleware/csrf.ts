import type { MiddlewareHandler } from 'hono';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '@grasi/shared';
import { forbidden } from '../lib/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
/** Server-to-server endpoints (no browser, no cookies) that authenticate by other means. */
const EXEMPT_PATHS = ['/api/stripe/webhook'];

/**
 * CSRF defense-in-depth: state-changing requests must carry `X-Requested-With: fetch`. A browser
 * cannot set a custom header on a cross-site form/navigation request without a CORS preflight,
 * which our CORS config does not grant to other origins. Combined with SameSite=Lax cookies.
 */
export const csrfGuard: MiddlewareHandler = async (c, next) => {
  if (!SAFE_METHODS.has(c.req.method) && !EXEMPT_PATHS.includes(c.req.path)) {
    if (c.req.header(CSRF_HEADER) !== CSRF_HEADER_VALUE) {
      throw forbidden('Missing or invalid CSRF header');
    }
  }
  await next();
};
