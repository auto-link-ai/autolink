import { expect, test } from '@playwright/test';
import { hasAdminCredentials } from './adminSession';

/**
 * The Arabic ad page as a cash-on-delivery page: the top of the design, the
 * title and live price, the order form itself, then the rest of the design —
 * whose « اطلب » buttons all come back up to the form.
 */

const ORDER_BUTTON = 'اطلب الآن — الدفع عند الاستلام';

test('the ad page answers at /offre, in Arabic, without a language redirect', async ({ page }) => {
  const response = await page.goto('/offre');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/offre$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  // Ten slices of the design, each described for those who cannot see it.
  const slices = page.locator('main img');
  await expect(slices).toHaveCount(10);
  for (const alt of await slices.evaluateAll((imgs) => imgs.map((img) => img.getAttribute('alt') ?? ''))) {
    expect(alt.length).toBeGreaterThan(20);
  }
});

test('the order form is on the page, under the title and the live price', async ({ page }) => {
  await page.goto('/offre');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AutoLink');
  await expect(page.getByText(/^1\s500\sDA$/).first()).toBeVisible();
  await expect(page.locator('form#order-form')).toBeVisible();
  await expect(page.getByRole('button', { name: ORDER_BUTTON })).toBeVisible();
});

test('every « اطلب » in the picture scrolls to the form; « شوف العرض » goes to the offer', async ({ page }) => {
  // Jumps instead of gliding, so each click lands on a link that has stopped moving.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/offre');
  const orders = page.locator('a[data-offer-button="order"]');
  await expect(orders).toHaveCount(7);
  for (const href of await orders.evaluateAll((links) => links.map((a) => a.getAttribute('href')))) {
    expect(href).toBe('#order-form');
  }

  await page.getByRole('link', { name: 'شوف العرض' }).click();
  await expect(page).toHaveURL(/#offre$/);
  await expect(page.locator('#offre')).toBeInViewport();

  // At the very end the page's footer is on screen, so the phone's order bar steps aside.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.getByRole('link', { name: 'اطلب AutoLink ضرك' }).click();
  await expect(page).toHaveURL(/#order-form$/);
  await expect(page.locator('form#order-form')).toBeInViewport();
});

test('on a phone, the design fits the screen: no sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/offre');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});

test.describe('ordering from the ad page', () => {
  test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.');
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  test('a customer orders in Arabic without leaving the page, then sees the confirmation', async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({
      extraHTTPHeaders: { 'x-forwarded-for': `203.0.113.${Date.now() % 250}` },
    });
    const page = await context.newPage();
    await page.goto('/offre');
    await expect(page.locator('select#order-commune')).toBeVisible();

    await page.getByLabel('الاسم الكامل').fill('سمير بن علي');
    await page.getByLabel('رقم الهاتف', { exact: true }).fill('0661 22 33 44');
    await page.getByLabel('الولاية', { exact: true }).selectOption('31');
    await page.getByLabel('البلدية').selectOption({ label: 'بئر الجير' });
    await page.getByLabel('العنوان').fill('حي الزيتون، عمارة 4');
    await page.getByRole('button', { name: ORDER_BUTTON }).click();

    await expect(page).toHaveURL(/\/ar\/order\/AL-[0-9A-HJKMNP-TV-Z]{6}$/, { timeout: 60_000 });
    await expect(page.getByText('سمير بن علي')).toBeVisible();
    await expect(page.getByText('Bir El Djir')).toBeVisible();
    await context.close();
  });
});
