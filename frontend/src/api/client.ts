import { CSRF_HEADER, CSRF_HEADER_VALUE, type ApiError } from '@grasi/shared';

/** Thrown for any non-2xx API response. */
export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** When false, a 401 resolves to `null` instead of throwing (used for "who am I?"). */
  throwOnUnauthorized?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, throwOnUnauthorized = true } = options;

  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: {
      [CSRF_HEADER]: CSRF_HEADER_VALUE,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401 && !throwOnUnauthorized) {
    return null as T;
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = data as ApiError | null;
    throw new ApiRequestError(
      res.status,
      err?.error ?? `Request failed (${res.status})`,
      err?.details,
    );
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};

/** Upload a file straight to S3 with a presigned PUT URL (no credentials/CSRF — it's S3). */
export async function uploadToS3(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) throw new ApiRequestError(res.status, 'Upload failed');
}
