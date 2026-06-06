import { PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { CrmNote } from '@grasi/shared';
import { ddb, TABLE } from '../lib/dynamo.js';
import { key, prefix } from '../lib/keys.js';
import { newId } from '../lib/ids.js';

export async function createNote(
  customerId: string,
  author: { userId: string; name: string },
  body: string,
): Promise<CrmNote> {
  const noteId = newId();
  const now = new Date().toISOString();
  const note: CrmNote = {
    noteId,
    customerId,
    authorId: author.userId,
    authorName: author.name,
    body,
    createdAt: now,
    updatedAt: now,
  };
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: { ...key.note(customerId, noteId), entity: 'NOTE', ...note },
    }),
  );
  return note;
}

export async function listNotes(customerId: string): Promise<CrmNote[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': `USER#${customerId}`, ':prefix': prefix.note },
      ScanIndexForward: false,
    }),
  );
  return (res.Items as CrmNote[] | undefined) ?? [];
}

export async function countNotes(customerId: string): Promise<number> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': `USER#${customerId}`, ':prefix': prefix.note },
      Select: 'COUNT',
    }),
  );
  return res.Count ?? 0;
}

export async function deleteNote(customerId: string, noteId: string): Promise<void> {
  await ddb.send(new DeleteCommand({ TableName: TABLE, Key: key.note(customerId, noteId) }));
}
