import {
  TransactWriteCommand,
  GetCommand,
  BatchGetCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { PublicUser, UserRole, NotificationPrefs, SubscriptionStatus } from '@grasi/shared';
import { LEGAL_VERSION } from '@grasi/shared';
import { ddb, TABLE } from '../lib/dynamo.js';
import { key, gsi1, GSI1 } from '../lib/keys.js';
import { newId } from '../lib/ids.js';
import { presignDownload } from '../lib/s3.js';
import { conflict } from '../lib/errors.js';

/** Stored user profile record. Notification prefs are optional on disk — older records predate them
 *  and are resolved to {@link DEFAULT_PREFS} via {@link resolvePrefs}. */
export interface UserRecord {
  userId: string;
  email: string;
  name: string;
  birthday: string;
  role: UserRole;
  profilePictureKey?: string;
  createdAt: string;
  notifyNewClass?: boolean;
  notifyBookingConfirm?: boolean;
  notifyClassChange?: boolean;
  /** Class-credit balance. Absent = 0. */
  classCredits?: number;
  /** Unlimited-plan subscription. Absent = none. */
  subscription?: SubscriptionStatus;
  /** Stripe customer id (created on first checkout). */
  stripeCustomerId?: string;
  /** When the user accepted the Terms & Privacy Policy at signup (ISO). Absent = predates this. */
  termsAcceptedAt?: string;
  /** Which version of the Terms/Privacy was accepted (see LEGAL_VERSION). */
  termsVersion?: string;
}

/** Defaults for users who predate a given preference (new-class is opt-in; the rest are on). */
export const DEFAULT_PREFS: NotificationPrefs = {
  notifyNewClass: false,
  notifyBookingConfirm: true,
  notifyClassChange: true,
};

/** Resolve a (possibly partial) record's prefs to concrete booleans. */
export function resolvePrefs(record: Partial<NotificationPrefs>): NotificationPrefs {
  return {
    notifyNewClass: record.notifyNewClass ?? DEFAULT_PREFS.notifyNewClass,
    notifyBookingConfirm: record.notifyBookingConfirm ?? DEFAULT_PREFS.notifyBookingConfirm,
    notifyClassChange: record.notifyClassChange ?? DEFAULT_PREFS.notifyClassChange,
  };
}

interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  birthday: string;
  role: UserRole;
  /** Signup opt-in for new-class announcements (the other prefs use their defaults). */
  notifyNewClass?: boolean;
}

export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  const userId = newId();
  const createdAt = new Date().toISOString();
  const email = input.email.toLowerCase();

  const profile: UserRecord & Record<string, unknown> = {
    ...key.userProfile(userId),
    ...gsi1.allUsers(createdAt),
    entity: 'USER',
    userId,
    email,
    name: input.name,
    birthday: input.birthday,
    role: input.role,
    createdAt,
    notifyNewClass: input.notifyNewClass ?? DEFAULT_PREFS.notifyNewClass,
    notifyBookingConfirm: DEFAULT_PREFS.notifyBookingConfirm,
    notifyClassChange: DEFAULT_PREFS.notifyClassChange,
    // Registration requires accepting the Terms/Privacy (enforced by registerSchema), so every new
    // account records the acceptance at creation.
    termsAcceptedAt: createdAt,
    termsVersion: LEGAL_VERSION,
  };

  const credential = {
    ...key.emailCredential(email),
    entity: 'EMAIL',
    email,
    userId,
    passwordHash: input.passwordHash,
  };

  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            // Email uniqueness lock — fails the whole transaction if the email is taken.
            Put: {
              TableName: TABLE,
              Item: credential,
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
          {
            Put: {
              TableName: TABLE,
              Item: profile,
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
        ],
      }),
    );
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TransactionCanceledException') {
      throw conflict('An account with that email already exists');
    }
    throw err;
  }

  return {
    userId,
    email,
    name: input.name,
    birthday: input.birthday,
    role: input.role,
    createdAt,
    notifyNewClass: input.notifyNewClass ?? DEFAULT_PREFS.notifyNewClass,
    notifyBookingConfirm: DEFAULT_PREFS.notifyBookingConfirm,
    notifyClassChange: DEFAULT_PREFS.notifyClassChange,
    termsAcceptedAt: createdAt,
    termsVersion: LEGAL_VERSION,
  };
}

export async function getUserById(userId: string): Promise<UserRecord | null> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: key.userProfile(userId) }));
  return (res.Item as UserRecord | undefined) ?? null;
}

export async function getCredentialByEmail(
  email: string,
): Promise<{ userId: string; passwordHash: string } | null> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: key.emailCredential(email) }));
  if (!res.Item) return null;
  return { userId: res.Item.userId as string, passwordHash: res.Item.passwordHash as string };
}

/** Update the stored password hash for an email credential. */
export async function updatePassword(email: string, passwordHash: string): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: key.emailCredential(email),
      UpdateExpression: 'SET passwordHash = :h',
      ConditionExpression: 'attribute_exists(pk)',
      ExpressionAttributeValues: { ':h': passwordHash },
    }),
  );
}

export async function updateUser(
  userId: string,
  patch: Partial<
    Pick<
      UserRecord,
      | 'name'
      | 'birthday'
      | 'profilePictureKey'
      | 'role'
      | 'notifyNewClass'
      | 'notifyBookingConfirm'
      | 'notifyClassChange'
      | 'stripeCustomerId'
    >
  >,
): Promise<UserRecord | null> {
  const sets: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    sets.push(`#${field} = :${field}`);
    names[`#${field}`] = field;
    values[`:${field}`] = value;
  }
  if (sets.length === 0) return getUserById(userId);

  const res = await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: key.userProfile(userId),
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(pk)',
      ReturnValues: 'ALL_NEW',
    }),
  );
  return (res.Attributes as UserRecord | undefined) ?? null;
}

export async function listUsers(): Promise<UserRecord[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: GSI1,
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: { ':pk': 'USERS' },
      ScanIndexForward: false, // newest signups first
    }),
  );
  return (res.Items as UserRecord[] | undefined) ?? [];
}

/** Fetch many users by id in one round trip (chunked to DynamoDB's 100-key BatchGet limit). */
export async function getUsersByIds(userIds: string[]): Promise<UserRecord[]> {
  const unique = [...new Set(userIds)];
  const out: UserRecord[] = [];
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const res = await ddb.send(
      new BatchGetCommand({
        RequestItems: { [TABLE]: { Keys: chunk.map((id) => key.userProfile(id)) } },
      }),
    );
    out.push(...((res.Responses?.[TABLE] as UserRecord[] | undefined) ?? []));
  }
  return out;
}

/** Convert a stored record into the client-facing shape (presigning the avatar if present). */
export async function toPublicUser(record: UserRecord): Promise<PublicUser> {
  const profilePictureUrl = record.profilePictureKey
    ? await presignDownload(record.profilePictureKey)
    : null;
  return {
    userId: record.userId,
    email: record.email,
    name: record.name,
    birthday: record.birthday,
    role: record.role,
    profilePictureUrl,
    createdAt: record.createdAt,
    ...resolvePrefs(record),
  };
}
