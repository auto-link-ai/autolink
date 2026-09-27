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
    'Votre voiture peut recevoir des messages. Votre numéro reste invisible.',
  );
});

test('Arabic page renders RTL', async ({ page }) => {
  await page.goto('/ar');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang', 'ar');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('سيارتك يمكنها استقبال الرسائل. ورقمك لا يظهر أبدًا.');
});

test('English page renders and the language links switch locale', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your car can receive messages. Your number never shows.');
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

for (const { name, width, height } of [
  { name: 'a laptop', width: 1440, height: 900 },
  { name: 'a phone', width: 390, height: 844 },
]) {
  test(`on ${name}, the first screen says what it is and holds the order button`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/fr');
    const hero = page.locator('section').first();
    await expect(hero.getByText('Autocollant QR pour votre voiture')).toBeInViewport();
    await expect(hero.getByRole('link', { name: 'Commander mon autocollant' })).toBeInViewport({ ratio: 1 });
    // Every promise is written out, not left to an icon.
    for (const promise of ['Numéro jamais affiché', 'Alerte en quelques secondes', 'Sans application ni compte']) {
      await expect(hero.getByRole('listitem').filter({ hasText: promise })).toBeVisible();
    }
  });
}

test('"How it works" in the hero scrolls to the steps on the same page', async ({ page }) => {
  await page.goto('/fr');
  // The header has a link of the same name, to its own page; this is the hero's.
  await page.locator('section').first().getByRole('link', { name: 'Comment ça marche' }).click();
  await expect(page).toHaveURL(/\/fr#how-it-works$/);
  await expect(page.getByRole('heading', { name: 'Collez-le une fois, restez joignable toujours.' })).toBeInViewport();
});

test.describe('Arabic first', () => {
  // A French phone, and nothing chosen yet on this site.
  test.use({ locale: 'fr-FR', storageState: { cookies: [], origins: [] } });

  test('a French phone opens the site in Arabic', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/ar$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('a language chosen with the switcher is remembered', async ({ page }) => {
    await page.goto('/ar');
    await page.getByRole('link', { name: 'Français' }).first().click();
    await expect(page).toHaveURL(/\/fr$/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/fr$/);
  });

  test('the scan page opens in Arabic on a French phone', async ({ page }) => {
    await page.goto('/t/AUT-ZZZZZZZZ');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});
