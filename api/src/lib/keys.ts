/**
 * Single-table key builders. Every entity in the table is addressed by a `pk`/`sk` pair, with a
 * generic `gsi1pk`/`gsi1sk` secondary index for the listing access patterns.
 *
 * Access patterns:
 *   1. User by id           — pk=USER#<id>,      sk=PROFILE
 *   2. Login / email lookup — pk=EMAIL#<email>,  sk=EMAIL        (holds userId + passwordHash)
 *   3. List all users       — GSI1: gsi1pk=USERS, gsi1sk=<createdAt>
 *   4. Class by id          — pk=CLASS#<id>,     sk=METADATA
 *   5. List classes by time — GSI1: gsi1pk=CLASS, gsi1sk=<startTime>
 *   6. A user's bookings    — pk=USER#<id>,      sk begins_with BOOKING#
 *   7. A class's roster     — pk=CLASS#<id>,     sk begins_with BOOKING#
 *   8. Notes for a customer — pk=USER#<id>,      sk begins_with NOTE#
 *   9. Session by token     — pk=SESSION#<hash>, sk=SESSION       (TTL via expiresAt)
 *  10. A user's sessions    — GSI1: gsi1pk=USERSESSIONS#<id>
 */

export const GSI1 = 'gsi1';

export const key = {
  userProfile: (userId: string) => ({ pk: `USER#${userId}`, sk: 'PROFILE' }),
  emailCredential: (email: string) => ({ pk: `EMAIL#${email.toLowerCase()}`, sk: 'EMAIL' }),
  class: (classId: string) => ({ pk: `CLASS#${classId}`, sk: 'METADATA' }),
  userBooking: (userId: string, classId: string) => ({
    pk: `USER#${userId}`,
    sk: `BOOKING#${classId}`,
  }),
  classRosterEntry: (classId: string, userId: string) => ({
    pk: `CLASS#${classId}`,
    sk: `BOOKING#${userId}`,
  }),
  note: (customerId: string, noteId: string) => ({
    pk: `USER#${customerId}`,
    sk: `NOTE#${noteId}`,
  }),
  session: (tokenHash: string) => ({ pk: `SESSION#${tokenHash}`, sk: 'SESSION' }),
  siteSettings: () => ({ pk: 'SETTINGS', sk: 'SITE' }),
  waiver: (userId: string) => ({ pk: `USER#${userId}`, sk: 'WAIVER' }),
  ledgerEntry: (userId: string, createdAt: string, entryId: string) => ({
    pk: `USER#${userId}`,
    sk: `LEDGER#${createdAt}#${entryId}`,
  }),
};

export const gsi1 = {
  allUsers: (createdAt: string) => ({ gsi1pk: 'USERS', gsi1sk: createdAt }),
  allClasses: (startTime: string) => ({ gsi1pk: 'CLASS', gsi1sk: startTime }),
  userSessions: (userId: string, expiresAt: number) => ({
    gsi1pk: `USERSESSIONS#${userId}`,
    gsi1sk: String(expiresAt),
  }),
};

/** SK prefixes for begins_with queries. */
export const prefix = {
  booking: 'BOOKING#',
  note: 'NOTE#',
  ledger: 'LEDGER#',
};
