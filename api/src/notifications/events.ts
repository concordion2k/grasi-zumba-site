import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { env } from '../env.js';
import { handleEvent } from './handler.js';

/** A single notification recipient. The unsubscribe token is precomputed so the worker needs no
 *  secret-key access — it just builds the link. */
export interface EmailRecipient {
  email: string;
  name: string;
  unsubToken: string;
}

/** The slice of a class carried in notification events (enough to render the email). */
export interface ClassSummary {
  classId: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
}

/** One human-readable field change, for "your class was updated" emails. */
export interface FieldChange {
  label: string;
  from: string;
  to: string;
}

/** Domain events that result in email. Carry enough data that the worker rarely needs extra reads.
 *  Class notifications are per-recipient so each email retries / dead-letters independently. */
export type EmailEvent =
  | { type: 'user.registered'; user: { email: string; name: string } }
  | { type: 'contact.inquiry'; name: string; email: string; message: string }
  | { type: 'booking.created'; to: EmailRecipient; class: ClassSummary }
  | { type: 'class.created'; to: EmailRecipient; class: ClassSummary }
  | { type: 'class.changed'; to: EmailRecipient; class: ClassSummary; changes: FieldChange[] }
  | { type: 'class.canceled'; to: EmailRecipient; class: ClassSummary }
  | {
      type: 'waiver.signed';
      to: { email: string; name: string };
      signedAt: string;
      version: string;
    };

let sqs: SQSClient | undefined;
function client(): SQSClient {
  return (sqs ??= new SQSClient({ region: env.region }));
}

/**
 * Publish a domain event. In deployed environments this enqueues to SQS (the mailer Lambda handles
 * it); locally (no EMAIL_QUEUE_URL) it runs inline so the flow still works end-to-end.
 */
export async function publish(event: EmailEvent): Promise<void> {
  if (env.emailQueueUrl) {
    await client().send(
      new SendMessageCommand({ QueueUrl: env.emailQueueUrl, MessageBody: JSON.stringify(event) }),
    );
  } else {
    await handleEvent(event);
  }
}

/** Publish many events efficiently (SQS SendMessageBatch, 10 at a time); inline locally. */
export async function publishMany(events: EmailEvent[]): Promise<void> {
  if (events.length === 0) return;
  if (!env.emailQueueUrl) {
    for (const event of events) await handleEvent(event);
    return;
  }
  for (let i = 0; i < events.length; i += 10) {
    const chunk = events.slice(i, i + 10);
    await client().send(
      new SendMessageBatchCommand({
        QueueUrl: env.emailQueueUrl,
        Entries: chunk.map((event, j) => ({
          Id: String(i + j),
          MessageBody: JSON.stringify(event),
        })),
      }),
    );
  }
}

/** Fire-and-forget: never let an email failure break the originating request. */
export function publishSafe(event: EmailEvent): void {
  void publish(event).catch((err) => console.error('[events] publish failed', event.type, err));
}

/** Fire-and-forget batch variant. */
export function publishManySafe(events: EmailEvent[]): void {
  void publishMany(events).catch((err) => console.error('[events] publishMany failed', err));
}
