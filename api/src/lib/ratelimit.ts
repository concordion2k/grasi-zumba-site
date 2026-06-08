import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE } from './dynamo.js';

/**
 * Lightweight fixed-window rate limiter backed by DynamoDB (atomic counter + TTL auto-cleanup).
 * Returns true if the request is within the limit, false if it should be rejected.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const nowSec = Math.floor(Date.now() / 1000);
  const window = Math.floor(nowSec / windowSeconds);
  const expiresAt = (window + 1) * windowSeconds + 60; // TTL attribute (epoch seconds)
  try {
    const res = await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { pk: `RATELIMIT#${key}#${window}`, sk: 'RL' },
        UpdateExpression:
          'SET #c = if_not_exists(#c, :zero) + :one, expiresAt = if_not_exists(expiresAt, :exp)',
        ExpressionAttributeNames: { '#c': 'count' },
        ExpressionAttributeValues: { ':zero': 0, ':one': 1, ':exp': expiresAt },
        ReturnValues: 'UPDATED_NEW',
      }),
    );
    return Number(res.Attributes?.count ?? 0) <= limit;
  } catch (err) {
    // Fail open — a limiter hiccup shouldn't block legitimate use.
    console.error('[ratelimit] error, allowing request', err);
    return true;
  }
}
