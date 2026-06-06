import { createHmac, randomBytes } from 'node:crypto';
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
