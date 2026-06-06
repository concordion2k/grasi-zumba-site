import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import type { CrmCustomer, BookingWithClass } from '@grasi/shared';
import { requireAdmin, currentUser } from '../middleware/auth.js';
import { createClassSchema, createNoteSchema } from '../schemas.js';
import { listUsers, getUserById, toPublicUser } from '../domain/users.js';
import { createClass, toZumbaClass, getClass } from '../domain/classes.js';
import { countUserBookings, listUserBookings, listRoster } from '../domain/bookings.js';
import { createNote, listNotes, countNotes, deleteNote } from '../domain/notes.js';
import { notFound } from '../lib/errors.js';

/** Admin-only CRM + scheduling. Mounted under /admin. */
export const adminRoutes = new Hono<AppEnv>();
adminRoutes.use('*', requireAdmin);

// --- CRM: customers ---------------------------------------------------------

adminRoutes.get('/customers', async (c) => {
  const users = await listUsers();
  const customers: CrmCustomer[] = await Promise.all(
    users.map(async (u) => ({
      ...(await toPublicUser(u)),
      bookingCount: await countUserBookings(u.userId),
      noteCount: await countNotes(u.userId),
    })),
  );
  return c.json({ customers });
});

adminRoutes.get('/customers/:userId', async (c) => {
  const userId = c.req.param('userId');
  const user = await getUserById(userId);
  if (!user) throw notFound('Customer not found');

  const [notes, bookingRefs] = await Promise.all([listNotes(userId), listUserBookings(userId)]);

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

  return c.json({ user: await toPublicUser(user), notes, bookings });
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
  return c.json({ class: toZumbaClass(created) }, 201);
});

adminRoutes.get('/classes/:classId/roster', async (c) => {
  const classId = c.req.param('classId');
  const cls = await getClass(classId);
  if (!cls) throw notFound('Class not found');
  const roster = await listRoster(classId);
  return c.json({ class: toZumbaClass(cls), roster });
});
