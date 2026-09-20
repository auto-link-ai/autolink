/**
 * pnpm build:check
 *
 * A production build for verification only, written to `.next-build`.
 *
 * `pnpm build` writes to `.next`, which is also where `pnpm dev` keeps its
 * chunks: running one while the other is open leaves a half-production,
 * half-development directory, and the dev server then fails on a missing
 * vendor chunk. This keeps the two apart. Deployment still uses `pnpm build`.
 */
import { spawn } from 'node:child_process';

const child = spawn('next', ['build'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NEXT_DIST_DIR: '.next-build' },
});

child.on('exit', (code) => process.exit(code ?? 1));
