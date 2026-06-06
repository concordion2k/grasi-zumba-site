import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { registerSchema, loginSchema } from '../schemas.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import {
  createUser,
  getCredentialByEmail,
  getUserById,
  updateUser,
  toPublicUser,
} from '../domain/users.js';
import { createSession, deleteSession } from '../domain/sessions.js';
import { getCookie } from 'hono/cookie';
import { setSessionCookie, clearSessionCookie, SESSION_COOKIE } from '../lib/cookies.js';
import { unauthorized } from '../lib/errors.js';
import { env } from '../env.js';
import { currentUser } from '../middleware/auth.js';

export const authRoutes = new Hono<AppEnv>();

function roleForEmail(email: string): 'admin' | 'customer' {
  return env.adminBootstrapEmails.includes(email.toLowerCase()) ? 'admin' : 'customer';
}

authRoutes.post('/register', async (c) => {
  const input = registerSchema.parse(await c.req.json());
  const passwordHash = await hashPassword(input.password);
  const user = await createUser({
    name: input.name,
    email: input.email,
    passwordHash,
    birthday: input.birthday,
    role: roleForEmail(input.email),
  });
  const token = await createSession(user.userId);
  setSessionCookie(c, token);
  return c.json({ user: await toPublicUser(user) }, 201);
});

authRoutes.post('/login', async (c) => {
  const input = loginSchema.parse(await c.req.json());
  const credential = await getCredentialByEmail(input.email);

  // Always run a verification to keep timing roughly constant whether or not the email exists.
  const hashToCheck =
    credential?.passwordHash ?? 'scrypt$32768$8$1$00000000000000000000000000000000$00';
  const ok = await verifyPassword(input.password, hashToCheck);

  if (!credential || !ok) {
    throw unauthorized('Invalid email or password');
  }

  let user = await getUserById(credential.userId);
  if (!user) throw unauthorized('Invalid email or password');

  // Honour admin bootstrap list on login, in case it changed after signup.
  if (env.adminBootstrapEmails.includes(user.email) && user.role !== 'admin') {
    user = (await updateUser(user.userId, { role: 'admin' })) ?? user;
  }

  const token = await createSession(user.userId);
  setSessionCookie(c, token);
  return c.json({ user: await toPublicUser(user) });
});

authRoutes.post('/logout', async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await deleteSession(token);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

authRoutes.get('/me', async (c) => {
  const user = currentUser(c);
  return c.json({ user: await toPublicUser(user) });
});
