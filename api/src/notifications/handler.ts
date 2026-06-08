import type { EmailEvent } from './events.js';
import { env } from '../env.js';
import { sendEmail } from '../lib/email.js';
import { welcomeEmail, contactInquiryEmail } from './templates.js';

/** Resolve a domain event into the email(s) to send. Shared by the SQS worker and the local
 * inline path, so behavior is identical in dev and prod. */
export async function handleEvent(event: EmailEvent): Promise<void> {
  switch (event.type) {
    case 'user.registered': {
      const msg = welcomeEmail(event.user.name);
      await sendEmail({ ...msg, to: event.user.email });
      break;
    }
    case 'contact.inquiry': {
      const msg = contactInquiryEmail(event);
      await sendEmail({ ...msg, to: env.contactTo });
      break;
    }
    default: {
      // Exhaustiveness guard — a new event type without a handler is a compile error.
      const _never: never = event;
      throw new Error(`Unhandled email event: ${JSON.stringify(_never)}`);
    }
  }
}
