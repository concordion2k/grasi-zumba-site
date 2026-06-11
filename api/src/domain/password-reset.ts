import { PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE } from '../lib/dynamo.js';
import { key } from '../lib/keys.js';
import { generateResetToken, hashResetToken } from '../lib/tokens.js';

/** How long a password-reset link stays valid. Short-lived by design. */
export const RESET_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Mint a single-use password-reset token for a user. Only the HMAC of the token is stored (so a
 * table leak can't be replayed), with a TTL so unused tokens auto-expire. Returns the raw token to
 * embed in the emailed link.
 */
export async function createPasswordResetToken(userId: string, email: string): Promise<string> {
  const token = generateResetToken();
  const tokenHash = hashResetToken(token);
  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAt = nowSec + RESET_TTL_SECONDS;

  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        ...key.passwordReset(tokenHash),
        entity: 'PWRESET',
        userId,
        email,
        createdAt: new Date().toISOString(),
        expiresAt, // DynamoDB TTL attribute (epoch seconds)
      },
    }),
  );
  return token;
}

/**
 * Validate and consume a reset token. The delete is conditional + returns the old item, so it is
 * atomically single-use: two concurrent uses can't both succeed. Returns the owning user (id +
 * email) when valid, or null if the token is unknown, already used, or expired.
 */
export async function consumePasswordResetToken(
  token: string,
): Promise<{ userId: string; email: string } | null> {
  const tokenHash = hashResetToken(token);
  let old: Record<string, unknown> | undefined;
  try {
    const res = await ddb.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: key.passwordReset(tokenHash),
        ConditionExpression: 'attribute_exists(pk)',
        ReturnValues: 'ALL_OLD',
      }),
    );
    old = res.Attributes;
  } catch (err: unknown) {
    // Already used / never existed — treat as invalid rather than an error.
    if (err instanceof Error && err.name === 'ConditionalCheckFailedException') return null;
    throw err;
  }
  if (!old) return null;
  // TTL deletion is eventual, so enforce expiry ourselves too.
  if (typeof old.expiresAt === 'number' && old.expiresAt < Date.now() / 1000) return null;
  return { userId: old.userId as string, email: old.email as string };
}
