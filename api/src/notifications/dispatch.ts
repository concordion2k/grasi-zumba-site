/**
 * Turns domain actions into notification events: figures out *who* should be emailed (honouring each
 * user's preferences) and publishes per-recipient events. Routes call these fire-and-forget so a
 * notification problem never breaks the underlying action.
 */
import { listUsers, getUsersByIds, resolvePrefs, type UserRecord } from '../domain/users.js';
import type { ClassRecord } from '../domain/classes.js';
import { makeUnsubscribeToken } from '../lib/tokens.js';
import { publishSafe, publishManySafe } from './events.js';
import type { ClassSummary, FieldChange, EmailRecipient, EmailEvent } from './events.js';

function toSummary(cls: ClassRecord | ClassSummary): ClassSummary {
  return {
    classId: cls.classId,
    title: cls.title,
    startTime: cls.startTime,
    endTime: cls.endTime,
    location: cls.location,
  };
}

function toRecipient(user: UserRecord): EmailRecipient {
  return {
    email: user.email,
    name: user.name.split(' ')[0] || user.name,
    unsubToken: makeUnsubscribeToken(user.userId),
  };
}

/** Confirmation to the booker (if they want booking emails). */
export function dispatchBookingConfirmed(user: UserRecord, cls: ClassRecord): void {
  if (!resolvePrefs(user).notifyBookingConfirm) return;
  publishSafe({ type: 'booking.created', to: toRecipient(user), class: toSummary(cls) });
}

/** Announce a brand-new class to everyone opted in to new-class emails. */
export async function dispatchNewClass(cls: ClassRecord): Promise<void> {
  const users = await listUsers();
  const summary = toSummary(cls);
  const events: EmailEvent[] = users
    .filter((u) => resolvePrefs(u).notifyNewClass)
    .map((u) => ({ type: 'class.created', to: toRecipient(u), class: summary }));
  publishManySafe(events);
}

/** Notify booked users (who want change emails) that their class was updated. */
export async function dispatchClassChanged(
  cls: ClassRecord,
  changes: FieldChange[],
  bookedUserIds: string[],
): Promise<void> {
  if (changes.length === 0 || bookedUserIds.length === 0) return;
  const users = await getUsersByIds(bookedUserIds);
  const summary = toSummary(cls);
  const events: EmailEvent[] = users
    .filter((u) => resolvePrefs(u).notifyClassChange)
    .map((u) => ({ type: 'class.changed', to: toRecipient(u), class: summary, changes }));
  publishManySafe(events);
}

/** Notify booked users (who want change emails) that their class was canceled. Pass a captured
 *  summary + userIds, since the class/bookings are deleted by the time this runs. */
export async function dispatchClassCanceled(
  cls: ClassSummary,
  bookedUserIds: string[],
): Promise<void> {
  if (bookedUserIds.length === 0) return;
  const users = await getUsersByIds(bookedUserIds);
  const summary = toSummary(cls);
  const events: EmailEvent[] = users
    .filter((u) => resolvePrefs(u).notifyClassChange)
    .map((u) => ({ type: 'class.canceled', to: toRecipient(u), class: summary }));
  publishManySafe(events);
}
