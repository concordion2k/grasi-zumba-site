import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { env } from '../env.js';

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Optional Reply-To (e.g. the sender of a contact-form inquiry). */
  replyTo?: string;
}

let ses: SESv2Client | undefined;

/**
 * Send one email. With EMAIL_MODE=ses it goes through Amazon SES; otherwise (local dev) it's just
 * logged, so the rest of the flow works without real email infrastructure.
 */
export async function sendEmail(msg: OutgoingEmail): Promise<void> {
  if (env.emailMode !== 'ses') {
    console.log(
      `[email:log] to=${msg.to} replyTo=${msg.replyTo ?? '-'} subject=${JSON.stringify(msg.subject)}\n${msg.text}`,
    );
    return;
  }
  ses ??= new SESv2Client({ region: env.region });
  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: env.emailFrom,
      Destination: { ToAddresses: [msg.to] },
      ReplyToAddresses: msg.replyTo ? [msg.replyTo] : undefined,
      Content: {
        Simple: {
          Subject: { Data: msg.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: msg.html, Charset: 'UTF-8' },
            Text: { Data: msg.text, Charset: 'UTF-8' },
          },
        },
      },
    }),
  );
}
