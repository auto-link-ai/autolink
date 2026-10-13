import { expect, test } from '@playwright/test';
import { adminContext, hasAdminCredentials } from './adminSession';
import {
  createOwner,
  editCar,
  formatPhone,
  freshClient,
  freshPhone,
  newStickers,
  openCustomer,
  signIn,
  trySignIn,
  type Owner,
} from './owner';

/**
 * The admin side of a customer account: find them by number or by name, see
 * what they own, correct who they are, block them, delete them. Their PIN is
 * adminCustomerPins.spec.ts.
 */

const run = Date.now().toString(36);
/** Unique to this run: part of it finds the customer, and nobody else. */
const LAST_NAME = `Belkacem-${run}`;

test.describe('an admin looking after a customer', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.');
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  let tag = { id: '' };
  let customer: Owner;
  const fullName = () => `${customer.firstName} ${LAST_NAME}`;

  test('the overview counts what exists', async ({ browser }) => {
    test.setTimeout(180_000);
    // A tag to hand out, so the rest of this file has something to activate.
    tag = { id: (await newStickers(browser))[0]! };
    expect(tag.id).toMatch(/^AUT-[0-9A-HJKMNP-TV-Z]{8}$/);

    const office = await adminContext(browser);
    const page = await office.newPage();
    await page.goto('/en/admin');
    await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();
    // The batch just generated is counted in the stock, and what needs doing comes first.
    await expect(page.getByRole('link', { name: /Stickers in stock/ })).toBeVisible();
    await expect(page.getByRole('region', { name: 'To do' })).toBeVisible();
    await office.close();
  });

  test('a new customer shows up with their sticker and car, found by part of a name or by number', async ({ browser }) => {
    test.setTimeout(180_000);
    const shop = await freshClient(browser);
    const page = await shop.newPage();
    customer = await createOwner(page, { tagId: tag.id, lastName: LAST_NAME, brand: 'Peugeot', model: '208' });
    await editCar(page, tag.id, { colour: 'Blue' });
    await shop.close();

    const office = await adminContext(browser);
    const admin = await office.newPage();
    await admin.goto('/en/admin/customers');
    await expect(admin.getByRole('heading', { name: 'Customers', level: 1 })).toBeVisible();
    await admin.getByLabel('Search').fill(run);
    await admin.getByRole('button', { name: 'Search' }).click();
    await expect(admin).toHaveURL(/[?&]q=/);
    // One row says who they are at a glance: name, number as people read it, stickers, status.
    const row = admin.getByRole('row').filter({ hasText: LAST_NAME });
    await expect(row).toHaveCount(1);
    await expect(row.getByRole('link', { name: fullName() })).toBeVisible();
    await expect(row.getByRole('cell').nth(1)).toHaveText(formatPhone(customer.phone));
    await expect(row.getByRole('cell').nth(2)).toHaveText('1');
    await expect(row).toContainText('Active');

    // A whole number finds exactly them. Scoped to the panel: the list row underneath shows the same values.
    await openCustomer(admin, customer.phone);
    const detail = admin.getByRole('region', { name: fullName(), exact: true });
    await expect(detail.getByText(formatPhone(customer.phone))).toBeVisible();
    await expect(detail.getByText('Stickers (1)')).toBeVisible();
    await expect(detail.getByText(tag.id)).toBeVisible();
    await expect(detail.getByText('Peugeot 208 · Blue')).toBeVisible();
    await office.close();
  });

  test('a name is corrected and the customer moved to a new number; one used by another account is refused', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    // Someone else's number, to try to give away.
    const elsewhere = await freshClient(browser);
    const other = await createOwner(await elsewhere.newPage(), { firstName: 'Karim' });
    await elsewhere.close();

    const office = await adminContext(browser);
    const admin = await office.newPage();
    await openCustomer(admin, customer.phone);
    const detail = admin.getByRole('region', { name: fullName(), exact: true });
    await detail.getByLabel('Phone', { exact: true }).fill(other.phone);
    await detail.getByRole('button', { name: 'Save' }).click();
    await expect(detail.getByText('This number is already used by another account.')).toBeVisible();

    const moved = freshPhone();
    await detail.getByLabel('First name').fill('Amin');
    await detail.getByLabel('Phone', { exact: true }).fill(moved);
    await detail.getByRole('button', { name: 'Save' }).click();
    await expect(admin.getByRole('status')).toHaveText('Change saved.');
    customer = { ...customer, firstName: 'Amin', phone: moved };
    await expect(admin.getByRole('region', { name: fullName(), exact: true })).toBeVisible();
    await office.close();

    // The number is the sign-in: the new one works, with the same PIN.
    const shop = await freshClient(browser);
    await signIn(await shop.newPage(), customer.phone, customer.pin);
    await shop.close();
  });

  test('blocking shuts the customer out, unblocking lets them back in', async ({ browser }) => {
    test.setTimeout(240_000);
    // Signed in before the block: that session must end with it.
    const shop = await freshClient(browser);
    const page = await shop.newPage();
    await signIn(page, customer.phone, customer.pin);

    const office = await adminContext(browser);
    const admin = await office.newPage();
    await openCustomer(admin, customer.phone);
    // It asks first: blocking locks the customer out on their next request.
    await admin.locator('summary', { hasText: 'Block account' }).click();
    await expect(admin.getByText(`${fullName()} will not be able to sign in`)).toBeVisible();
    await admin.getByRole('button', { name: 'Yes, block this account' }).click();
    await expect(admin.getByRole('status')).toHaveText('Change saved.');
    await expect(admin.getByRole('button', { name: 'Unblock' })).toBeVisible();
    // Listed under « Blocked » from now on.
    await admin.getByRole('navigation', { name: 'Filter by status' }).getByRole('link', { name: /^Blocked/ }).click();
    await expect(admin).toHaveURL(/[?&]status=BLOCKED/);
    await expect(admin.getByRole('row').filter({ hasText: LAST_NAME })).toContainText('Blocked');

    // The session ends, and signing in is refused — with no word of why.
    await page.goto('/en/dashboard');
    await expect(page).toHaveURL(/\/en\/login\?next=/);
    await expect(await trySignIn(page, customer.phone, customer.pin)).toHaveText('Wrong number or PIN.');

    await openCustomer(admin, customer.phone);
    await admin.getByRole('button', { name: 'Unblock' }).click();
    await expect(admin.getByRole('status')).toHaveText('Change saved.');

    await signIn(page, customer.phone, customer.pin);
    await expect(page.getByRole('heading', { name: 'Peugeot 208' })).toBeVisible();
    await shop.close();
    await office.close();
  });

  test('deleting an account removes it, and its sticker goes back to unassigned', async ({ browser }) => {
    test.setTimeout(180_000);
    const office = await adminContext(browser);
    const admin = await office.newPage();
    await openCustomer(admin, customer.phone);

    await admin.locator('summary', { hasText: 'Delete the account' }).click();
    await expect(admin.getByText(`The account ${fullName()} will be deleted for good`)).toBeVisible();
    await expect(admin.getByText('Its sticker goes back to “Unassigned”')).toBeVisible();
    await admin.getByRole('button', { name: 'Yes, delete this account' }).click();
    await expect(admin.getByRole('status')).toHaveText('Account deleted.');

    const shop = await freshClient(browser);
    await expect(await trySignIn(await shop.newPage(), customer.phone, customer.pin)).toHaveText('Wrong number or PIN.');
    await shop.close();

    await admin.goto(`/en/admin/tags?q=${tag.id}`);
    await expect(admin.getByRole('row', { name: new RegExp(tag.id) })).toContainText('Unassigned');
    await office.close();
  });
});
