import type { EmailEvent } from './events.js';
import { sendEmail } from '../lib/email.js';
import { welcomeEmail } from './templates.js';

/** Resolve a domain event into the email(s) to send. Shared by the SQS worker and the local
 * inline path, so behavior is identical in dev and prod. */
export async function handleEvent(event: EmailEvent): Promise<void> {
  switch (event.type) {
    case 'user.registered': {
      const msg = welcomeEmail(event.user.name);
      await sendEmail({ ...msg, to: event.user.email });
      break;
    }
    default: {
      // Exhaustiveness guard — a new event type without a handler is a compile error.
      const _never: never = event.type;
      throw new Error(`Unhandled email event: ${String(_never)}`);
    }
  }
}
