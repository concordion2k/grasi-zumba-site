import { PutCommand, GetCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE } from '../lib/dynamo.js';
import { key, gsi1, GSI1 } from '../lib/keys.js';
import { generateSessionToken, hashToken } from '../lib/tokens.js';
import { SESSION_TTL_SECONDS } from '../lib/cookies.js';

/** Create a session for a user. Returns the raw token (to put in the cookie). */
export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAt = nowSec + SESSION_TTL_SECONDS;

  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        ...key.session(tokenHash),
        ...gsi1.userSessions(userId, expiresAt),
        entity: 'SESSION',
        userId,
        createdAt: new Date().toISOString(),
        expiresAt, // DynamoDB TTL attribute (epoch seconds)
      },
    }),
  );
  return token;
}

/** Resolve a raw token to a userId, or null if missing/expired. */
export async function getSessionUserId(token: string): Promise<string | null> {
  const tokenHash = hashToken(token);
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: key.session(tokenHash) }));
  if (!res.Item) return null;
  // TTL deletion is eventual — enforce expiry ourselves too.
  if (typeof res.Item.expiresAt === 'number' && res.Item.expiresAt < Date.now() / 1000) {
    return null;
  }
  return res.Item.userId as string;
}

export async function deleteSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await ddb.send(new DeleteCommand({ TableName: TABLE, Key: key.session(tokenHash) }));
}

/** Revoke every session for a user ("log out everywhere"). */
export async function deleteAllSessionsForUser(userId: string): Promise<void> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: GSI1,
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: { ':pk': `USERSESSIONS#${userId}` },
    }),
  );
  const items = res.Items ?? [];
  await Promise.all(
    items.map((item) =>
      ddb.send(new DeleteCommand({ TableName: TABLE, Key: { pk: item.pk, sk: item.sk } })),
    ),
  );
}
