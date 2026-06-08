import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createHash } from 'node:crypto';
import { WAIVER_DOCUMENT, WAIVER_VERSION, type WaiverStatus } from '@grasi/shared';
import { ddb, TABLE } from '../lib/dynamo.js';
import { key } from '../lib/keys.js';

/** The stored, immutable signature record (one per user; replaced only on re-sign of a new version). */
export interface WaiverRecord {
  userId: string;
  /** Typed full legal name (the electronic signature). */
  fullName: string;
  /** Waiver version that was signed. */
  version: string;
  /** SHA-256 of the exact document text that was presented, for integrity/audit. */
  contentHash: string;
  photoRelease: boolean;
  signedAt: string;
  ip?: string;
  userAgent?: string;
}

/** Hash of the current waiver document — recorded at signing time so we can prove what was signed. */
export function waiverContentHash(): string {
  return createHash('sha256').update(JSON.stringify(WAIVER_DOCUMENT)).digest('hex');
}

export async function getWaiverRecord(userId: string): Promise<WaiverRecord | null> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: key.waiver(userId) }));
  return (res.Item as WaiverRecord | undefined) ?? null;
}

export async function getWaiverStatus(userId: string): Promise<WaiverStatus> {
  const r = await getWaiverRecord(userId);
  return {
    signed: r !== null,
    signedVersion: r?.version ?? null,
    signedAt: r?.signedAt ?? null,
    fullName: r?.fullName ?? null,
    photoRelease: r?.photoRelease ?? false,
    currentVersion: WAIVER_VERSION,
    upToDate: r !== null && r.version === WAIVER_VERSION,
  };
}

/** True when the user has signed the current waiver version (used to gate bookings). */
export async function hasSignedCurrentWaiver(userId: string): Promise<boolean> {
  return (await getWaiverStatus(userId)).upToDate;
}

export async function signWaiver(
  userId: string,
  input: { fullName: string; photoRelease?: boolean },
  meta: { ip?: string; userAgent?: string },
): Promise<WaiverRecord> {
  const record: WaiverRecord = {
    userId,
    fullName: input.fullName,
    version: WAIVER_VERSION,
    contentHash: waiverContentHash(),
    photoRelease: Boolean(input.photoRelease),
    signedAt: new Date().toISOString(),
    ip: meta.ip,
    userAgent: meta.userAgent,
  };
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: { ...key.waiver(userId), entity: 'WAIVER', ...record },
    }),
  );
  return record;
}
