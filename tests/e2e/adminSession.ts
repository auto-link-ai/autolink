import path from 'node:path';
import type { Browser, BrowserContext, BrowserContextOptions } from '@playwright/test';

/**
 * One admin sign-in per run, saved by the global setup and replayed here.
 *
 * The admin login limiter allows 10 attempts an hour per address, and a full
 * suite legitimately signs in more often than that — so it used to fail on the
 * throttle message instead of what it was testing. Specs that exercise signing
 * in itself still do it for real; everything else reuses this session.
 */
export const ADMIN_STATE = path.join('tests', 'e2e', '.auth', 'admin.json');

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
export const hasAdminCredentials = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);

/** A context already signed in as the admin. */
export function adminContext(browser: Browser, options: BrowserContextOptions = {}): Promise<BrowserContext> {
  return browser.newContext({ ...options, storageState: ADMIN_STATE });
}
