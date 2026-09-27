import { expect, test, type Locator } from '@playwright/test';
import { adminContext, hasAdminCredentials } from './adminSession';

/**
 * Correcting orders by hand: one taken by phone, a mistyped one fixed, one
 * deleted — and a confirmed one that cannot be deleted.
 */

const run = Date.now().toString(36).slice(-5);

async function fillOrder(form: Locator, name: string) {
  await form.getByLabel('Full name').fill(name);
  await form.getByLabel('Phone').fill('0661 23 45 67');
  await form.getByLabel('Wilaya').selectOption('16');
  await form.getByLabel('Commune').fill('Hydra');
  await form.getByLabel('Address').fill('12 rue des Pins');
  await form.getByLabel('Quantity').fill('1');
}

test.describe('an admin correcting orders', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.');
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  let orderRef = '';

  test('an order taken by phone is added by hand, and a bad phone is caught under its field', async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await adminContext(browser);
    const page = await context.newPage();
    await page.goto('/en/admin/orders');
    await page.getByRole('link', { name: '+ New order' }).click();
    const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Create the order' }) });
    await fillOrder(form, `Phone Order ${run}`);

    // A mistyped phone: refused, explained under the field, the rest kept.
    await form.getByLabel('Phone').fill('12');
    await form.getByRole('button', { name: 'Create the order' }).click();
    await expect(form.getByText('Enter a valid Algerian mobile (05, 06 or 07).')).toBeVisible();
    await expect(form.getByLabel('Full name')).toHaveValue(`Phone Order ${run}`);

    await form.getByLabel('Phone').fill('0661 23 45 67');
    await form.getByRole('button', { name: 'Create the order' }).click();
    await expect(page).toHaveURL(/[?&]ref=AL-[A-Z0-9]+.*result=created|result=created.*ref=AL-/);
    orderRef = new URL(page.url()).searchParams.get('ref')!;
    await expect(page.getByRole('status')).toHaveText('Order created.');
    const detail = page.getByRole('region', { name: orderRef });
    await expect(detail).toContainText(`Phone Order ${run}`);
    await context.close();
  });

  test('an order is corrected: new address and quantity, the total follows', async ({ browser }) => {
    const context = await adminContext(browser);
    const page = await context.newPage();
    await page.goto(`/en/admin/orders?ref=${orderRef}`);
    const detail = page.getByRole('region', { name: orderRef });
    const totalBefore = await detail.getByText(/DA$/).last().innerText();

    await detail.getByText('Edit the order').click();
    const form = detail.locator('form').filter({ has: page.getByRole('button', { name: 'Save', exact: true }) });
    await form.getByLabel('Address').fill('14 rue des Oliviers');
    await form.getByLabel('Quantity').fill('3');
    await form.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByRole('status')).toHaveText('Change saved.');
    await expect(detail).toContainText('14 rue des Oliviers');
    await expect(detail.getByText(/DA$/).last()).not.toHaveText(totalBefore);
    await context.close();
  });

  test('a new order is deleted in two taps', async ({ browser }) => {
    const context = await adminContext(browser);
    const page = await context.newPage();
    await page.goto(`/en/admin/orders?ref=${orderRef}`);
    const detail = page.getByRole('region', { name: orderRef });
    await detail.getByText('Delete the order').click();
    await expect(detail).toContainText(`Order ${orderRef} will be deleted for good.`);
    await detail.getByRole('button', { name: 'Yes, delete' }).click();

    await expect(page.getByRole('status')).toHaveText('Order deleted.');
    await expect(page.getByRole('region', { name: orderRef })).toHaveCount(0);
    await page.goto(`/en/admin/orders?q=${orderRef}`);
    await expect(page.getByRole('link', { name: orderRef })).toHaveCount(0);
    await context.close();
  });

  test('a confirmed order offers no delete, only cancel', async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await adminContext(browser);
    const page = await context.newPage();
    await page.goto('/en/admin/orders?new=1');
    const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Create the order' }) });
    await fillOrder(form, `Confirmed ${run}`);
    await form.getByRole('button', { name: 'Create the order' }).click();
    await expect(page).toHaveURL(/result=created/);
    const ref = new URL(page.url()).searchParams.get('ref')!;
    const detail = page.getByRole('region', { name: ref });

    await detail.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByRole('status')).toHaveText('Change saved.');
    await expect(page.getByRole('region', { name: ref }).getByText('Delete the order')).toHaveCount(0);
    await expect(page.getByRole('region', { name: ref }).getByText('Edit the order')).toBeVisible();
    await context.close();
  });
});
