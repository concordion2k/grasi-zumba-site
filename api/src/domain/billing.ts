import {
  TransactWriteCommand,
  UpdateCommand,
  QueryCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  CLASS_PACKAGES,
  DROP_IN_PRICE_CENTS,
  SUBSCRIPTION_PRICE_CENTS,
  PACKAGE_EXPIRY_DAYS,
  type LedgerEntry,
  type LedgerEntryType,
  type BillingSummary,
  type MyBillingSummary,
  type SubscriptionStatus,
} from '@grasi/shared';
import { ddb, TABLE } from '../lib/dynamo.js';
import { key, prefix } from '../lib/keys.js';
import { newId } from '../lib/ids.js';
import { badRequest } from '../lib/errors.js';
import type { UserRecord } from './users.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function toLedgerEntry(item: Record<string, unknown>): LedgerEntry {
  return {
    entryId: item.entryId as string,
    createdAt: item.createdAt as string,
    type: item.type as LedgerEntryType,
    creditDelta: (item.creditDelta as number) ?? 0,
    amountCents: (item.amountCents as number) ?? 0,
    note: (item.note as string) ?? '',
    by: (item.by as string) ?? 'system',
    provider: (item.provider as 'mock' | 'stripe') ?? 'mock',
  };
}

/** A customer's billing history (newest first). */
export async function listLedger(userId: string): Promise<LedgerEntry[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :p)',
      ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':p': prefix.ledger },
      ScanIndexForward: false,
    }),
  );
  return (res.Items ?? []).map(toLedgerEntry);
}

/** Compute the at-a-glance billing position from the user record + ledger. */
export function billingSummary(user: UserRecord, ledger: LedgerEntry[]): BillingSummary {
  const classCredits = user.classCredits ?? 0;
  const subscription = user.subscription ?? null;
  const totalPaidCents = ledger.reduce((sum, e) => sum + e.amountCents, 0);
  const needsDropIn = !(subscription?.active ?? false) && classCredits <= 0;
  return { classCredits, subscription, totalPaidCents, needsDropIn };
}

/**
 * The customer-facing view. Credits are consumed at booking time (and refunded on cancel), so the
 * live balance is the remaining count — the same number the admin sees. Subscribers book without
 * drawing down credits.
 */
export function myBilling(
  user: UserRecord,
  ledger: LedgerEntry[],
  bookingsCount: number,
): MyBillingSummary {
  // Credits are consumed at booking time now, so the live balance IS the remaining count (the same
  // number the admin sees). "Purchased" counts only acquired credits (packs + grants), not the
  // booking debits/refunds.
  const classesPurchased = ledger.reduce(
    (s, e) => (e.type === 'package_purchase' || e.type === 'manual_credit' ? s + e.creditDelta : s),
    0,
  );
  return {
    classesPurchased,
    classesRemaining: Math.max(0, user.classCredits ?? 0),
    classesBooked: bookingsCount,
    subscription: user.subscription ?? null,
  };
}

/**
 * Append a ledger entry and atomically adjust the credit balance. A single transaction keeps the
 * cached `classCredits` on the profile in sync with the immutable ledger. Deductions are guarded so
 * the balance can't go negative.
 */
interface EntryFields {
  type: LedgerEntryType;
  creditDelta: number;
  amountCents: number;
  note: string;
  by: string;
}

function newEntry(fields: EntryFields): LedgerEntry {
  return { entryId: newId(), createdAt: new Date().toISOString(), provider: 'mock', ...fields };
}

function ledgerItem(userId: string, entry: LedgerEntry) {
  return {
    ...key.ledgerEntry(userId, entry.createdAt, entry.entryId),
    entity: 'LEDGER',
    userId,
    ...entry,
  };
}

async function appendEntry(userId: string, fields: EntryFields): Promise<LedgerEntry> {
  const entry = newEntry(fields);
  const item = ledgerItem(userId, entry);

  const deduct = entry.creditDelta < 0;
  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE,
            Key: key.userProfile(userId),
            UpdateExpression: 'SET classCredits = if_not_exists(classCredits, :zero) + :delta',
            // NB: if_not_exists() is only valid in UpdateExpression, not ConditionExpression. A
            // missing classCredits makes `classCredits >= :need` false, so deducting from a zero/
            // absent balance is correctly blocked (surfaced as a 400 by the caller).
            ConditionExpression: deduct
              ? 'attribute_exists(pk) AND classCredits >= :need'
              : 'attribute_exists(pk)',
            ExpressionAttributeValues: {
              ':zero': 0,
              ':delta': entry.creditDelta,
              ...(deduct ? { ':need': -entry.creditDelta } : {}),
            },
          },
        },
        { Put: { TableName: TABLE, Item: item } },
      ],
    }),
  );
  return entry;
}

