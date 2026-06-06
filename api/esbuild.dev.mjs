// Dev runner: bundle src/local.ts with esbuild and (re)start it on change. We use esbuild rather
// than tsx because it has no Node-version-sensitive loader hooks — it runs on any Node >= 18,
// including older 20.x point releases where tsx's ESM loader hangs.
import { context } from 'esbuild';
import { spawn } from 'node:child_process';

let child;
function restart() {
  if (child) child.kill();
  child = spawn('node', ['--enable-source-maps', 'dist/local.mjs'], { stdio: 'inherit' });
}

const ctx = await context({
  entryPoints: ['src/local.ts'],
  outfile: 'dist/local.mjs',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: true,
  banner: {
    js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);",
  },
  plugins: [
    {
      name: 'restart-on-rebuild',
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length === 0) {
            console.log('🔁 API rebuilt — restarting…');
            restart();
          } else {
            console.error('❌ Build failed; keeping the previous server running.');
          }
        });
      },
    },
  ],
});

await ctx.watch();
console.log('👀 Watching api/src — building…');

const shutdown = () => {
  if (child) child.kill();
  ctx.dispose().finally(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
