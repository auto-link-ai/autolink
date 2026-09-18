import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // `server-only` throws outside a React Server environment; unit tests run in plain Node.
      { find: /^server-only$/, replacement: fromRoot('./tests/stubs/server-only.ts') },
      { find: /^@\//, replacement: fromRoot('./') },
    ],
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
