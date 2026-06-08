import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { env } from '../env.js';
import { handleEvent } from './handler.js';

/** Domain events that result in email. Carry enough data that the worker rarely needs extra reads. */
export type EmailEvent =
  | { type: 'user.registered'; user: { email: string; name: string } }
  | { type: 'contact.inquiry'; name: string; email: string; message: string };

let sqs: SQSClient | undefined;

/**
 * Publish a domain event. In deployed environments this enqueues to SQS (the mailer Lambda handles
 * it); locally (no EMAIL_QUEUE_URL) it runs inline so the flow still works end-to-end.
 */
export async function publish(event: EmailEvent): Promise<void> {
  if (env.emailQueueUrl) {
    sqs ??= new SQSClient({ region: env.region });
    await sqs.send(
      new SendMessageCommand({ QueueUrl: env.emailQueueUrl, MessageBody: JSON.stringify(event) }),
    );
  } else {
    await handleEvent(event);
  }
}

/** Fire-and-forget: never let an email failure break the originating request. */
export function publishSafe(event: EmailEvent): void {
  void publish(event).catch((err) => console.error('[events] publish failed', event.type, err));
}
