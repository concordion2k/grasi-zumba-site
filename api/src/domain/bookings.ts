import { TransactWriteCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { RosterEntry } from '@grasi/shared';
import { ddb, TABLE } from '../lib/dynamo.js';
import { key, prefix } from '../lib/keys.js';
import { conflict, badRequest, HttpError } from '../lib/errors.js';
import { spendCreditItems } from './billing.js';

interface Booker {
  userId: string;
  name: string;
  email: string;
}

/**
 * How a booking is paid for: covered by an active unlimited subscription, or by spending one class
 * credit. The route picks the method; the credit case carries the title for the ledger note.
 */
export type BookingPayment = { method: 'subscription' } | { method: 'credit'; classTitle: string };

type TxItem = NonNullable<
  ConstructorParameters<typeof TransactWriteCommand>[0]['TransactItems']
>[number];

/**
 * Book a class atomically. A single transaction:
 *   1. increments the class's bookedCount, guarded by `bookedCount < capacity` (no overbooking);
 *   2. creates the user's booking item, guarded by "not already booked" (no double-booking);
 *   3. creates the roster item (admin's view of who's coming);
 *   4. for credit-paid bookings, spends one class credit (guarded `classCredits >= 1`) + logs it.
 * If any condition fails the whole thing rolls back — so a class is never booked without being paid
 * for, and a credit is never spent without a booking.
 */
export async function bookClass(
  booker: Booker,
  classId: string,
  payment: BookingPayment,
): Promise<void> {
  const bookedAt = new Date().toISOString();
  const creditUsed = payment.method === 'credit';
  const items: TxItem[] = [
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
          // Flag credit-paid bookings so a cancel refunds the credit; subscriber bookings don't.
          creditUsed,
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
    ...(payment.method === 'credit' ? spendCreditItems(booker.userId, payment.classTitle) : []),
  ];

  try {
    await ddb.send(new TransactWriteCommand({ TransactItems: items }));
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TransactionCanceledException') {
      // Disambiguate via per-item cancellation reasons (aligned with the items above):
      //   [0] class capacity/existence, [1] already-booked, [3] credit balance.
      const reasons = (err as { CancellationReasons?: Array<{ Code?: string }> })
        .CancellationReasons;
      const failed = (i: number): boolean => reasons?.[i]?.Code === 'ConditionalCheckFailed';
      if (failed(1) || (await isBooked(booker.userId, classId))) {
        throw conflict('You have already booked this class');
      }
      if (failed(3)) {
        throw new HttpError(
          403,
          'You need a class credit to book. Buy a class pack or a drop-in to continue.',
          { code: 'insufficient_credits' },
        );
      }
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
