import { TransactWriteCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { RosterEntry } from '@grasi/shared';
import { ddb, TABLE } from '../lib/dynamo.js';
import { key, prefix } from '../lib/keys.js';
import { conflict, badRequest } from '../lib/errors.js';

interface Booker {
  userId: string;
  name: string;
  email: string;
}

/**
 * Book a class atomically. A single transaction:
 *   1. increments the class's bookedCount, guarded by `bookedCount < capacity` (no overbooking);
 *   2. creates the user's booking item, guarded by "not already booked" (no double-booking);
 *   3. creates the roster item (admin's view of who's coming).
 * If any condition fails the whole thing rolls back.
 */
export async function bookClass(booker: Booker, classId: string): Promise<void> {
  const bookedAt = new Date().toISOString();
  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: TABLE,
              Key: key.class(classId),
              UpdateExpression: 'SET #bookedCount = #bookedCount + :one',
              // `capacity` is a DynamoDB reserved word, so both names are aliased.
              ConditionExpression: 'attribute_exists(pk) AND #bookedCount < #capacity',
              ExpressionAttributeNames: { '#bookedCount': 'bookedCount', '#capacity': 'capacity' },
              ExpressionAttributeValues: { ':one': 1 },
            },
          },
          {
            Put: {
              TableName: TABLE,
              Item: {
                ...key.userBooking(booker.userId, classId),
                entity: 'BOOKING',
                classId,
                bookedAt,
              },
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
          {
            Put: {
              TableName: TABLE,
              Item: {
                ...key.classRosterEntry(classId, booker.userId),
                entity: 'ROSTER',
                userId: booker.userId,
                name: booker.name,
                email: booker.email,
                bookedAt,
              },
            },
          },
        ],
      }),
    );
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TransactionCanceledException') {
      // Could be: class gone, full, or already booked. Disambiguate for a helpful message.
      const existing = await isBooked(booker.userId, classId);
      if (existing) throw conflict('You have already booked this class');
      throw badRequest('This class is full or no longer available');
    }
    throw err;
  }
}

export async function cancelBooking(userId: string, classId: string): Promise<void> {
  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Delete: {
              TableName: TABLE,
              Key: key.userBooking(userId, classId),
              ConditionExpression: 'attribute_exists(pk)',
            },
          },
          {
            Delete: { TableName: TABLE, Key: key.classRosterEntry(classId, userId) },
          },
          {
            Update: {
              TableName: TABLE,
              Key: key.class(classId),
              UpdateExpression: 'SET #bookedCount = #bookedCount - :one',
              ConditionExpression: 'attribute_exists(pk) AND #bookedCount > :zero',
              ExpressionAttributeNames: { '#bookedCount': 'bookedCount' },
              ExpressionAttributeValues: { ':one': 1, ':zero': 0 },
            },
          },
        ],
      }),
    );
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TransactionCanceledException') {
      throw conflict('You do not have a booking for this class');
    }
    throw err;
  }
}

export async function isBooked(userId: string, classId: string): Promise<boolean> {
  const res = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: key.userBooking(userId, classId) }),
  );
  return Boolean(res.Item);
}

/** All classIds a user has booked (with when). */
export async function listUserBookings(
  userId: string,
): Promise<Array<{ classId: string; bookedAt: string }>> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': prefix.booking },
    }),
  );
  return (res.Items ?? []).map((item) => ({
    classId: item.classId as string,
    bookedAt: item.bookedAt as string,
  }));
}

export async function countUserBookings(userId: string): Promise<number> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': prefix.booking },
      Select: 'COUNT',
    }),
  );
  return res.Count ?? 0;
}

/** Who's coming to a class (admin roster). */
export async function listRoster(classId: string): Promise<RosterEntry[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': `CLASS#${classId}`, ':prefix': prefix.booking },
    }),
  );
  return (res.Items ?? []).map((item) => ({
    userId: item.userId as string,
    name: item.name as string,
    email: item.email as string,
    bookedAt: item.bookedAt as string,
  }));
}
