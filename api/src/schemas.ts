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

export const updateSettingsSchema = z
  .object({
    bannerEnabled: z.boolean().optional(),
    bannerMessage: z.string().trim().min(1).max(300).optional(),
  })
  .refine((v) => v.bannerEnabled !== undefined || v.bannerMessage !== undefined, {
    message: 'Nothing to update',
  });

export const createClassSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(''),
  startTime: isoDateTime,
  durationMinutes: z.number().int().min(10).max(360),
  location: z.string().trim().min(1).max(200),
  capacity: z.number().int().min(1).max(500),
});

export const createNoteSchema = z.object({
  body: z.string().trim().min(1, 'Note cannot be empty').max(5000),
});

export const presignUploadSchema = z.object({
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
});

export const confirmUploadSchema = z.object({
  key: z.string().min(1).max(512),
});
