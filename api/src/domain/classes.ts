import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { ZumbaClass } from '@grasi/shared';
import { ddb, TABLE } from '../lib/dynamo.js';
import { key, gsi1, GSI1 } from '../lib/keys.js';
import { newId } from '../lib/ids.js';
import { badRequest, notFound } from '../lib/errors.js';

export interface ClassRecord {
  classId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  bookedCount: number;
  createdBy: string;
  createdAt: string;
}

interface CreateClassInput {
  title: string;
  description: string;
  startTime: string;
  durationMinutes: number;
  location: string;
  capacity: number;
}

interface UpdateClassInput {
  title?: string;
  description?: string;
  startTime?: string;
  durationMinutes?: number;
  location?: string;
  capacity?: number;
}

export async function createClass(
  input: CreateClassInput,
  createdBy: string,
): Promise<ClassRecord> {
  const classId = newId();
  const createdAt = new Date().toISOString();
  const endTime = new Date(
    new Date(input.startTime).getTime() + input.durationMinutes * 60_000,
  ).toISOString();

  const record: ClassRecord = {
    classId,
    title: input.title,
    description: input.description,
    startTime: input.startTime,
    endTime,
    location: input.location,
    capacity: input.capacity,
    bookedCount: 0,
    createdBy,
    createdAt,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        ...key.class(classId),
        ...gsi1.allClasses(input.startTime),
        entity: 'CLASS',
        ...record,
      },
    }),
  );
  return record;
}

export async function getClass(classId: string): Promise<ClassRecord | null> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: key.class(classId) }));
  return (res.Item as ClassRecord | undefined) ?? null;
}

/**
 * Edit a class. Returns the records before and after, so the caller can diff them to describe the
 * change in notifications. Changing the start time also recomputes endTime and the GSI sort key so
 * the slot stays correctly ordered in the schedule. Capacity can't drop below current bookings.
 */
export async function updateClass(
  classId: string,
  input: UpdateClassInput,
): Promise<{ before: ClassRecord; after: ClassRecord }> {
  const before = await getClass(classId);
  if (!before) throw notFound('Class not found');

  if (input.capacity !== undefined && input.capacity < before.bookedCount) {
    throw badRequest(`Capacity can't be below the ${before.bookedCount} spots already booked`);
  }

  const startTime = input.startTime ?? before.startTime;
  const startChanged = input.startTime !== undefined && input.startTime !== before.startTime;
  const durationChanged = input.durationMinutes !== undefined;
  // Recompute the end time if either the start moved or the duration changed.
  let endTime = before.endTime;
  if (startChanged || durationChanged) {
    const durationMs = durationChanged
      ? input.durationMinutes! * 60_000
      : new Date(before.endTime).getTime() - new Date(before.startTime).getTime();
    endTime = new Date(new Date(startTime).getTime() + durationMs).toISOString();
  }

  const next: Record<string, unknown> = {};
  if (input.title !== undefined) next.title = input.title;
  if (input.description !== undefined) next.description = input.description;
  if (input.location !== undefined) next.location = input.location;
  if (input.capacity !== undefined) next.capacity = input.capacity;
  if (startChanged || durationChanged) {
    next.startTime = startTime;
    next.endTime = endTime;
  }
  if (startChanged) next.gsi1sk = startTime; // keep the schedule ordering index in sync

  const sets: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(next)) {
    sets.push(`#${field} = :${field}`);
    names[`#${field}`] = field;
    values[`:${field}`] = value;
  }
  if (sets.length === 0) return { before, after: before };

  const res = await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: key.class(classId),
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(pk)',
      ReturnValues: 'ALL_NEW',
    }),
  );
  return { before, after: res.Attributes as ClassRecord };
}

/**
 * Cancel (delete) a class and every booking attached to it: the class metadata, each roster entry,
 * and each booker's own BOOKING# item. Pass the booked userIds (capture them before calling, so they
 * can also be notified). Batched to DynamoDB's 25-item BatchWrite limit.
 */
export async function cancelClass(classId: string, bookedUserIds: string[]): Promise<void> {
  const deletes = [
    { DeleteRequest: { Key: key.class(classId) } },
    ...bookedUserIds.flatMap((userId) => [
      { DeleteRequest: { Key: key.classRosterEntry(classId, userId) } },
      { DeleteRequest: { Key: key.userBooking(userId, classId) } },
    ]),
  ];

  for (let i = 0; i < deletes.length; i += 25) {
    await ddb.send(new BatchWriteCommand({ RequestItems: { [TABLE]: deletes.slice(i, i + 25) } }));
  }
}

/** List classes whose start time falls in [from, to] (ISO strings), soonest first. */
export async function listClassesInRange(from: string, to: string): Promise<ClassRecord[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: GSI1,
      KeyConditionExpression: 'gsi1pk = :pk AND gsi1sk BETWEEN :from AND :to',
      ExpressionAttributeValues: { ':pk': 'CLASS', ':from': from, ':to': to },
      ScanIndexForward: true,
    }),
  );
  return (res.Items as ClassRecord[] | undefined) ?? [];
}

export function toZumbaClass(record: ClassRecord): ZumbaClass {
  return {
    classId: record.classId,
    title: record.title,
    description: record.description,
    startTime: record.startTime,
    endTime: record.endTime,
    location: record.location,
    capacity: record.capacity,
    bookedCount: record.bookedCount,
    createdBy: record.createdBy,
    createdAt: record.createdAt,
  };
}
