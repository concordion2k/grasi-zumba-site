/**
 * Domain types shared between the API and the frontend.
 *
 * These describe the *wire* shapes (what the API returns / accepts). Persistence-only fields
 * (e.g. password hashes, DynamoDB keys) never appear here — they live in the API package.
 */

export type UserRole = 'customer' | 'admin';

/** A user as exposed to clients. Never includes credentials. */
export interface PublicUser {
  userId: string;
  email: string;
  name: string;
  /** ISO date, `YYYY-MM-DD`. */
  birthday: string;
  role: UserRole;
  /** Presigned GET URL for the profile picture, when one is set. */
  profilePictureUrl: string | null;
  /** ISO timestamp. */
  createdAt: string;
}

/** A scheduled Zumba class (a bookable slot on the calendar). */
export interface ZumbaClass {
  classId: string;
  title: string;
  description: string;
  /** ISO timestamp for when the class starts. */
  startTime: string;
  /** ISO timestamp for when the class ends. */
  endTime: string;
  location: string;
  capacity: number;
  /** How many spots are currently taken. */
  bookedCount: number;
  /** userId of the admin who created the slot. */
  createdBy: string;
  createdAt: string;
}

/** A class with a flag indicating whether the current user has booked it. */
export interface ZumbaClassWithBookingState extends ZumbaClass {
  bookedByMe: boolean;
  spotsRemaining: number;
}

export interface Booking {
  userId: string;
  classId: string;
  /** ISO timestamp. */
  bookedAt: string;
}

/** A user's booking joined with the class it refers to. */
export interface BookingWithClass {
  booking: Booking;
  class: ZumbaClass;
}

/** A roster entry shown to admins: who booked a class. */
export interface RosterEntry {
  userId: string;
  name: string;
  email: string;
  bookedAt: string;
}

/** A free-text note an admin keeps about a customer (CRM). */
export interface CrmNote {
  noteId: string;
  /** userId of the customer the note is about. */
  customerId: string;
  /** userId of the admin who wrote it. */
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

/** A customer summary row for the admin CRM list. */
export interface CrmCustomer extends PublicUser {
  bookingCount: number;
  noteCount: number;
}

// ---------------------------------------------------------------------------
// Request / response DTOs
// ---------------------------------------------------------------------------

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  /** ISO date, `YYYY-MM-DD`. */
  birthday: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: PublicUser;
}

export interface UpdateProfileRequest {
  name?: string;
  birthday?: string;
}

export interface CreateClassRequest {
  title: string;
  description: string;
  startTime: string;
  durationMinutes: number;
  location: string;
  capacity: number;
}

export interface CreateNoteRequest {
  body: string;
}

export interface PresignUploadRequest {
  /** MIME type of the image being uploaded. */
  contentType: string;
}

export interface PresignUploadResponse {
  /** URL to PUT the file to. */
  uploadUrl: string;
  /** S3 object key the client should report back once the upload succeeds. */
  key: string;
}

export interface ConfirmUploadRequest {
  key: string;
}

/** Standard error envelope returned by the API. */
export interface ApiError {
  error: string;
  details?: unknown;
}
