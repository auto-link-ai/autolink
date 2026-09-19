import { expect, test } from '@playwright/test';

test('root redirects to a locale-prefixed URL', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/(fr|ar|en)$/);
});

test('French page renders LTR with the French headline', async ({ page }) => {
  await page.goto('/fr');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang', 'fr');
  await expect(html).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Votre voiture peut recevoir des messages.',
  );
});

test('Arabic page renders RTL', async ({ page }) => {
  await page.goto('/ar');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang', 'ar');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('سيارتك يمكنها استقبال الرسائل.');
});

test('English page renders and the language links switch locale', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your car can receive messages.');
  await page.getByRole('link', { name: 'Français' }).first().click();
  await expect(page).toHaveURL(/\/fr$/);
});

test('page has no horizontal overflow at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/ar');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
