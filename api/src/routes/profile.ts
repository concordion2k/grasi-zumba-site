import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { requireAuth, currentUser } from '../middleware/auth.js';
import {
  updateProfileSchema,
  presignUploadSchema,
  confirmUploadSchema,
  changePasswordSchema,
} from '../schemas.js';
import {
  updateUser,
  getUserById,
  toPublicUser,
  getCredentialByEmail,
  updatePassword,
} from '../domain/users.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { deleteAllSessionsForUser, createSession } from '../domain/sessions.js';
import { setSessionCookie } from '../lib/cookies.js';
import { presignUpload } from '../lib/s3.js';
import { newId } from '../lib/ids.js';
import { badRequest } from '../lib/errors.js';

/** Profile management for the current user. Mounted under /me. */
export const profileRoutes = new Hono<AppEnv>();
profileRoutes.use('*', requireAuth);

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

profileRoutes.patch('/', async (c) => {
  const user = currentUser(c);
  const patch = updateProfileSchema.parse(await c.req.json());
  const updated = await updateUser(user.userId, patch);
  return c.json({ user: await toPublicUser(updated ?? user) });
});

/** Change the current user's password (requires the current password). */
profileRoutes.post('/password', async (c) => {
  const user = currentUser(c);
  const { currentPassword, newPassword } = changePasswordSchema.parse(await c.req.json());

  const cred = await getCredentialByEmail(user.email);
  if (!cred || !(await verifyPassword(currentPassword, cred.passwordHash))) {
    throw badRequest('Current password is incorrect');
  }

  await updatePassword(user.email, await hashPassword(newPassword));

  // Security: revoke every session (logs out other devices), then re-establish this one so the
  // user stays signed in here.
  await deleteAllSessionsForUser(user.userId);
  const token = await createSession(user.userId);
  setSessionCookie(c, token);

  return c.json({ ok: true });
});

/** Step 1: get a presigned URL to upload a new avatar straight to S3. */
profileRoutes.post('/avatar/presign', async (c) => {
  const user = currentUser(c);
  const { contentType } = presignUploadSchema.parse(await c.req.json());
  const ext = EXT[contentType];
  const key = `avatars/${user.userId}/${newId()}.${ext}`;
  const uploadUrl = await presignUpload(key, contentType);
  return c.json({ uploadUrl, key });
});

/** Step 2: after a successful upload, record the new avatar key on the profile. */
profileRoutes.post('/avatar/confirm', async (c) => {
  const user = currentUser(c);
  const { key } = confirmUploadSchema.parse(await c.req.json());
  // Defense: the key must live under the caller's own prefix.
  if (!key.startsWith(`avatars/${user.userId}/`)) {
    throw badRequest('Invalid upload key');
  }
  const ext = key.split('.').pop() ?? '';
  if (!Object.values(EXT).includes(ext)) {
    throw badRequest('Unsupported file type');
  }
  const updated = await updateUser(user.userId, { profilePictureKey: key });
  return c.json({ user: await toPublicUser(updated ?? (await getUserById(user.userId))!) });
});
