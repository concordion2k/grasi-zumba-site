import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

// Component/store tests run in jsdom. Specs live next to nothing in particular — *.spec.ts anywhere
// under src. (Vite's `@` alias is mirrored here so imports resolve the same as in the app.)
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // happy-dom (not jsdom): pure JS, no ESM-require chains that break on Node 20, and faster.
    environment: 'happy-dom',
    include: ['src/**/*.spec.ts'],
  },
});
