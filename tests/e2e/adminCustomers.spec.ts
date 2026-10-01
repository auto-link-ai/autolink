import { readFile } from 'node:fs/promises';
import { expect, test, type Browser, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { adminContext, hasAdminCredentials } from './adminSession';
import { linkSticker } from './linkSticker';

/**
 * The admin side of a customer account: find them, see what they own, and the
 * two support actions that matter — block and reset the password.
 */

const PASSWORD = 'e2e-customer-password';
const run = Date.now().toString(36);
const CUSTOMER = `e2e-customer-${run}@example.dz`;
/** Made by hand by the admin, for a customer who called. */
const BY_PHONE = `e2e-by-phone-${run}@example.dz`;
/** CUSTOMER's email after the admin fixes a typo. */
const RENAMED = `e2e-renamed-${run}@example.dz`;
/** The customer's current password: the reset test replaces it. */
let password = PASSWORD;

let address = 0;
/** Each sign-in from its own address: the sign-in limiter counts per address. */
async function signIn(browser: Browser, email: string, secret: string) {
  address++;
  const shop = await browser.newContext({ extraHTTPHeaders: { 'x-forwarded-for': `192.0.2.${(Date.now() + address) % 250}` } });
  const page = await shop.newPage();
  await page.goto('/en/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(secret);
  await page.getByRole('button', { name: 'Sign in' }).click();
  return { shop, page };
}

async function openCustomer(page: Page, email: string) {
  await page.goto('/en/admin/customers');
  await page.getByLabel('Search').fill(email);
  await page.getByRole('button', { name: 'Search' }).click();
  // The newest customer is already on the unfiltered list: wait for the search,
  // or the click lands on a page that is about to be replaced.
  await expect(page).toHaveURL(/[?&]q=/);
  await page.getByRole('link', { name: email }).click();
  await expect(page).toHaveURL(/id=USR-[0-9A-HJKMNP-TV-Z]{8}/);
}

test.describe('an admin looking after a customer', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.');
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  let tag = { id: '' };

  test('the overview counts what exists', async ({ browser }) => {
    test.setTimeout(180_000);
    const office = await adminContext(browser);
    const page = await office.newPage();

    // A tag to hand out, so the rest of this file has something to activate.
    await page.goto('/en/admin/tags');
    await page.getByLabel('Batch name').fill('E2E customers');
    await page.getByLabel('Quantity').fill('1');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Generate and download' }).click();
    const zip = await JSZip.loadAsync(await readFile((await (await download).path())!));
    const [id] = (await zip.file('tags.csv')!.async('string')).split('\r\n')[1]!.split(',');
    tag = { id: id! };
    expect(tag.id).toMatch(/^AUT-[0-9A-HJKMNP-TV-Z]{8}$/);

    await page.goto('/en/admin');
    await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();
    // The batch just generated is counted as unassigned.
    const unassigned = page.getByRole('link', { name: /Unassigned tags/ });
    await expect(unassigned).toContainText('Printed, not claimed yet.');
    await expect(page.getByRole('link', { name: /Customer accounts/ })).toBeVisible();
    await office.close();
  });

  test('a new customer shows up with their sticker and car', async ({ browser }) => {
    test.setTimeout(180_000);
    const shop = await browser.newContext();
    const customer = await shop.newPage();

    await customer.goto('/en/register');
    await customer.getByLabel('Full name').fill('Amine Belkacem');
    await customer.getByLabel('Email').fill(CUSTOMER);
    await customer.getByLabel('Phone (optional)').fill('0551 23 45 67');
    await customer.getByLabel('Password').fill(PASSWORD);
    await customer.getByRole('button', { name: 'Create my account' }).click();
    await expect(customer).toHaveURL(/\/en\/dashboard/, { timeout: 60_000 });

    await linkSticker(customer, tag.id, { make: 'Peugeot', model: '208', colour: 'Blue' });
    await shop.close();

    const office = await adminContext(browser);
    const admin = await office.newPage();
    await openCustomer(admin, CUSTOMER);

    // Scoped to the detail panel: the list row underneath shows the same values.
    const detail = admin.getByRole('region', { name: 'Amine Belkacem' });
    await expect(detail.getByText('0551234567')).toBeVisible();
    await expect(detail.getByText('Stickers (1)')).toBeVisible();
    await expect(detail.getByText(tag.id)).toBeVisible();
    await expect(detail.getByText('Peugeot 208 · Blue')).toBeVisible();
    await office.close();
  });

  test('blocking shuts the customer out, unblocking lets them back in', async ({ browser }) => {
    test.setTimeout(240_000);
    const office = await adminContext(browser);
    const admin = await office.newPage();
    await openCustomer(admin, CUSTOMER);

    // It asks first: blocking locks the customer out on their next request.
    await admin.locator('summary', { hasText: 'Block account' }).click();
    await expect(admin.getByText(`${CUSTOMER} will not be able to sign in`)).toBeVisible();
    await admin.getByRole('button', { name: 'Yes, block this account' }).click();
    await expect(admin.getByRole('status')).toHaveText('Change saved.');
    await expect(admin.getByRole('button', { name: 'Unblock' })).toBeVisible();

    // The blocked customer cannot sign in, and is told nothing about why.
    const shop = await browser.newContext();
    const customer = await shop.newPage();
    await customer.goto('/en/login');
    await customer.getByLabel('Email').fill(CUSTOMER);
    await customer.getByLabel('Password').fill(PASSWORD);
    await customer.getByRole('button', { name: 'Sign in' }).click();
    await expect(customer.locator('form p[role="alert"]')).toHaveText('Wrong email or password.');
    await customer.goto('/en/dashboard');
    await expect(customer).toHaveURL(/\/en\/login\?next=/);

    await admin.getByRole('button', { name: 'Unblock' }).click();
    await expect(admin.getByRole('status')).toHaveText('Change saved.');

    await customer.goto('/en/login');
    await customer.getByLabel('Email').fill(CUSTOMER);
    await customer.getByLabel('Password').fill(PASSWORD);
    await customer.getByRole('button', { name: 'Sign in' }).click();
    await expect(customer).toHaveURL(/\/en\/dashboard/, { timeout: 60_000 });
    await expect(customer.getByRole('heading', { name: 'Peugeot 208' })).toBeVisible();

    await shop.close();
    await office.close();
  });

  test('a reset password is shown once, and it works', async ({ browser }) => {
    test.setTimeout(240_000);
    const office = await adminContext(browser);
    const admin = await office.newPage();
    await openCustomer(admin, CUSTOMER);

    await admin.getByRole('button', { name: 'Reset password' }).click();
    const notice = admin.getByRole('status').filter({ hasText: 'New password:' });
    await expect(notice).toBeVisible();
    const fresh = (await notice.locator('code').innerText()).trim();
    expect(fresh).toMatch(/^[0-9A-HJKMNP-TV-Z]{5}(-[0-9A-HJKMNP-TV-Z]{5}){3}$/);
    // It is shown, never put in the URL.
    expect(admin.url()).not.toContain(fresh);
    password = fresh;

    const shop = await browser.newContext();
    const customer = await shop.newPage();
    await customer.goto('/en/login');
    await customer.getByLabel('Email').fill(CUSTOMER);
    await customer.getByLabel('Password').fill(fresh);
    await customer.getByRole('button', { name: 'Sign in' }).click();
    await expect(customer).toHaveURL(/\/en\/dashboard/, { timeout: 60_000 });

    await shop.close();
    await office.close();
  });

  test('an account is made by hand, and its one-time password works', async ({ browser }) => {
    test.setTimeout(180_000);
    const office = await adminContext(browser);
    const admin = await office.newPage();
    await admin.goto('/en/admin/customers');
    await admin.getByRole('link', { name: '+ New customer' }).click();
    await admin.getByLabel('Email').fill(BY_PHONE);
    await admin.getByLabel('Name', { exact: true }).fill('Nadia Haddad');
    await admin.getByLabel('Phone (optional)').fill('0770 11 22 33');
    await admin.getByRole('button', { name: 'Create the account' }).click();

    const done = admin.getByRole('status').filter({ hasText: 'Account created.' });
    await expect(done).toBeVisible();
    const temporary = (await done.locator('p[dir="ltr"]').innerText()).trim();
    expect(temporary.length).toBeGreaterThan(10);
    expect(admin.url()).not.toContain(temporary);

    const { shop, page } = await signIn(browser, BY_PHONE, temporary);
    await expect(page).toHaveURL(/\/en\/dashboard/, { timeout: 60_000 });
    await shop.close();
    await office.close();
  });

  test('a mistyped email is corrected; one already in use is refused', async ({ browser }) => {
    test.setTimeout(180_000);
    const office = await adminContext(browser);
    const admin = await office.newPage();
    await openCustomer(admin, CUSTOMER);
    const detail = admin.getByRole('region', { name: 'Amine Belkacem' });

    await detail.getByLabel('Email').fill(BY_PHONE);
    await detail.getByRole('button', { name: 'Save' }).click();
    await expect(admin.getByRole('status')).toHaveText('This email is already used by another account.');

    await detail.getByLabel('Email').fill(RENAMED);
    await detail.getByRole('button', { name: 'Save' }).click();
    await expect(admin.getByRole('status')).toHaveText('Change saved.');

    const { shop, page } = await signIn(browser, RENAMED, password);
    await expect(page).toHaveURL(/\/en\/dashboard/, { timeout: 60_000 });
    await shop.close();
    await office.close();
  });

  test('deleting an account removes it, and its sticker goes back to unassigned', async ({ browser }) => {
    test.setTimeout(180_000);
    const office = await adminContext(browser);
    const admin = await office.newPage();
    await openCustomer(admin, RENAMED);

    await admin.locator('summary', { hasText: 'Delete the account' }).click();
    await expect(admin.getByText(`The account ${RENAMED} will be deleted for good`)).toBeVisible();
    await expect(admin.getByText('Its sticker goes back to “Unassigned”')).toBeVisible();
    await admin.getByRole('button', { name: 'Yes, delete this account' }).click();
    await expect(admin.getByRole('status')).toHaveText('Account deleted.');

    const { shop, page } = await signIn(browser, RENAMED, password);
    await expect(page.locator('form p[role="alert"]')).toHaveText('Wrong email or password.');
    await shop.close();

    await admin.goto(`/en/admin/tags?q=${tag.id}`);
    await expect(admin.getByRole('row', { name: new RegExp(tag.id) })).toContainText('Unassigned');
    await office.close();
  });
});
