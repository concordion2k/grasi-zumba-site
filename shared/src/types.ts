/**
 * Domain types shared between the API and the frontend.
 *
 * These describe the *wire* shapes (what the API returns / accepts). Persistence-only fields
 * (e.g. password hashes, DynamoDB keys) never appear here — they live in the API package.
 */

export type UserRole = 'customer' | 'admin';

/**
 * Which email notifications a user wants. Defaults (applied for any user who predates this feature):
 *   - notifyNewClass: false (opt-in — promotional)
 *   - notifyBookingConfirm: true
 *   - notifyClassChange: true
 */
export interface NotificationPrefs {
  /** A brand-new class has been added to the calendar. */
  notifyNewClass: boolean;
  /** Confirmation when the user books a class. */
  notifyBookingConfirm: boolean;
  /** A class the user is booked into was changed or canceled. */
  notifyClassChange: boolean;
}

/** A user as exposed to clients. Never includes credentials. */
export interface PublicUser extends NotificationPrefs {
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
  /** Composed one-line display address (derived from the structured fields below). */
  location: string;
  /** Structured address parts. Optional only because classes created before this feature lack them. */
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;
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

/** A page of CRM customers, with metadata for the pagination controls. */
export interface PaginatedCustomers {
  customers: CrmCustomer[];
  /** Total customers matching the current search (across all pages). */
  total: number;
  /** 1-based current page. */
  page: number;
  pageSize: number;
  totalPages: number;
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
  /** Opt in to "new class announced" emails at signup (defaults to false). */
  notifyNewClass?: boolean;
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

/** Patch the current user's email-notification preferences (at least one field required). */
export type UpdateNotificationPrefsRequest = Partial<NotificationPrefs>;

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Request a password-reset email (sent only if the address has an account). */
export interface ForgotPasswordRequest {
  email: string;
}

/** Complete a password reset using the tokenised link from the email. */
export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ContactRequest {
  name: string;
  email: string;
  message: string;
  /** Honeypot — must be empty; real users never see this field. */
  company?: string;
}

export interface CreateClassRequest {
  title: string;
  description: string;
  startTime: string;
  durationMinutes: number;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  capacity: number;
}

/** Edit an existing class (all fields optional; at least one required). */
export interface UpdateClassRequest {
  title?: string;
  description?: string;
  startTime?: string;
  durationMinutes?: number;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;
  capacity?: number;
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

/** Site-wide settings controllable by admins (e.g. the announcement banner). */
export interface SiteSettings {
  bannerEnabled: boolean;
  bannerMessage: string;
}

export interface UpdateSettingsRequest {
  bannerEnabled?: boolean;
  bannerMessage?: string;
}

// ---------------------------------------------------------------------------
// Billing & entitlements (mock; Stripe-ready)
// ---------------------------------------------------------------------------

export type LedgerEntryType =
  | 'manual_credit' // admin granted credits
  | 'package_purchase' // bought a class pack (credits + payment)
  | 'dropin_payment' // paid for a single drop-in class (payment, no credit change)
  | 'subscription' // subscription started/charged
  | 'adjustment' // admin removed/corrected credits
  | 'class_booking'; // a credit spent on a booking (-1), or refunded on cancel (+1)

/** One append-only billing event. The ledger is the customer's purchase/credit history. */
export interface LedgerEntry {
  entryId: string;
  /** ISO timestamp. */
  createdAt: string;
  type: LedgerEntryType;
  /** Change to the class-credit balance (+/-, or 0 for money-only entries like a drop-in). */
  creditDelta: number;
  /** Money amount in cents (mock). 0 for non-payment entries like a manual credit. */
  amountCents: number;
  note: string;
  /** Who recorded it — an admin's name now; 'stripe' once real payments land. */
  by: string;
  provider: 'mock' | 'stripe';
  /** Stripe object id (checkout session / invoice) for entries created from a real payment. */
  providerRef?: string;
}

export interface SubscriptionStatus {
  active: boolean;
  plan: 'unlimited';
  /** ISO timestamp. */
  startedAt: string;
  /** ISO timestamp the mock subscription renews/expires. */
  renewsAt: string;
  provider: 'mock' | 'stripe';
}

/** A customer's billing position at a glance. */
export interface BillingSummary {
  /** Remaining class credits. */
  classCredits: number;
  subscription: SubscriptionStatus | null;
  /** Lifetime mock spend (sum of ledger amounts), in cents. */
  totalPaidCents: number;
  /** True when the customer can't cover a class from credits or a subscription → drop-in applies. */
  needsDropIn: boolean;
}

/** Everything the admin customer dashboard renders, in one payload. */
export interface CustomerOverview {
  user: PublicUser;
  notes: CrmNote[];
  bookings: BookingWithClass[];
  waiver: WaiverStatus;
  billing: BillingSummary;
  ledger: LedgerEntry[];
}

/** The customer's own billing view: credits, usage, and payment history. */
export interface MyBillingSummary {
  /** Lifetime class credits acquired (purchased packs + any granted). */
  classesPurchased: number;
  /** Classes remaining = credits on file minus classes booked (0 floor). Subscribers don't draw down. */
  classesRemaining: number;
  /** How many classes the customer has booked (what "remaining" is based on). */
  classesBooked: number;
  subscription: SubscriptionStatus | null;
}

export interface MyBillingResponse {
  summary: MyBillingSummary;
  /** The customer's payment history (drop-ins, pack purchases, subscription charges). */
  purchases: LedgerEntry[];
}

/** Purchasable items (mapped to Stripe Prices on the server). */
export type CheckoutItem = 'pack_5' | 'pack_10' | 'pack_20' | 'dropin' | 'subscription';

export interface CheckoutRequest {
  item: CheckoutItem;
}
export interface CheckoutResponse {
  /** Stripe Checkout URL to redirect the customer to. */
  url: string;
}
export interface BillingPortalResponse {
  /** Stripe Billing Customer Portal URL to redirect the customer to. */
  url: string;
}

/** Admin billing actions. */
export interface AdjustCreditsRequest {
  /** Positive to grant, negative to remove. */
  amount: number;
  note?: string;
}
export interface PackagePurchaseRequest {
  size: number;
}
export interface SetSubscriptionRequest {
  active: boolean;
}

// ---------------------------------------------------------------------------
// Liability waiver
// ---------------------------------------------------------------------------

/** The current user's waiver-signing status. */
export interface WaiverStatus {
  /** Whether the user has ever signed any version. */
  signed: boolean;
  /** Version they signed (null if never). */
  signedVersion: string | null;
  /** ISO timestamp of their signature (null if never). */
  signedAt: string | null;
  /** The legal name they signed with (null if never). */
  fullName: string | null;
  /** Whether they granted the optional photo/media release. */
  photoRelease: boolean;
  /** The current waiver version on file. */
  currentVersion: string;
  /** True only when signed AND signedVersion === currentVersion. Bookings require this. */
  upToDate: boolean;
}

export interface SignWaiverRequest {
  /** Typed full legal name — serves as the electronic signature. */
  fullName: string;
  /** Must be true: agreement to the liability release. */
  agreeLiability: boolean;
  /** Must be true: consent to sign electronically (ESIGN/UETA). */
  consentElectronic: boolean;
  /** Optional photo/media release opt-in. */
  photoRelease?: boolean;
}

export interface UnsubscribeRequest {
  token: string;
}

export interface UnsubscribeResponse {
  ok: true;
  /** First name of the unsubscribed user, for a friendly confirmation. */
  name: string;
}

/** Standard error envelope returned by the API. */
export interface ApiError {
  error: string;
  details?: unknown;
}
