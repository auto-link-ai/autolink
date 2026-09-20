import { expect, test, type Page } from '@playwright/test';
import { adminContext, hasAdminCredentials } from './adminSession';

/**
 * The dashboard and the shell around it. The queue is the point: an order that
 * arrived must be visible and one click away without filtering anything.
 */

async function placeOrder(page: Page, name: string): Promise<string> {
  await page.goto('/en/order');
  await page.locator('#order-name').fill(name);
  await page.locator('#order-phone').fill('0551 23 45 67');
  await page.locator('#order-wilaya').selectOption('16');
  await page.locator('#order-commune').fill('Bab Ezzouar');
  await page.locator('#order-address').fill('Cite 200 logements');
  await page.getByRole('button', { name: 'Review my order' }).click();
  await page.getByRole('button', { name: 'Confirm order' }).click();
  await expect(page).toHaveURL(/\/en\/order\/AL-/, { timeout: 60_000 });
  return new URL(page.url()).pathname.split('/').pop()!;
}

test.describe('the admin dashboard', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.');
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  test('a new order lands in the queue and opens from it', async ({ browser }) => {
    test.setTimeout(180_000);
    const shop = await browser.newContext();
    const customer = await shop.newPage();
    const orderRef = await placeOrder(customer, 'Yasmine Haddad');
    await shop.close();

    const office = await adminContext(browser);
    const page = await office.newPage();
    await page.goto('/en/admin');

    await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();
    // The stat card says there is work, and the sidebar badge agrees.
    const pendingCard = page.getByRole('link', { name: /Pending orders/ });
    await expect(pendingCard).toBeVisible();
    await expect(page.getByRole('navigation').first().getByRole('link', { name: /Orders/ })).toContainText(/\d/);

    const queue = page.getByRole('region', { name: 'To do' });
    // Scoped to this order's own row: other orders may share a customer name.
    const row = queue.getByRole('link', { name: new RegExp(orderRef) });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Yasmine Haddad');
    await row.click();
    await expect(page).toHaveURL(new RegExp(`/en/admin/orders\\?.*ref=${orderRef}`));
    // Opening it from the dashboard lands on the order itself, ready to confirm.
    await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toBeVisible();

    await office.close();
  });

  test('the sidebar marks where you are and reaches every section', async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await adminContext(browser);
    const page = await context.newPage();
    await page.goto('/en/admin');
    const sidebar = page.getByRole('navigation').first();

    for (const [name, url] of [
      ['Customers', /\/en\/admin\/customers$/],
      ['Tags', /\/en\/admin\/tags$/],
      ['Settings', /\/en\/admin\/settings$/],
      ['Overview', /\/en\/admin$/],
    ] as const) {
      await sidebar.getByRole('link', { name: new RegExp(`^${name}`) }).click();
      await expect(page).toHaveURL(url);
      await expect(sidebar.getByRole('link', { name: new RegExp(`^${name}`) })).toHaveAttribute(
        'aria-current',
        'page',
      );
    }
    await context.close();
  });

  test('on a phone the bar replaces the sidebar, and Arabic mirrors the shell', async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await adminContext(browser, { viewport: { width: 390, height: 844 } });
    const page = await context.newPage();

    await page.goto('/en/admin');
    // Every section stays reachable without a drawer.
    for (const name of ['Overview', 'Orders', 'Tags', 'Customers', 'Settings']) {
      await expect(page.getByRole('link', { name: new RegExp(`^${name}`) }).first()).toBeVisible();
    }

    await page.goto('/ar/admin');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('نظرة عامة');

    await context.close();
  });
});
