import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Integration tests (*.int.test.ts) need Docker/DynamoDB Local — run them via
    // `npm run test:integration` (vitest.integration.config.ts), not the fast unit run.
    exclude: [...configDefaults.exclude, 'src/**/*.int.test.ts'],
  },
});
