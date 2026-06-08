import { Hono } from 'hono';
import { WAIVER_DOCUMENT } from '@grasi/shared';
import type { AppEnv } from '../types.js';
import { requireAuth, currentUser } from '../middleware/auth.js';
import { signWaiverSchema } from '../schemas.js';
import { getWaiverStatus, getWaiverRecord, signWaiver } from '../domain/waiver.js';
import { buildWaiverPdf } from '../lib/waiver-pdf.js';
import { publishSafe } from '../notifications/events.js';
import { notFound } from '../lib/errors.js';

function pdfResponse(bytes: Uint8Array, filename: string): Response {
  return new Response(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  });
}

/** Public waiver endpoints: the document text/version and a blank downloadable PDF. */
export const waiverPublicRoutes = new Hono<AppEnv>();

waiverPublicRoutes.get('/', (c) => c.json({ document: WAIVER_DOCUMENT }));

waiverPublicRoutes.get('/pdf', async () => {
  const bytes = await buildWaiverPdf();
  return pdfResponse(bytes, 'zumba-by-grasiele-waiver.pdf');
});

/** Authenticated waiver endpoints (mounted under /me/waiver): status, sign, and signed copy. */
export const waiverMeRoutes = new Hono<AppEnv>();
waiverMeRoutes.use('*', requireAuth);

waiverMeRoutes.get('/', async (c) => {
  const user = currentUser(c);
  return c.json({ status: await getWaiverStatus(user.userId) });
});

waiverMeRoutes.post('/', async (c) => {
  const user = currentUser(c);
  const input = signWaiverSchema.parse(await c.req.json());
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
  const userAgent = c.req.header('user-agent');
  const record = await signWaiver(
    user.userId,
    { fullName: input.fullName, photoRelease: input.photoRelease },
    { ip, userAgent },
  );
  // Confirmation email (fire-and-forget) with a link to the signed copy.
  publishSafe({
    type: 'waiver.signed',
    to: { email: user.email, name: user.name.split(' ')[0] || user.name },
    signedAt: record.signedAt,
    version: record.version,
  });
  return c.json({ status: await getWaiverStatus(user.userId) }, 201);
});

waiverMeRoutes.get('/pdf', async (c) => {
  const user = currentUser(c);
  const record = await getWaiverRecord(user.userId);
  if (!record) throw notFound('You have not signed the waiver yet');
  const bytes = await buildWaiverPdf({
    fullName: record.fullName,
    signedAt: record.signedAt,
    version: record.version,
    photoRelease: record.photoRelease,
    ip: record.ip,
  });
  return pdfResponse(bytes, 'my-signed-waiver.pdf');
});
