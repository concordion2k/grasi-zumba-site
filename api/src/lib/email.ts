import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { randomBytes } from 'node:crypto';
import { env } from '../env.js';

export interface EmailAttachment {
  filename: string;
  /** UTF-8 text content of the attachment. */
  content: string;
  /** MIME type, e.g. 'text/calendar; charset=UTF-8; method=PUBLISH'. */
  contentType: string;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Optional Reply-To (e.g. the sender of a contact-form inquiry). */
  replyTo?: string;
  /** File attachments (e.g. a calendar invite). Sent via raw MIME. */
  attachments?: EmailAttachment[];
}

let ses: SESv2Client | undefined;
function client(): SESv2Client {
  return (ses ??= new SESv2Client({ region: env.region }));
}

/** base64-encode UTF-8 text, wrapped at 76 chars per RFC 2045. */
function b64(s: string): string {
  return (
    Buffer.from(s, 'utf-8')
      .toString('base64')
      .match(/.{1,76}/g) ?? []
  ).join('\r\n');
}

/** MIME encoded-word for a (possibly non-ASCII, e.g. emoji) subject. */
function encodeSubject(s: string): string {
  return `=?UTF-8?B?${Buffer.from(s, 'utf-8').toString('base64')}?=`;
}

/** Build a multipart/mixed MIME message: a text+html alternative body plus any attachments. */
function buildRawMime(msg: OutgoingEmail): Uint8Array {
  const mixed = `mixed-${randomBytes(12).toString('hex')}`;
  const alt = `alt-${randomBytes(12).toString('hex')}`;
  const lines: string[] = [
    `From: ${env.emailFrom}`,
    `To: ${msg.to}`,
    ...(msg.replyTo ? [`Reply-To: ${msg.replyTo}`] : []),
    `Subject: ${encodeSubject(msg.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${mixed}"`,
    '',
    `--${mixed}`,
    `Content-Type: multipart/alternative; boundary="${alt}"`,
    '',
    `--${alt}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    b64(msg.text),
    `--${alt}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    b64(msg.html),
    `--${alt}--`,
  ];
  for (const att of msg.attachments ?? []) {
    lines.push(
      `--${mixed}`,
      `Content-Type: ${att.contentType}; name="${att.filename}"`,
      `Content-Disposition: attachment; filename="${att.filename}"`,
      'Content-Transfer-Encoding: base64',
      '',
      b64(att.content),
    );
  }
  lines.push(`--${mixed}--`, '');
  return new TextEncoder().encode(lines.join('\r\n'));
}

/**
 * Send one email. With EMAIL_MODE=ses it goes through Amazon SES; otherwise (local dev) it's just
 * logged, so the rest of the flow works without real email infrastructure. Emails with attachments
 * are sent as raw MIME (so e.g. a calendar invite arrives as a real attachment, not a subscription).
 */
export async function sendEmail(msg: OutgoingEmail): Promise<void> {
  if (env.emailMode !== 'ses') {
    const att = msg.attachments?.length ? ` (+${msg.attachments.length} attachment)` : '';
    console.log(
      `[email:log] to=${msg.to} replyTo=${msg.replyTo ?? '-'} subject=${JSON.stringify(msg.subject)}${att}\n${msg.text}`,
    );
    return;
  }

  if (msg.attachments?.length) {
    await client().send(
      new SendEmailCommand({
        FromEmailAddress: env.emailFrom,
        Destination: { ToAddresses: [msg.to] },
        ReplyToAddresses: msg.replyTo ? [msg.replyTo] : undefined,
        Content: { Raw: { Data: buildRawMime(msg) } },
      }),
    );
    return;
  }

  await client().send(
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
