import { defineConfig, devices } from '@playwright/test';

// Dedicated port so e2e runs never collide with a `pnpm dev` you already have open.
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

// Optional: PLAYWRIGHT_CHANNEL=chrome (or msedge) uses the locally installed browser
// instead of Playwright's downloaded Chromium.
const channel = process.env.PLAYWRIGHT_CHANNEL || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  // Against `next dev`, the first hit on a route compiles it; with several
  // workers that can take well over the 5s default.
  expect: { timeout: 20_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], channel } },
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], channel } },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: `${baseURL}/fr`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
