export * from './types.js';

/** Shared constants used by both API and frontend. */
export const PROFILE_PICTURE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** Name of the CSRF guard header that state-changing requests must send. */
export const CSRF_HEADER = 'X-Requested-With';
export const CSRF_HEADER_VALUE = 'fetch';
