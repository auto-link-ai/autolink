import { expect, test, type BrowserContext } from '@playwright/test';
import { hasAdminCredentials } from './adminSession';
import { createOwner, freshClient } from './owner';

/**
 * Owners stay signed in: the sign-in lasts as long as a browser keeps a cookie
 * (400 days) and every day's first visit renews it. In the installed app, the
 * sign-in page says signing in happens once.
 */

const DAY = 86_400;
const HINT = 'In the app, sign in once: you will stay signed in.';
/** Where the browser notes the day it last renewed the sign-in (lib/auth/renewal.ts). */
const RENEWED_ON = 'autolink:signin-renewed-on';

test('in the installed app, the sign-in page says it happens once', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  await page.goto('/en/login');
  await expect(page.getByText(HINT)).toBeVisible();
});

test('in a browser tab, that line is not there', async ({ page }) => {
  await page.goto('/en/login');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText(HINT)).toHaveCount(0);
});

async function sessionCookie(context: BrowserContext) {
  const cookie = (await context.cookies()).find((c) => c.name.endsWith('authjs.session-token'));
  expect(cookie, 'signed in').toBeTruthy();
  return cookie!;
}

test.describe('staying signed in', () => {
  test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.');
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  test('a sign-in lasts about 400 days, and the next day’s first visit renews it', async ({ browser }) => {
    test.setTimeout(180_000);
    const context = await freshClient(browser);
    const page = await context.newPage();
    await createOwner(page, { firstName: 'Lina' });
    // The dashboard renews the sign-in on its first visit of the day: let that finish first.
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), RENEWED_ON)).not.toBeNull();

    const first = await sessionCookie(context);
    const daysLeft = (first.expires - Date.now() / 1000) / DAY;
    expect(daysLeft).toBeGreaterThan(399);
    expect(daysLeft).toBeLessThan(400.1);

    // The next day: the last renewal is from before, so the first page renews the sign-in.
    await page.evaluate((key) => localStorage.setItem(key, '2000-01-01'), RENEWED_ON);
    await page.waitForTimeout(2_000);
    const renewed = page.waitForResponse((response) => response.url().endsWith('/api/auth/session'));
    await page.goto('/en/dashboard');
    expect((await renewed).ok()).toBe(true);
    const second = await sessionCookie(context);
    expect(second.expires).toBeGreaterThan(first.expires);
    await context.close();
  });
});
