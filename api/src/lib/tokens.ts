import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../env.js';

/** Generate a fresh opaque session token (sent to the client in a cookie). */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Hash a session token for storage. We store only the HMAC, peppered with SESSION_SECRET, so a
 * leak of the DynamoDB table does not expose usable session tokens.
 */
export function hashToken(token: string): string {
  return createHmac('sha256', env.sessionSecret).update(token).digest('hex');
}

/**
 * Stateless, self-verifying unsubscribe token: `<userId>.<hmac>`. No storage needed — we recompute
 * the HMAC to validate. Peppered with SESSION_SECRET (namespaced so it can't be confused with a
 * session token). Does not expire: unsubscribe links should keep working indefinitely.
 */
export function makeUnsubscribeToken(userId: string): string {
  const sig = createHmac('sha256', env.sessionSecret)
    .update(`unsubscribe:${userId}`)
    .digest('base64url');
  return `${userId}.${sig}`;
}

/** Verify an unsubscribe token, returning the userId if valid (and null otherwise). */
export function verifyUnsubscribeToken(token: string): string | null {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const expected = makeUnsubscribeToken(userId);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}
