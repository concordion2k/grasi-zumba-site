import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import type { CrmCustomer, BookingWithClass } from '@grasi/shared';
import { requireAdmin, currentUser } from '../middleware/auth.js';
import {
  createClassSchema,
  updateClassSchema,
  createNoteSchema,
  updateSettingsSchema,
  customerQuerySchema,
} from '../schemas.js';
import { listUsers, getUserById, toPublicUser } from '../domain/users.js';
import {
  createClass,
  updateClass,
  cancelClass,
  toZumbaClass,
  getClass,
  type ClassRecord,
} from '../domain/classes.js';
import { countUserBookings, listUserBookings, listRoster } from '../domain/bookings.js';
import { createNote, listNotes, countNotes, deleteNote } from '../domain/notes.js';
import { updateSettings } from '../domain/settings.js';
import { getWaiverStatus, getWaiverRecord } from '../domain/waiver.js';
import { buildWaiverPdf } from '../lib/waiver-pdf.js';
import { notFound } from '../lib/errors.js';
import { formatClassTime } from '../lib/datetime.js';
import {
  dispatchNewClass,
  dispatchClassChanged,
  dispatchClassCanceled,
} from '../notifications/dispatch.js';
import type { FieldChange } from '../notifications/events.js';

/** Build the human-readable diff used in "your class changed" emails (only the fields a booked
 *  attendee cares about: what it's called, when, and where). */
function describeChanges(before: ClassRecord, after: ClassRecord): FieldChange[] {
  const changes: FieldChange[] = [];
  if (before.title !== after.title) {
    changes.push({ label: 'Class', from: before.title, to: after.title });
  }
  if (before.startTime !== after.startTime || before.endTime !== after.endTime) {
    changes.push({
      label: 'Date & time',
      from: formatClassTime(before.startTime, before.endTime),
      to: formatClassTime(after.startTime, after.endTime),
    });
  }
  if (before.location !== after.location) {
    changes.push({ label: 'Location', from: before.location, to: after.location });
  }
  return changes;
}

/** Admin-only CRM + scheduling. Mounted under /admin. */
export const adminRoutes = new Hono<AppEnv>();
adminRoutes.use('*', requireAdmin);

// --- Site settings ----------------------------------------------------------

adminRoutes.patch('/settings', async (c) => {
  const patch = updateSettingsSchema.parse(await c.req.json());
  const settings = await updateSettings(patch);
  return c.json({ settings });
});

// --- CRM: customers ---------------------------------------------------------

adminRoutes.get('/customers', async (c) => {
  const { search, page, pageSize } = customerQuerySchema.parse(c.req.query());

  // listUsers returns the full set (newest-first). Filter by name/email, then paginate, and only
  // do the per-customer booking/note counts for the page being shown — not the whole list.
  const all = await listUsers();
  const term = search?.toLowerCase();
  const filtered = term
    ? all.filter((u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
    : all;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageUsers = filtered.slice(start, start + pageSize);

  const customers: CrmCustomer[] = await Promise.all(
    pageUsers.map(async (u) => ({
      ...(await toPublicUser(u)),
      bookingCount: await countUserBookings(u.userId),
      noteCount: await countNotes(u.userId),
    })),
  );
  return c.json({ customers, total, page: currentPage, pageSize, totalPages });
});

adminRoutes.get('/customers/:userId', async (c) => {
  const userId = c.req.param('userId');
  const user = await getUserById(userId);
  if (!user) throw notFound('Customer not found');

  const [notes, bookingRefs, waiver] = await Promise.all([
    listNotes(userId),
    listUserBookings(userId),
    getWaiverStatus(userId),
  ]);

  const bookings: BookingWithClass[] = [];
  for (const b of bookingRefs) {
    const cls = await getClass(b.classId);
    if (cls) {
      bookings.push({
        booking: { userId, classId: b.classId, bookedAt: b.bookedAt },
        class: toZumbaClass(cls),
      });
    }
  }
  bookings.sort((a, b) => b.class.startTime.localeCompare(a.class.startTime));

  return c.json({ user: await toPublicUser(user), notes, bookings, waiver });
});

/** Download a customer's signed waiver PDF (admin record-keeping). */
adminRoutes.get('/customers/:userId/waiver/pdf', async (c) => {
  const userId = c.req.param('userId');
  const record = await getWaiverRecord(userId);
  if (!record) throw notFound('This customer has not signed the waiver');
  const bytes = await buildWaiverPdf({
    fullName: record.fullName,
    signedAt: record.signedAt,
    version: record.version,
    photoRelease: record.photoRelease,
    ip: record.ip,
  });
  return new Response(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="waiver-${userId}.pdf"`,
    },
  });
});

// --- CRM: notes -------------------------------------------------------------

adminRoutes.post('/customers/:userId/notes', async (c) => {
  const admin = currentUser(c);
  const userId = c.req.param('userId');
  const customer = await getUserById(userId);
  if (!customer) throw notFound('Customer not found');
  const { body } = createNoteSchema.parse(await c.req.json());
  const note = await createNote(userId, { userId: admin.userId, name: admin.name }, body);
  return c.json({ note }, 201);
});

adminRoutes.delete('/customers/:userId/notes/:noteId', async (c) => {
  await deleteNote(c.req.param('userId'), c.req.param('noteId'));
  return c.json({ ok: true });
});

// --- Signups review ---------------------------------------------------------

adminRoutes.get('/signups', async (c) => {
  const users = await listUsers(); // already newest-first
  const signups = await Promise.all(users.map((u) => toPublicUser(u)));
  return c.json({ signups });
});

// --- Scheduling -------------------------------------------------------------

adminRoutes.post('/classes', async (c) => {
  const admin = currentUser(c);
  const input = createClassSchema.parse(await c.req.json());
  const created = await createClass(input, admin.userId);
  // Announce to opted-in users (fire-and-forget).
  void dispatchNewClass(created).catch((err) => console.error('[notify] new class failed', err));
  return c.json({ class: toZumbaClass(created) }, 201);
});

adminRoutes.patch('/classes/:classId', async (c) => {
  const classId = c.req.param('classId');
  const patch = updateClassSchema.parse(await c.req.json());
  const { before, after } = await updateClass(classId, patch);
  // Notify booked attendees about meaningful changes (time/title/location).
  const changes = describeChanges(before, after);
  if (changes.length > 0) {
    const roster = await listRoster(classId);
    void dispatchClassChanged(
      after,
      changes,
      roster.map((r) => r.userId),
    ).catch((err) => console.error('[notify] class changed failed', err));
  }
  return c.json({ class: toZumbaClass(after) });
});

adminRoutes.delete('/classes/:classId', async (c) => {
  const classId = c.req.param('classId');
  const cls = await getClass(classId);
  if (!cls) throw notFound('Class not found');
  // Capture the roster before deletion so we can both clean up bookings and notify attendees.
  const roster = await listRoster(classId);
  const userIds = roster.map((r) => r.userId);
  await cancelClass(classId, userIds);
  void dispatchClassCanceled(toZumbaClass(cls), userIds).catch((err) =>
    console.error('[notify] class canceled failed', err),
  );
  return c.json({ ok: true });
});

adminRoutes.get('/classes/:classId/roster', async (c) => {
  const classId = c.req.param('classId');
  const cls = await getClass(classId);
  if (!cls) throw notFound('Class not found');
  const roster = await listRoster(classId);
  return c.json({ class: toZumbaClass(cls), roster });
});
