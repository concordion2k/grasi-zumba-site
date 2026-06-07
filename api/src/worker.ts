import type { SQSHandler, SQSBatchResponse } from 'aws-lambda';
import { handleEvent } from './notifications/handler.js';
import type { EmailEvent } from './notifications/events.js';

/**
 * SQS-triggered mailer Lambda. Processes email events; failed messages are reported back so SQS
 * retries just those (partial-batch failure) and eventually routes them to the DLQ.
 * Lambda handler reference: `worker.handler`.
 */
export const handler: SQSHandler = async (event): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];
  for (const record of event.Records) {
    try {
      await handleEvent(JSON.parse(record.body) as EmailEvent);
    } catch (err) {
      console.error('[mailer] failed to process message', record.messageId, err);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
};
