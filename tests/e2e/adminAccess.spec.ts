import { expect, test, type Page } from '@playwright/test';

/**
 * The admin area is for admins. A customer who registered on the site has a
 * perfectly valid session — and it must open nothing here. The two systems use
 * different cookies, different cryptography and different collections; these
 * tests are what proves it stays that way.
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

const PASSWORD = 'e2e-access-password';
const run = Date.now().toString(36);

/** Every admin page a signed-in customer might try. */
const ADMIN_PAGES = ['/fr/admin', '/fr/admin/tags', '/fr/admin/orders', '/fr/admin/settings', '/fr/admin/customers'];

async function registerCustomer(page: Page, email: string) {
  await page.goto('/en/register');
  await page.getByLabel('Full name').fill('Amine Belkacem');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create my account' }).click();
  await expect(page).toHaveURL(/\/en\/dashboard/, { timeout: 60_000 });
}

test.describe('the admin area is closed to customers', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.',
  );
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  test('a signed-in customer gets the admin login, never admin data', async ({ browser }) => {
    test.setTimeout(180_000);
    const context = await browser.newContext();
    const page = await context.newPage();
    await registerCustomer(page, `e2e-access-${run}@example.dz`);

    for (const path of ADMIN_PAGES) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/fr\/admin\/login$/);
      // The login form, not a page of somebody's data.
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Connexion administrateur');
    }

    // The customer's own session cookie is still there: this is a refusal, not a sign-out.
    const names = (await context.cookies()).map((cookie) => cookie.name);
    expect(names.some((name) => name.includes('session-token'))).toBe(true);
    expect(names).not.toContain('autolink_admin');

    // The APIs answer the same way, with no body to learn anything from.
    const exportResponse = await page.request.get('/api/admin/orders/export');
    expect(exportResponse.status()).toBe(401);
    const batch = await page.request.post('/api/admin/batches', {
      data: { label: 'stolen', quantity: 1 },
      headers: { origin: new URL(page.url()).origin },
    });
    expect(batch.status()).toBe(401);
    expect(await batch.json()).toEqual({ error: 'unauthorized' });

    await context.close();
  });

  test('an admin session does not open a customer dashboard either', async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/en/admin/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL!);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/en\/admin\/(tags|orders)$/, { timeout: 60_000 });

    // Being an admin is not being a customer: no owner session comes with it.
    await page.goto('/en/dashboard');
    await expect(page).toHaveURL(/\/en\/login\?next=/);
    await page.goto('/en/activate');
    await expect(page).toHaveURL(/\/en\/login\?next=/);

    await context.close();
  });
});
