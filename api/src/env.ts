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
  tableName: required('TABLE_NAME'),
  uploadsBucket: required('UPLOADS_BUCKET'),
  region: optional('AWS_REGION', 'us-east-1'),
  /** Set for local DynamoDB (LocalStack); undefined in production. */
  dynamoEndpoint: process.env.DYNAMODB_ENDPOINT || undefined,
  /** Set for local S3 (LocalStack/MinIO); undefined in production. */
  s3Endpoint: process.env.S3_ENDPOINT || undefined,
  /** Local S3 emulators need path-style addressing (bucket in the path, not the host). */
  s3ForcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'false') === 'true',
  sessionSecret: required('SESSION_SECRET'),
  adminBootstrapEmails: optional('ADMIN_BOOTSTRAP_EMAILS', '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  frontendOrigin: optional('FRONTEND_ORIGIN', 'http://localhost:5173'),
  cookieSecure: optional('COOKIE_SECURE', 'true') === 'true',
};

export type Env = typeof env;
