import type { MiddlewareHandler } from 'hono';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '@grasi/shared';
import { forbidden } from '../lib/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defense-in-depth: state-changing requests must carry `X-Requested-With: fetch`. A browser
 * cannot set a custom header on a cross-site form/navigation request without a CORS preflight,
 * which our CORS config does not grant to other origins. Combined with SameSite=Lax cookies.
 */
export const csrfGuard: MiddlewareHandler = async (c, next) => {
  if (!SAFE_METHODS.has(c.req.method)) {
    if (c.req.header(CSRF_HEADER) !== CSRF_HEADER_VALUE) {
      throw forbidden('Missing or invalid CSRF header');
    }
  }
  await next();
};
