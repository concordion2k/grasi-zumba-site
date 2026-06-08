import { z } from 'zod';
import { ALLOWED_IMAGE_TYPES } from '@grasi/shared';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .refine((d) => !Number.isNaN(Date.parse(d)), 'Invalid date');

const isoDateTime = z.string().refine((d) => !Number.isNaN(Date.parse(d)), 'Invalid date-time');

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10, 'Use at least 10 characters').max(200),
  birthday: isoDate,
  notifyNewClass: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    birthday: isoDate.optional(),
  })
  .refine((v) => v.name !== undefined || v.birthday !== undefined, {
    message: 'Nothing to update',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(10, 'Use at least 10 characters').max(200),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'New password must be different from the current one',
    path: ['newPassword'],
  });

export const notificationPrefsSchema = z
  .object({
    notifyNewClass: z.boolean().optional(),
    notifyBookingConfirm: z.boolean().optional(),
    notifyClassChange: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Nothing to update',
  });

export const unsubscribeSchema = z.object({
  token: z.string().min(1).max(512),
});

export const signWaiverSchema = z.object({
  fullName: z.string().trim().min(2, 'Please type your full legal name').max(120),
  agreeLiability: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the waiver to continue' }),
  }),
  consentElectronic: z.literal(true, {
    errorMap: () => ({ message: 'You must consent to signing electronically' }),
  }),
  photoRelease: z.boolean().optional(),
});

export const updateSettingsSchema = z
  .object({
    bannerEnabled: z.boolean().optional(),
    bannerMessage: z.string().trim().min(1).max(300).optional(),
  })
  .refine((v) => v.bannerEnabled !== undefined || v.bannerMessage !== undefined, {
    message: 'Nothing to update',
  });

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name').max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  message: z.string().trim().min(1, 'Please enter a message').max(4000),
  // Honeypot: real users never see/fill this; bots often do. Handled in the route.
  company: z.string().max(200).optional(),
});

export const createClassSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(''),
  startTime: isoDateTime,
  durationMinutes: z.number().int().min(10).max(360),
  location: z.string().trim().min(1).max(200),
  capacity: z.number().int().min(1).max(500),
});

export const updateClassSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2000).optional(),
    startTime: isoDateTime.optional(),
    durationMinutes: z.number().int().min(10).max(360).optional(),
    location: z.string().trim().min(1).max(200).optional(),
    capacity: z.number().int().min(1).max(500).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Nothing to update',
  });

export const customerQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createNoteSchema = z.object({
  body: z.string().trim().min(1, 'Note cannot be empty').max(5000),
});

// --- Billing (admin mock actions) ---
export const adjustCreditsSchema = z.object({
  amount: z
    .number()
    .int()
    .refine((n) => n !== 0, 'Enter a non-zero amount'),
  note: z.string().trim().max(200).optional(),
});

export const packagePurchaseSchema = z.object({
  size: z.number().int().positive(),
});

export const setSubscriptionSchema = z.object({
  active: z.boolean(),
});

export const presignUploadSchema = z.object({
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
});

export const confirmUploadSchema = z.object({
  key: z.string().min(1).max(512),
});
