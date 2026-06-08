/** Centralised, validated access to environment configuration. */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  // Lazy (getters): only validated when actually read, so an entrypoint that doesn't use a given
  // var (e.g. the mailer worker doesn't need UPLOADS_BUCKET) won't crash on import.
  get tableName() {
    return required('TABLE_NAME');
  },
  get uploadsBucket() {
    return required('UPLOADS_BUCKET');
  },
  get sessionSecret() {
    return required('SESSION_SECRET');
  },
  region: optional('AWS_REGION', 'us-east-1'),
  /** Set for local DynamoDB (LocalStack); undefined in production. */
  dynamoEndpoint: process.env.DYNAMODB_ENDPOINT || undefined,
  /** Set for local S3 (LocalStack/MinIO); undefined in production. */
  s3Endpoint: process.env.S3_ENDPOINT || undefined,
  /** Local S3 emulators need path-style addressing (bucket in the path, not the host). */
  s3ForcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'false') === 'true',
  adminBootstrapEmails: optional('ADMIN_BOOTSTRAP_EMAILS', '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  frontendOrigin: optional('FRONTEND_ORIGIN', 'http://localhost:5173'),
  cookieSecure: optional('COOKIE_SECURE', 'true') === 'true',

  // Email/notifications.
  /** 'ses' actually sends via SES; 'log' just prints (default for local dev). */
  emailMode: optional('EMAIL_MODE', 'log'),
  emailFrom: optional('EMAIL_FROM', 'Zumba by Grasiele <grasi@zumbabygrasiele.com>'),
  /** Where contact-form inquiries are delivered. */
  contactTo: optional('CONTACT_TO', 'grasi@zumbabygrasiele.com'),
  /** When set, domain events are published to SQS; when unset (local), they run inline. */
  emailQueueUrl: process.env.EMAIL_QUEUE_URL || undefined,
};

export type Env = typeof env;
