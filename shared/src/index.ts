export * from './types.js';

/** Shared constants used by both API and frontend. */
export const PROFILE_PICTURE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** Name of the CSRF guard header that state-changing requests must send. */
export const CSRF_HEADER = 'X-Requested-With';
export const CSRF_HEADER_VALUE = 'fetch';

/** Default announcement-banner copy (shown until the business goes live). */
export const DEFAULT_BANNER_MESSAGE =
  'Our business is not live yet, so please be patient! In the meantime, please take a look at what we plan to offer!';

// ---------------------------------------------------------------------------
// Pricing & billing (mock — amounts in cents, single source of truth)
// ---------------------------------------------------------------------------

/** Single drop-in class (used when a customer has no pack/subscription). */
export const DROP_IN_PRICE_CENTS = 1500;

/** Class packs: bulk credits at a discount. Valid for PACKAGE_EXPIRY_DAYS from purchase. */
export const CLASS_PACKAGES = [
  { size: 5, priceCents: 7000 },
  { size: 10, priceCents: 13000 },
  { size: 20, priceCents: 24000 },
] as const;
export type ClassPackageSize = (typeof CLASS_PACKAGES)[number]['size'];

/** Monthly unlimited subscription. */
export const SUBSCRIPTION_PRICE_CENTS = 19900;

/** How long a purchased pack's credits stay valid (display/mock; not enforced on the balance yet). */
export const PACKAGE_EXPIRY_DAYS = 180;

/** Format cents as USD, e.g. 1500 → "$15.00". */
export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Compose a one-line display address from structured parts, e.g.
 *  "1229 Payne Stewart Dr, Apt 4, Davenport, FL 33896". */
export function composeAddress(a: {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
}): string {
  const cityLine = [a.city, [a.state, a.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [a.street1?.trim(), a.street2?.trim(), cityLine].filter(Boolean).join(', ');
}

// ---------------------------------------------------------------------------
// Liability waiver
// ---------------------------------------------------------------------------

/**
 * Bump this whenever the waiver text below changes — users who signed an older version are asked to
 * re-sign, and bookings are gated on having signed the *current* version. Date-stamped for clarity.
 */
export const WAIVER_VERSION = '2026-06-08';

/**
 * The waiver document, shared by the API (public text + PDF generation) and the frontend (display),
 * so there is a single source of truth for what was presented and signed.
 *
 * NOTE: This is placeholder copy tailored for a Florida-based dance-fitness business. It MUST be
 * reviewed by a licensed attorney before the business goes live — see WAIVER_DOCUMENT.notice.
 */
export const WAIVER_DOCUMENT = {
  version: WAIVER_VERSION,
  title: 'Liability Waiver & Release — Zumba by Grasiele',
  /** Shown prominently at the very top (per request: this is a WIP draft for testing only). */
  notice:
    '⚠️ WORK IN PROGRESS — FOR TESTING ONLY. This waiver is a draft still under development and is NOT yet legally finalized or attorney-reviewed. Please do not treat it as a binding legal document at this time; it is provided for testing purposes only.',
  intro:
    'Please read this Liability Waiver and Release ("Agreement") carefully before participating in any class, session, or activity offered by Zumba by Grasiele, a sole proprietorship owned and operated by Grasiele de Souza ("the Instructor"). By signing below, you acknowledge that you have read, understand, and agree to all of its terms.',
  sections: [
    {
      heading: '1. Assumption of Risk',
      body: 'I understand that Zumba® and dance-fitness classes are physically strenuous activities involving vigorous movement, and that participation carries inherent risks — including but not limited to muscle strains, sprains, falls, cardiovascular events, and other physical injury. I knowingly and voluntarily assume all such risks, both known and unknown.',
    },
    {
      heading: '2. Representation of Physical Fitness',
      body: 'I represent that I am in good physical health and know of no medical condition that would prevent my safe participation. I understand I have been advised to consult a physician before beginning any exercise program, and I assume full responsibility for my decision to participate.',
    },
    {
      heading: '3. Release and Waiver of Liability',
      body: 'In consideration of being permitted to participate, I — on behalf of myself and my heirs, assigns, and legal representatives — hereby release, waive, and discharge Zumba by Grasiele and its owner, Grasiele de Souza, from any and all liability, claims, or demands for any injury, loss, or damage arising out of or related to my participation, including any claim based on the ordinary negligence of the Instructor, to the fullest extent permitted by Florida law.',
    },
    {
      heading: '4. Indemnification',
      body: 'I agree to indemnify and hold harmless the Instructor from any claims, including reasonable attorneys’ fees, brought by me or on my behalf arising out of my participation.',
    },
    {
      heading: '5. Voluntary Participation',
      body: 'I acknowledge that my participation is entirely voluntary and that I am free to stop, rest, or decline any activity at any time.',
    },
  ],
  photoReleaseText:
    'I grant Zumba by Grasiele permission to photograph or record me during classes and to use those images or recordings for promotional purposes. (Optional — leave this unchecked to opt out.)',
  electronicConsentText:
    "I consent to sign this Agreement electronically, and I agree that my typed full legal name and submission constitute my legal signature under the federal ESIGN Act and Florida's Uniform Electronic Transactions Act.",
} as const;
