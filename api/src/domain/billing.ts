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

/** One entry in a DynamoDB TransactWrite (Put/Update/Delete/ConditionCheck). */
type TxItem = NonNullable<
  ConstructorParameters<typeof TransactWriteCommand>[0]['TransactItems']
>[number];

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
  provider?: 'mock' | 'stripe';
  providerRef?: string;
}

function newEntry(fields: EntryFields): LedgerEntry {
  return { entryId: newId(), createdAt: new Date().toISOString(), provider: 'mock', ...fields };
}

/** Per-object idempotency marker so re-delivered Stripe events don't double-apply. */
function stripeMarker(userId: string, objectId: string) {
  return {
    pk: `USER#${userId}`,
    sk: `STRIPE#${objectId}`,
    entity: 'STRIPEEVENT',
    userId,
    objectId,
  };
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

// --- Booking credit consumption -----------------------------------------------------------------

/**
 * Transaction items that spend one class credit on a booking and log it to the ledger. Designed to
 * be merged into the booking transaction (see `bookClass`) so the credit is consumed *atomically*
 * with the booking — there's no window where a class is booked without a credit being spent. The
 * credit decrement is guarded (`classCredits >= 1`), so if the customer raced their balance to zero
 * the whole booking transaction is cancelled. Pair this with a booking Put that sets
 * `creditUsed: true` so a later cancel can refund it ([[refundBookingCredit]]).
 */
export function spendCreditItems(userId: string, classTitle: string): TxItem[] {
  const entry = newEntry({
    type: 'class_booking',
    creditDelta: -1,
    amountCents: 0,
    note: `Booked: ${classTitle}`,
    by: 'system',
  });
  return [
    {
      Update: {
        TableName: TABLE,
        Key: key.userProfile(userId),
        UpdateExpression: 'SET classCredits = classCredits - :one',
        ConditionExpression: 'attribute_exists(pk) AND classCredits >= :one',
        ExpressionAttributeValues: { ':one': 1 },
      },
    },
    { Put: { TableName: TABLE, Item: ledgerItem(userId, entry) } },
  ];
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

// --- Stripe-driven entries (called from webhooks; idempotent via a per-object marker) ----------

/** Apply a completed one-time Stripe payment (pack/drop-in): add credits + log the charge, once. */
export async function applyStripePayment(
  userId: string,
  opts: {
    objectId: string;
    type: LedgerEntryType;
    credits: number;
    amountCents: number;
    note: string;
  },
): Promise<void> {
  const entry = newEntry({
    type: opts.type,
    creditDelta: opts.credits,
    amountCents: opts.amountCents,
    note: opts.note,
    by: 'stripe',
    provider: 'stripe',
    providerRef: opts.objectId,
  });
  const items: NonNullable<ConstructorParameters<typeof TransactWriteCommand>[0]['TransactItems']> =
    [
      {
        Put: {
          TableName: TABLE,
          Item: stripeMarker(userId, opts.objectId),
          ConditionExpression: 'attribute_not_exists(pk)',
        },
      },
      { Put: { TableName: TABLE, Item: ledgerItem(userId, entry) } },
    ];
  if (opts.credits !== 0) {
    items.push({
      Update: {
        TableName: TABLE,
        Key: key.userProfile(userId),
        UpdateExpression: 'SET classCredits = if_not_exists(classCredits, :z) + :c',
        ConditionExpression: 'attribute_exists(pk)',
        ExpressionAttributeValues: { ':z': 0, ':c': opts.credits },
      },
    });
  }
  try {
    await ddb.send(new TransactWriteCommand({ TransactItems: items }));
  } catch (err) {
    // Duplicate event (marker exists) or user gone — safe to ignore.
    if (err instanceof Error && err.name === 'TransactionCanceledException') return;
    throw err;
  }
}

/** Set the user's subscription from Stripe (active/canceled + renewal date). */
export async function setStripeSubscription(
  userId: string,
  opts: { active: boolean; renewsAt: string },
): Promise<void> {
  const subscription: SubscriptionStatus = {
    active: opts.active,
    plan: 'unlimited',
    startedAt: new Date().toISOString(),
    renewsAt: opts.renewsAt,
    provider: 'stripe',
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
}

/** Log a subscription invoice charge once (initial + renewals). */
export async function recordStripeInvoice(
  userId: string,
  opts: { objectId: string; amountCents: number },
): Promise<void> {
  const entry = newEntry({
    type: 'subscription',
    creditDelta: 0,
    amountCents: opts.amountCents,
    note: 'Unlimited subscription — monthly',
    by: 'stripe',
    provider: 'stripe',
    providerRef: opts.objectId,
  });
  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE,
              Item: stripeMarker(userId, opts.objectId),
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
          { Put: { TableName: TABLE, Item: ledgerItem(userId, entry) } },
        ],
      }),
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'TransactionCanceledException') return;
    throw err;
  }
}
