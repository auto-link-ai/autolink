import { defineConfig, devices } from '@playwright/test';

// Dedicated port so e2e runs never collide with a `pnpm dev` you already have open.
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

// Optional: PLAYWRIGHT_CHANNEL=chrome (or msedge) uses the locally installed browser
// instead of Playwright's downloaded Chromium.
const channel = process.env.PLAYWRIGHT_CHANNEL || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  // Compile every route once, serially, before the workers start.
  globalSetup: './tests/e2e/warmup.ts',
  fullyParallel: true,
  // One `next dev` process serves them all: past two workers it thrashes, and
  // navigations start timing out. Two is also faster in wall time than four.
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  // Against `next dev`, the first hit on a route compiles it; with several
  // workers that can take well over the 5s default.
  expect: { timeout: 20_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    // The scan page opens in Arabic unless the person picks a language on it. The
    // specs read it in English, so every browser starts having picked English there
    // (as the page's own switcher would). Tests of the Arabic default start empty.
    storageState: {
      cookies: [
        { name: 'autolink_scan_lang', value: 'en', domain: 'localhost', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' },
      ],
      origins: [],
    },
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
    // Its own build directory: a `pnpm dev` you already have open writes to
    // .next, and two dev servers sharing one build corrupt each other.
    env: { NEXT_DIST_DIR: '.next-e2e' },
  },
});
