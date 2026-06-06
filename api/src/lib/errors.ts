import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';

/** An error carrying an HTTP status — thrown by routes/domain, caught by the global handler. */
export class HttpError extends Error {
  constructor(
    public status: ContentfulStatusCode,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (msg: string, details?: unknown) => new HttpError(400, msg, details);
export const unauthorized = (msg = 'Not authenticated') => new HttpError(401, msg);
export const forbidden = (msg = 'Not allowed') => new HttpError(403, msg);
export const notFound = (msg = 'Not found') => new HttpError(404, msg);
export const conflict = (msg: string) => new HttpError(409, msg);

/** Map any thrown error to a JSON error response. */
export function handleError(err: unknown, c: Context) {
  if (err instanceof HttpError) {
    return c.json({ error: err.message, details: err.details }, err.status);
  }
  if (err instanceof ZodError) {
    return c.json({ error: 'Validation failed', details: err.flatten() }, 400);
  }
  // Don't leak internals.
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
}
