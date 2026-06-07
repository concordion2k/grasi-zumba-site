import { build } from 'esbuild';

/**
 * Bundles the two Lambda handlers into `dist/` as ESM:
 *   - index.mjs  → the API (handler: index.handler)
 *   - worker.mjs → the SQS mailer (handler: worker.handler)
 *
 * We bundle everything (including the AWS SDK) for deterministic deploys — no reliance on whatever
 * SDK minor version the Lambda runtime happens to ship. The `require` shim banner lets the few
 * CJS-only transitive deps work inside an ESM bundle.
 */
await build({
  entryPoints: ['src/index.ts', 'src/worker.ts'],
  outdir: 'dist',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: true,
  minify: true,
  treeShaking: true,
  banner: {
    js: "import { createRequire as __createRequire } from 'module'; const require = __createRequire(import.meta.url);",
  },
  logLevel: 'info',
});

console.log('✅ API bundled → dist/index.mjs (index.handler) + dist/worker.mjs (worker.handler)');
