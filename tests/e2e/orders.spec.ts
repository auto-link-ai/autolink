import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import JSZip from 'jszip';

// ---- Public pages: no database writes -------------------------------------------------

test('the order form renders in Arabic, right-to-left', async ({ page }) => {
  await page.goto('/ar/order');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ليتمكّن أيّ شخص من تنبيهك، دون أن يرى رقمك أبدًا.');
});

test('on a phone, the first screen sells, and a bar brings the form back', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/fr/order');
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
  await expect(page.getByText(/^1\s500\sDA$/).first()).toBeInViewport();
  await expect(page.getByText('Paiement à la livraison', { exact: true })).toBeInViewport();
  await expect(page.getByRole('img', { name: /L’autocollant AutoLink/ })).toBeVisible();

  const bar = page.locator('[data-order-bar]');
  await expect(bar).toHaveAttribute('aria-hidden', 'false');
  await bar.getByRole('link', { name: 'Commander' }).click();
  await expect(page.locator('#order-form')).toBeInViewport();
  await expect(bar).toHaveAttribute('aria-hidden', 'true');
});

test('an empty order puts the cursor on the name and says what is missing', async ({ page }) => {
  await page.goto('/ar/order');
  await page.getByRole('button', { name: 'اطلب الآن — الدفع عند الاستلام' }).click();
  await expect(page.getByLabel('الاسم الكامل')).toBeFocused();
  await expect(page.getByText('تنقص معلومة: تحقّق من الحقل المشار إليه بالأحمر.')).toBeVisible();
  await expect(page).toHaveURL(/\/ar\/order$/);

  // Once fixed, a field's message goes; the others stay until they are right too.
  await page.getByLabel('الاسم الكامل').fill('أمين بلقاسم');
  await expect(page.locator('#order-name-error')).toHaveCount(0);
  await expect(page.locator('#order-commune-error')).toBeVisible();
});

test('one card per car, and « or more » counts past three', async ({ page }) => {
  await page.goto('/fr/order');
  await expect(page.getByRole('radio', { name: /^1 voiture/ })).toBeChecked();
  await page.getByText('voitures', { exact: true }).first().click();
  await expect(page.getByRole('radio', { name: /^2 voitures/ })).toBeChecked();

  await page.getByText('ou plus').click();
  await page.getByRole('button', { name: 'Un autocollant de plus' }).click();
  await expect(page.getByText('5 autocollants')).toBeVisible();
  await expect(page.getByText(/5 × 1\s500\sDA/)).toBeVisible();
});

test('the commune is picked from the chosen wilaya’s list, or typed with « other »', async ({ page }) => {
  await page.goto('/fr/order');
  const list = page.locator('select#order-commune');
  // Ready once the page has loaded: a list waiting for the wilaya.
  await expect(list).toBeVisible();
  await expect(list.locator('option').first()).toHaveText('Choisissez d’abord la wilaya');

  await page.getByLabel('Wilaya', { exact: true }).selectOption('16');
  await expect(list.locator('option', { hasText: 'Bab Ezzouar' })).toHaveCount(1);
  await list.selectOption('Bab Ezzouar');

  // Another wilaya: its own communes, nothing chosen.
  await page.getByLabel('Wilaya', { exact: true }).selectOption('31');
  await expect(list.locator('option', { hasText: 'Bir El Djir' })).toHaveCount(1);
  await expect(list).toHaveValue('');

  // Not in the list: « Autre… » turns it into a text box, and back.
  await list.selectOption({ label: 'Autre… (je l’écris)' });
  await expect(page.locator('input#order-commune')).toBeFocused();
  await page.locator('input#order-commune').fill('Hai Sabah');
  await page.getByRole('button', { name: 'Choisir dans la liste' }).click();
  await expect(list).toBeVisible();
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

  test('a customer orders in Arabic on one page and gets a confirmation', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/ar/order');

    await page.getByText('سيارتان', { exact: true }).click();
    await expect(page.getByRole('radio', { name: /سيارتان/ })).toBeChecked();
    await page.getByLabel('الاسم الكامل').fill('أمين بلقاسم');
    await page.getByLabel('رقم الهاتف', { exact: true }).fill(PHONE);

    // Delivery says what it costs once the wilaya is known (the seed's placeholder fees).
    await expect(page.getByRole('radio', { name: /إلى المنزل/ })).toBeChecked();
    await page.getByLabel('الولاية', { exact: true }).selectOption('16');
    await expect(page.locator('label').filter({ hasText: 'إلى المنزل' })).toContainText(/800\sDA/);
    await expect(page.locator('[data-order-total]')).toHaveText(/3\s800\sDA/);
    await page.getByLabel('البلدية').selectOption({ label: 'باب الزوار' });
    await page.getByLabel('العنوان').fill('حي 200 مسكن، عمارة ب');
    await page.getByRole('button', { name: 'اطلب الآن — الدفع عند الاستلام' }).click();

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

test('ordering works without JavaScript: every field at once, one submit', async ({ browser }) => {
  test.skip(!EMAIL || !PASSWORD, 'Needs a disposable database.');
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/fr/order');

  await page.getByLabel('Nom et prénom').fill('Yasmine Haddad');
  await page.getByLabel('Téléphone', { exact: true }).fill('0661 22 33 44');
  await page.getByLabel('Wilaya', { exact: true }).selectOption('31');
  await page.getByLabel('Commune').fill('Bir El Djir');
  await page.getByLabel('Adresse').fill('Cité des Oliviers, bât. C');
  await page.getByRole('button', { name: 'Commander — je paie à la livraison' }).click();

  await expect(page).toHaveURL(/\/fr\/order\/AL-[0-9A-HJKMNP-TV-Z]{6}$/, { timeout: 60_000 });
  await context.close();
});
