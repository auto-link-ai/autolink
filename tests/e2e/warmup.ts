import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type FullConfig } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_STATE, hasAdminCredentials } from './adminSession';

/**
 * Runs once, before any worker starts:
 *
 * 1. `next dev` compiles a route the first time it is asked for, and several
 *    workers starting at once each wait on a different cold compile — some of
 *    those requests come back as errors. Ask for every route once, serially.
 * 2. Sign in as the admin and save the session, so the suite spends one attempt
 *    against the 10-per-hour login limiter instead of a dozen — then use it to
 *    compile the admin pages too.
 */
const ROUTES = [
  '/fr',
  '/ar',
  '/en',
  '/fr/order',
  '/en/order',
  // The order-detail route, which also serves its not-found state.
  '/fr/order/AL-000000',
  '/en/login',
  '/en/register',
  '/en/dashboard',
  '/en/activate',
  '/en/admin/login',
  // An unknown sticker: compiles the scan page and its not-available state.
  '/t/AUT-00000000',
  // Customer pages redirect from inside the page, so this still compiles it.
  '/en/dashboard/car/AUT-00000000',
  '/api/cron/care-reminders',
  '/robots.txt',
  '/sitemap.xml',
  // Linked from every page's <head>: compiled mid-run, they race other pages.
  '/manifest.webmanifest',
  '/apple-icon.png',
];

// Behind the admin session: asked for without it, the middleware answers with a
// redirect and the page itself is never compiled — until mid-run.
const ADMIN_ROUTES = [
  '/en/admin',
  '/en/admin/orders',
  '/en/admin/orders?ref=AL-000000',
  '/en/admin/tags',
  '/en/admin/customers',
  '/en/admin/settings',
];

export default async function warmUp(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3100';

  for (const route of ROUTES) {
    try {
      await fetch(new URL(route, baseURL), { redirect: 'manual' });
    } catch {
      // The suite's own assertions report a server that is not answering.
    }
  }

  if (!hasAdminCredentials) return;

  await mkdir(path.dirname(ADMIN_STATE), { recursive: true });
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  try {
    const page = await browser.newPage({ baseURL });
    await page.goto('/en/admin/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL!);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/en\/admin\/(tags|orders)$/, { timeout: 60_000 });
    await page.context().storageState({ path: ADMIN_STATE });
    for (const route of ADMIN_ROUTES) await page.goto(route);
  } finally {
    await browser.close();
  }
}
