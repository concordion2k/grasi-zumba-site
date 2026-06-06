import {
  TransactWriteCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { PublicUser, UserRole } from '@grasi/shared';
import { ddb, TABLE } from '../lib/dynamo.js';
import { key, gsi1, GSI1 } from '../lib/keys.js';
import { newId } from '../lib/ids.js';
import { presignDownload } from '../lib/s3.js';
import { conflict } from '../lib/errors.js';

/** Stored user profile record. */
export interface UserRecord {
  userId: string;
  email: string;
  name: string;
  birthday: string;
  role: UserRole;
  profilePictureKey?: string;
  createdAt: string;
}

interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  birthday: string;
  role: UserRole;
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

export async function updateUser(
  userId: string,
  patch: Partial<Pick<UserRecord, 'name' | 'birthday' | 'profilePictureKey' | 'role'>>,
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
  };
}
