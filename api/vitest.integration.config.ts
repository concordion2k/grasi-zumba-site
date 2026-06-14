import { defineConfig } from 'vitest/config';

/**
 * Integration tests: each `*.int.test.ts` runs the real Hono app against an in-memory DynamoDB Local
 * container (started once in global-setup). A single fork runs the files sequentially so they share
 * the one container while each provisions its own table — see src/test-support/integration.ts.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.int.test.ts'],
    globalSetup: ['src/test-support/global-setup.ts'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    // First run pulls the DynamoDB Local image; container + table ops need generous timeouts.
    hookTimeout: 180_000,
    testTimeout: 30_000,
  },
});
