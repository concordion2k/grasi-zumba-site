import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import {
  createUser,
  getCredentialByEmail,
  getUserById,
  updateUser,
  updatePassword,
  toPublicUser,
} from '../domain/users.js';
import { createSession, deleteSession, deleteAllSessionsForUser } from '../domain/sessions.js';
import { createPasswordResetToken, consumePasswordResetToken } from '../domain/password-reset.js';
import { getCookie } from 'hono/cookie';
import { setSessionCookie, clearSessionCookie, SESSION_COOKIE } from '../lib/cookies.js';
import { unauthorized, badRequest } from '../lib/errors.js';
import { env } from '../env.js';
import { currentUser } from '../middleware/auth.js';
import { publishSafe } from '../notifications/events.js';

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
    notifyNewClass: input.notifyNewClass,
  });
  const token = await createSession(user.userId);
  setSessionCookie(c, token);
  publishSafe({ type: 'user.registered', user: { email: user.email, name: user.name } });
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

/**
 * Step 1 of password reset: email a tokenised reset link. Responds 200 the same way whether or not
 * the address has an account, so this endpoint can't be used to enumerate registered emails. The
 * email itself is transactional (always sent, regardless of notification prefs).
 */
authRoutes.post('/forgot-password', async (c) => {
  const { email } = forgotPasswordSchema.parse(await c.req.json());
  const cred = await getCredentialByEmail(email);
  if (cred) {
    const user = await getUserById(cred.userId);
    if (user) {
      const token = await createPasswordResetToken(user.userId, user.email);
      const resetUrl = `${env.frontendOrigin}/reset-password?token=${encodeURIComponent(token)}`;
      publishSafe({
        type: 'password.reset',
        to: { email: user.email, name: user.name.split(' ')[0] || user.name },
        resetUrl,
      });
    }
  }
  return c.json({ ok: true });
});

/**
 * Step 2 of password reset: consume the token, set the new password, then revoke every existing
 * session (locks out anyone who knew the old password) and sign the user in on this device.
 */
authRoutes.post('/reset-password', async (c) => {
  const { token, password } = resetPasswordSchema.parse(await c.req.json());
  const consumed = await consumePasswordResetToken(token);
  if (!consumed) {
    throw badRequest(
      'This password reset link is invalid or has expired. Please request a new one.',
    );
  }

  await updatePassword(consumed.email, await hashPassword(password));
  await deleteAllSessionsForUser(consumed.userId);

  const user = await getUserById(consumed.userId);
  if (!user) throw badRequest('This account is no longer available.');

  const sessionToken = await createSession(user.userId);
  setSessionCookie(c, sessionToken);
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
