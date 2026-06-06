import { PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { ZumbaClass } from '@grasi/shared';
import { ddb, TABLE } from '../lib/dynamo.js';
import { key, gsi1, GSI1 } from '../lib/keys.js';
import { newId } from '../lib/ids.js';

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
