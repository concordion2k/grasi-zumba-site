import { vi, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  DynamoDBClient,
  CreateTableCommand,
  UpdateTimeToLiveCommand,
} from '@aws-sdk/client-dynamodb';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '@grasi/shared';
import type { Hono } from 'hono';

const REGION = 'us-east-1';
const CREDS = { accessKeyId: 'test', secretAccessKey: 'test' };

function dynamoClient(): DynamoDBClient {
  return new DynamoDBClient({
    region: REGION,
    endpoint: inject('dynamoEndpoint'),
    credentials: CREDS,
  });
}

/** Create a uniquely-named table that mirrors the production schema (pk/sk + gsi1 + TTL). */
async function createTestTable(): Promise<string> {
  const name = `grasi-test-${randomUUID()}`;
  const client = dynamoClient();
  await client.send(
    new CreateTableCommand({
      TableName: name,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'pk', AttributeType: 'S' },
        { AttributeName: 'sk', AttributeType: 'S' },
        { AttributeName: 'gsi1pk', AttributeType: 'S' },
        { AttributeName: 'gsi1sk', AttributeType: 'S' },
      ],
      KeySchema: [
        { AttributeName: 'pk', KeyType: 'HASH' },
        { AttributeName: 'sk', KeyType: 'RANGE' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'gsi1',
          KeySchema: [
            { AttributeName: 'gsi1pk', KeyType: 'HASH' },
            { AttributeName: 'gsi1sk', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
      ],
    }),
  );
  // TTL on `expiresAt` (sessions/reset tokens). Best-effort: DynamoDB Local accepts but doesn't sweep.
  try {
    await client.send(
      new UpdateTimeToLiveCommand({
        TableName: name,
        TimeToLiveSpecification: { Enabled: true, AttributeName: 'expiresAt' },
      }),
    );
  } catch {
    /* ignore */
  }
  client.destroy();
  return name;
}

/**
 * Build a fresh app bound to its own table. Env is set BEFORE the app graph is (re)imported so the
 * module-level Dynamo client + TABLE bind to this table; `vi.resetModules()` guarantees a clean
 * module graph per call, which is what keeps each route's suite isolated from the others.
 */
export async function buildTestApp(): Promise<Hono> {
  process.env.DYNAMODB_ENDPOINT = inject('dynamoEndpoint');
  process.env.AWS_REGION = REGION;
  process.env.AWS_ACCESS_KEY_ID = CREDS.accessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = CREDS.secretAccessKey;
  process.env.TABLE_NAME = await createTestTable();
  process.env.SESSION_SECRET = 'integration-test-secret';
  process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
  process.env.COOKIE_SECURE = 'false';
  process.env.ADMIN_BOOTSTRAP_EMAILS = 'admin@example.com';
  process.env.UPLOADS_BUCKET = 'test-uploads';
  process.env.EMAIL_MODE = 'log';

  vi.resetModules();
  const { createApp } = await import('../app.js');
  return createApp() as unknown as Hono;
}

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

interface ReqOpts {
  body?: unknown;
  /** `name=value` cookie pair from a prior auth response. */
  cookie?: string;
  headers?: Record<string, string>;
}

/** Issue a request to the Hono app, wiring up JSON, the CSRF header, same-origin, and cookies. */
export async function apiRequest(
  app: Hono,
  method: string,
  path: string,
  opts: ReqOpts = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    Origin: 'http://localhost:5173',
    ...(opts.headers ?? {}),
  };
  if (!SAFE.has(method)) headers[CSRF_HEADER] = CSRF_HEADER_VALUE;
  if (opts.cookie) headers.Cookie = opts.cookie;
  const init: RequestInit = { method, headers };
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(opts.body);
  }
  return app.request(path, init);
}

/** Parse a JSON response body as a known shape (the app's responses are unknown to the type system). */
export async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

// Response shapes used by the integration suites.
export interface UserBody {
  user: { userId: string; email: string; role: string };
}
export interface ClassBody {
  class: {
    classId: string;
    title: string;
    capacity: number;
    bookedCount: number;
    bookedByMe: boolean;
  };
}
export interface ClassListBody {
  classes: { classId: string }[];
}
export interface BillingBody {
  summary: { classesRemaining: number; subscription: unknown };
  purchases: unknown[];
}
export interface ErrorBody {
  error: string;
  details?: { code?: string };
}
export interface HealthBody {
  status: string;
}
export interface SettingsBody {
  settings: unknown;
}

/** The session cookie (`name=value`) set by an auth response, ready to pass back as `cookie`. */
export function sessionCookie(res: Response): string {
  const setCookie = res.headers.get('set-cookie');
  return setCookie ? (setCookie.split(';')[0] ?? '') : '';
}

interface RegisterOverrides {
  email?: string;
  name?: string;
  password?: string;
}

/** Register a fresh user and return the response + email + session cookie. */
export async function registerUser(
  app: Hono,
  overrides: RegisterOverrides = {},
): Promise<{ res: Response; email: string; cookie: string }> {
  const email = overrides.email ?? `user-${randomUUID()}@example.com`;
  const res = await apiRequest(app, 'POST', '/api/auth/register', {
    body: {
      name: overrides.name ?? 'Test Dancer',
      email,
      password: overrides.password ?? 'password1234',
      birthday: '1990-05-01',
      acceptedTerms: true,
    },
  });
  return { res, email, cookie: sessionCookie(res) };
}
