import { expect, test } from '@playwright/test';

/**
 * The Arabic ad page: the designer's picture with a real link on each button
 * drawn in it. No database writes.
 */

test('the ad page answers at /offre, in Arabic, without a language redirect', async ({ page }) => {
  const response = await page.goto('/offre');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/offre$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  // Ten slices, each described for those who cannot see it.
  const slices = page.locator('main img');
  await expect(slices).toHaveCount(10);
  for (const alt of await slices.evaluateAll((imgs) => imgs.map((img) => img.getAttribute('alt') ?? ''))) {
    expect(alt.length).toBeGreaterThan(20);
  }
});

test('every « اطلب » button opens the order page; « شوف العرض » goes to the offer', async ({ page }) => {
  await page.goto('/offre');
  const orders = page.locator('a[data-offer-button="order"]');
  await expect(orders).toHaveCount(7);
  for (const href of await orders.evaluateAll((links) => links.map((a) => a.getAttribute('href')))) {
    expect(href).toBe('/ar/order');
  }

  await page.getByRole('link', { name: 'شوف العرض' }).click();
  await expect(page).toHaveURL(/#offre$/);
  await expect(page.locator('#offre')).toBeInViewport();

  await page.getByRole('link', { name: 'اطلب ضرك — الدفع عند الاستلام' }).click();
  await expect(page).toHaveURL(/\/ar\/order$/);
});

test('on a phone, the design fits the screen: no sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/offre');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
  // The first button is on its drawn button: inside the first slice's lower part.
  const box = await page.getByRole('link', { name: 'اطلب ضرك — الدفع عند الاستلام' }).boundingBox();
  expect(box!.width).toBeGreaterThan(200);
  expect(box!.height).toBeGreaterThan(40);
});