/** Admin grants (positive) or removes (negative) class credits. */
export async function adjustCredits(
  userId: string,
  amount: number,
  note: string,
  by: string,
): Promise<LedgerEntry> {
  if (!Number.isInteger(amount) || amount === 0) throw badRequest('Enter a non-zero whole number');
  try {
    return await appendEntry(userId, {
      type: amount > 0 ? 'manual_credit' : 'adjustment',
      creditDelta: amount,
      amountCents: 0,
      note: note || (amount > 0 ? 'Manual credit' : 'Credit adjustment'),
      by,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TransactionCanceledException') {
      throw badRequest("Can't remove more credits than the customer has");
    }
    throw err;
  }
}

/** Record a mock class-pack purchase: adds the pack's credits and logs the price. */
export async function recordPackagePurchase(
  userId: string,
  size: number,
  by: string,
): Promise<LedgerEntry> {
  const pack = CLASS_PACKAGES.find((p) => p.size === size);
  if (!pack) throw badRequest('Unknown package size');
  const expires = new Date(Date.now() + PACKAGE_EXPIRY_DAYS * DAY_MS).toISOString().slice(0, 10);
  return appendEntry(userId, {
    type: 'package_purchase',
    creditDelta: pack.size,
    amountCents: pack.priceCents,
    note: `${pack.size}-class pack (valid through ${expires})`,
    by,
  });
}

/** Record a mock single drop-in payment (a paid class, no credit change). */
export async function recordDropIn(userId: string, by: string): Promise<LedgerEntry> {
  return appendEntry(userId, {
    type: 'dropin_payment',
    creditDelta: 0,
    amountCents: DROP_IN_PRICE_CENTS,
    note: 'Drop-in class',
    by,
  });
}

/** Mock-activate or deactivate the unlimited subscription. Activating logs a subscription charge. */
export async function setSubscription(
  userId: string,
  active: boolean,
  by: string,
): Promise<SubscriptionStatus> {
  const now = new Date();
  const subscription: SubscriptionStatus = active
    ? {
        active: true,
        plan: 'unlimited',
        startedAt: now.toISOString(),
        renewsAt: new Date(now.getTime() + 30 * DAY_MS).toISOString(),
        provider: 'mock',
      }
    : {
        active: false,
        plan: 'unlimited',
        startedAt: now.toISOString(),
        renewsAt: now.toISOString(),
        provider: 'mock',
      };

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: key.userProfile(userId),
      UpdateExpression: 'SET subscription = :s',
      ConditionExpression: 'attribute_exists(pk)',
      ExpressionAttributeValues: { ':s': subscription },
    }),
  );

  if (active) {
    await appendEntry(userId, {
      type: 'subscription',
      creditDelta: 0,
      amountCents: SUBSCRIPTION_PRICE_CENTS,
      note: 'Unlimited subscription — monthly',
      by,
    });
  }
  return subscription;
}

// --- Booking credit consumption (best-effort; never blocks the booking itself) ----------------

/**
 * Spend one class credit on a booking and flag the booking item so a cancel can refund it. No-op
 * for subscribers (unlimited) or when the customer has no credits (a drop-in is owed instead).
 * Atomic: decrement + flag + ledger entry in one transaction, guarded so the balance never goes
 * negative. A guard failure (raced to zero) is swallowed — the booking still stands.
 */
export async function consumeBookingCredit(
  user: UserRecord,
  classId: string,
  classTitle: string,
): Promise<void> {
  if (user.subscription?.active) return;
  if ((user.classCredits ?? 0) <= 0) return;

  const entry = newEntry({
    type: 'class_booking',
    creditDelta: -1,
    amountCents: 0,
    note: `Booked: ${classTitle}`,
    by: 'system',
  });
  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: TABLE,
              Key: key.userProfile(user.userId),
              UpdateExpression: 'SET classCredits = classCredits - :one',
              ConditionExpression: 'attribute_exists(pk) AND classCredits >= :one',
              ExpressionAttributeValues: { ':one': 1 },
            },
          },
          {
            Update: {
              TableName: TABLE,
              Key: key.userBooking(user.userId, classId),
              UpdateExpression: 'SET creditUsed = :t',
              ConditionExpression: 'attribute_exists(pk)',
              ExpressionAttributeValues: { ':t': true },
            },
          },
          { Put: { TableName: TABLE, Item: ledgerItem(user.userId, entry) } },
        ],
      }),
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'TransactionCanceledException') return;
    throw err;
  }
}

/** Whether a booking spent a credit (read before cancelling, since cancel deletes the item). */
export async function bookingUsedCredit(userId: string, classId: string): Promise<boolean> {
  const res = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: key.userBooking(userId, classId) }),
  );
  return Boolean(res.Item?.creditUsed);
}

/** Refund the credit a cancelled booking had spent (+1), with a ledger entry. */
export async function refundBookingCredit(userId: string, classTitle: string): Promise<void> {
  const entry = newEntry({
    type: 'class_booking',
    creditDelta: 1,
    amountCents: 0,
    note: `Canceled: ${classTitle} — credit refunded`,
    by: 'system',
  });
  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE,
            Key: key.userProfile(userId),
            UpdateExpression: 'SET classCredits = if_not_exists(classCredits, :zero) + :one',
            ConditionExpression: 'attribute_exists(pk)',
            ExpressionAttributeValues: { ':zero': 0, ':one': 1 },
          },
        },
        { Put: { TableName: TABLE, Item: ledgerItem(userId, entry) } },
      ],
    }),
  );
}
