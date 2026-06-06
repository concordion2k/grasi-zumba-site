import { randomUUID } from 'node:crypto';

/** Generate a new opaque entity id. */
export function newId(): string {
  return randomUUID();
}
