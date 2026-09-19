import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import JSZip from 'jszip';

// ---- Public pages: no database writes -------------------------------------------------

test('the order form renders in Arabic, right-to-left', async ({ page }) => {
  await page.goto('/ar/order');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('اطلب ملصقك.');
});

test('an unknown order reference is a 404, and a malformed one too', async ({ page }) => {
  expect((await page.goto('/fr/order/AL-ZZZZZZ'))?.status()).toBe(404);
  expect((await page.goto('/fr/order/not-a-ref'))?.status()).toBe(404);
});

test('robots.txt keeps the admin, the API and order pages out of search', async ({ request }) => {
  const body = await (await request.get('/robots.txt')).text();
  for (const path of ['/api/', '/t/', '/fr/admin', '/fr/order/']) expect(body).toContain(`Disallow: ${path}`);
});

test('the sitemap lists the public pages in the three languages', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  for (const path of ['/fr', '/ar/pricing', '/en/how-it-works', '/fr/terms']) expect(xml).toContain(`${path}<`);
  // Admin and order pages are never in the sitemap.
  expect(xml).not.toContain('/admin');
  expect(xml).not.toContain('/order');
});

// ---- The gate: needs a disposable database and an admin account -----------------------

const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const PHONE = '0551 23 45 67';
const NORMALIZED_PHONE = '0551234567';

async function signIn(page: Page) {
  await page.goto('/en/admin/login');
  await page.getByLabel('Email').fill(EMAIL!);
  await page.getByLabel('Password').fill(PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  // `next dev` compiles the target route on this first hit; under parallel
  // workers that can take longer than the default 5s expectation.
  await expect(page).toHaveURL(/\/en\/admin\/(tags|orders)$/, { timeout: 60_000 });
}

test.describe('ordering end to end', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!EMAIL || !PASSWORD, 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.');
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  let orderRef = '';
  let tagId = '';

  test('a customer orders in Arabic and gets a confirmation', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/ar/order');

    await page.getByLabel('الاسم الكامل').fill('أمين بلقاسم');
    await page.getByLabel('رقم الهاتف', { exact: true }).fill(PHONE);
    await page.getByLabel('الولاية', { exact: true }).selectOption('16');
    await page.getByLabel('البلدية').fill('باب الزوار');
    await page.getByLabel('العنوان').fill('حي 200 مسكن، عمارة ب');
    await page.getByLabel('الكمية').selectOption('2');

    await page.getByRole('button', { name: 'مراجعة الطلب' }).click();
    await page.getByRole('button', { name: 'تأكيد الطلب' }).click();

    await expect(page).toHaveURL(/\/ar\/order\/AL-[0-9A-HJKMNP-TV-Z]{6}$/, { timeout: 60_000 });
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    orderRef = new URL(page.url()).pathname.split('/').pop()!;

    // The browser that ordered sees its own details, including the phone as typed back in storage form.
    await expect(page.getByText(NORMALIZED_PHONE)).toBeVisible();
    await expect(page.getByText('أمين بلقاسم')).toBeVisible();
  });

  test('someone guessing the reference sees no personal data', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`/fr/order/${orderRef}`);
    await expect(page.getByText(orderRef)).toBeVisible();
    await expect(page.getByText('أمين بلقاسم')).toHaveCount(0);
    await expect(page.getByText(NORMALIZED_PHONE)).toHaveCount(0);
    await context.close();
  });

  test('the admin finds the order by phone, confirms it and packs it', async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page);

    // A tag to assign: generate a one-tag batch and read its id from the ZIP.
    await page.goto('/en/admin/tags');
    await page.getByLabel('Batch name').fill('E2E orders');
    await page.getByLabel('Quantity').fill('1');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Generate and download' }).click();
    const zip = await JSZip.loadAsync(await readFile((await (await download).path())!));
    const csv = await zip.file('tags.csv')!.async('string');
    tagId = csv.split('\r\n')[1]?.split(',')[0] ?? '';
    expect(tagId).toMatch(/^AUT-[0-9A-HJKMNP-TV-Z]{8}$/);

    // Find the order by the phone number as the customer typed it.
    await page.goto('/en/admin/orders');
    await page.getByLabel('Search').fill(PHONE);
    await page.getByRole('button', { name: 'Search' }).click();
    await page.getByRole('link', { name: orderRef }).click();
    await expect(page.getByText(NORMALIZED_PHONE)).toBeVisible();

    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByText('Change saved.')).toBeVisible();
    await page.getByRole('button', { name: 'Start preparing' }).click();

    // Shipping is refused until every tag of the order is assigned.
    await page.getByRole('button', { name: 'Mark shipped' }).click();
    await expect(page.getByText('Assign all of the order’s tags first.')).toBeVisible();

    // The order is for two stickers, so one id is the wrong count.
    await page.getByLabel(/Tags to assign/).fill(tagId);
    await page.getByRole('button', { name: 'Assign tags' }).click();
    await expect(page.getByText('The number of tags must match the quantity ordered.')).toBeVisible();
  });

  test('the CSV export carries the order', async ({ page }) => {
    await signIn(page);
    const download = page.waitForEvent('download');
    await page.goto('/en/admin/orders');
    await page.getByRole('link', { name: 'Export CSV' }).click();
    const file = await (await download).path();
    const csv = await readFile(file!, 'utf8');
    expect(csv.split('\r\n')[0]).toContain('order_ref,created_at,status');
    expect(csv).toContain(orderRef);
    expect(csv).toContain(NORMALIZED_PHONE);
  });
});
