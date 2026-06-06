import type { UserRecord } from './domain/users.js';

/** Hono environment: context variables available to handlers after middleware runs. */
export interface AppEnv {
  Variables: {
    /** The authenticated user, set by `loadUser`. Undefined for anonymous requests. */
    user?: UserRecord;
  };
}
