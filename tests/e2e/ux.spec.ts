import { expect, test, type Browser } from '@playwright/test';
import { hasAdminCredentials } from './adminSession';

/**
 * The friction fixes, checked where people meet them.
 *
 * Contexts here present their own client address: the sign-in limiter counts
 * per address, and the rest of the suite already spends most of its hour from
 * 127.0.0.1. Real customers never share one, so this is the honest setup.
 */
const run = Date.now().toString(36);
const CLAIM = '/en/activate?t=AUT-7K3M9QXZ&c=ABCD-EFGH-JK';

let address = 0;
function freshClient(browser: Browser) {
  address++;
  return browser.newContext({ extraHTTPHeaders: { 'x-forwarded-for': `203.0.113.${(Date.now() + address) % 250}` } });
}

// ---- Public pages: no database writes -------------------------------------------------

test('a password can be shown and hidden again', async ({ page }) => {
  await page.goto('/en/login');
  const field = page.getByLabel('Password');
  await field.fill('a-long-password');
  await expect(field).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show' }).click();
  await expect(field).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide' }).click();
  await expect(field).toHaveAttribute('type', 'password');
});

test('sign-in says what to do about a forgotten password', async ({ page }) => {
  await page.goto('/en/login');
  await expect(page.getByText('Forgot your password?')).toBeVisible();
  await page.getByRole('link', { name: 'Write to us and we will reset it.' }).click();
  await expect(page).toHaveURL(/\/en\/contact$/);
});

test('arriving from a claim link, sign-in offers to create the account first', async ({ page }) => {
  await page.goto(`/en/login?next=${encodeURIComponent(CLAIM)}`);
  await expect(page.getByText('You are about to link your sticker')).toBeVisible();
  await expect(page.getByText('AUT-7K3M9QXZ')).toBeVisible();
  const create = page.getByRole('link', { name: 'Create my account' });
  await expect(create).toHaveAttribute('href', `/en/register?next=${encodeURIComponent(CLAIM)}`);
});

test('an ordinary sign-in shows no claim panel', async ({ page }) => {
  await page.goto('/en/login');
  await expect(page.getByText('You are about to link your sticker')).toHaveCount(0);
});

// ---- With a disposable database -------------------------------------------------------

test.describe('first-time customers and their accounts', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.');
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  test('from the claim QR to the activation form, without retyping anything', async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await freshClient(browser);
    const page = await context.newPage();

    await page.goto(`/en/login?next=${encodeURIComponent(CLAIM)}`);
    await page.getByRole('link', { name: 'Create my account' }).click();
    await expect(page.getByText('Next, we link this sticker to your account')).toBeVisible();

    await page.getByLabel('Full name').fill('Yasmine Haddad');
    await page.getByLabel('Email').fill(`e2e-ux-claim-${run}@example.dz`);
    await page.getByLabel('Password').fill('e2e-ux-password-1');
    await page.getByRole('button', { name: 'Create my account' }).click();

    await expect(page).toHaveURL(/\/en\/activate\?t=AUT-7K3M9QXZ&c=ABCD-EFGH-JK/, { timeout: 60_000 });
    await expect(page.getByLabel('Sticker id')).toHaveValue('AUT-7K3M9QXZ');
    await expect(page.getByLabel('Activation code')).toHaveValue('ABCD-EFGH-JK');
    await context.close();
  });

  test('changing the password: the new one works and the old one no longer does', async ({ browser }) => {
    test.setTimeout(180_000);
    const email = `e2e-ux-pw-${run}@example.dz`;
    const context = await freshClient(browser);
    const page = await context.newPage();

    await page.goto('/en/register');
    await page.getByLabel('Full name').fill('Amine Belkacem');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('the-first-password');
    await page.getByRole('button', { name: 'Create my account' }).click();
    await expect(page).toHaveURL(/\/en\/dashboard/, { timeout: 60_000 });

    // A fresh load: the redirect after registering is still rendering when the
    // URL changes, and a click in that window is lost to the next render.
    await page.goto('/en/dashboard');
    await page.locator('summary', { hasText: 'Change my password' }).click();
    await expect(page.getByLabel('Current password')).toBeVisible();
    // A wrong current password is refused on the field, and changes nothing.
    await page.getByLabel('Current password').fill('not-the-password');
    await page.getByLabel('New password').fill('the-second-password');
    await page.getByRole('button', { name: 'Save the new password' }).click();
    await expect(page.getByText('That is not your current password.')).toBeVisible();

    await page.getByLabel('Current password').fill('the-first-password');
    await page.getByLabel('New password').fill('the-second-password');
    await page.getByRole('button', { name: 'Save the new password' }).click();
    await expect(page.getByText('Password changed.')).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/en$/);
    await page.goto('/en/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('the-first-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('form p[role="alert"]')).toHaveText('Wrong email or password.');
    // A wrong password costs a retype of the password, not of the whole form.
    await expect(page.getByLabel('Email')).toHaveValue(email);

    await page.getByLabel('Password').fill('the-second-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/en\/dashboard/, { timeout: 60_000 });
    await context.close();
  });
});
