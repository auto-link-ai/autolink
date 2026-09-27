import { expect, test } from '@playwright/test';

/**
 * What an iPhone needs before it allows notifications: a manifest, so AutoLink
 * can be added to the Home Screen, and raster icons for it and for the
 * notifications themselves. No database involved.
 */

test('the site can be added to a Home Screen', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as {
    name: string;
    start_url: string;
    display: string;
    icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
  };
  expect(manifest.name).toBe('AutoLink');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/dashboard');
  expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);

  for (const icon of manifest.icons) {
    const image = await request.get(icon.src);
    expect(image.ok(), icon.src).toBe(true);
    expect(image.headers()['content-type']).toBe('image/png');
  }
});

test('every page points to the manifest and the iPhone icon', async ({ page, request }) => {
  await page.goto('/en');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest\.webmanifest/);
  const appleIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect(appleIcon).toBeTruthy();
  expect((await request.get(appleIcon!)).ok()).toBe(true);
});

test('notifications carry PNG icons, which Android and Windows can show', async ({ request }) => {
  const worker = await (await request.get('/sw.js')).text();
  for (const src of ['/brand/icon-192.png', '/brand/badge-96.png']) {
    expect(worker).toContain(src);
    expect((await request.get(src)).ok(), src).toBe(true);
  }
});

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';

test('one button installs the app with the browser’s own install window', async ({ page }) => {
  await page.goto('/en/faq');
  const banner = page.getByRole('banner');
  // Phones find it in the menu; a computer, which has no menu when signed out, in the bar.
  const menuButton = banner.locator('button[aria-controls="mobile-menu"]');
  if (await menuButton.isVisible()) {
    // A tap before the page has finished loading does nothing: retry until it opens.
    await expect(async () => {
      if ((await menuButton.getAttribute('aria-expanded')) !== 'true') await menuButton.click();
      await expect(page.locator('#mobile-menu')).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15_000 });
  }
  // Only the visible button counts: getByRole skips the hidden one.
  const install = banner.getByRole('button', { name: 'Install the app' });
  // Nothing offered yet: a browser that cannot install gets no button.
  await expect(install).toHaveCount(0);

  // What Chrome and Edge send when the site can be installed — sent again until
  // the page is listening, as a real browser's offer always arrives after it is.
  await expect(async () => {
    await page.evaluate(() => {
      const offer = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt: async () => {
          (window as unknown as { prompted: boolean }).prompted = true;
        },
        userChoice: Promise.resolve({ outcome: 'accepted' as const }),
      });
      window.dispatchEvent(offer);
    });
    await expect(install).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await install.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { prompted?: boolean }).prompted)).toBe(true);
  // Installed: the button goes away.
  await expect(install).toHaveCount(0);
});

test.describe('on an iPhone', () => {
  test.use({ userAgent: IPHONE_SAFARI, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('the button shows how to add AutoLink from the Share menu', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/fr/faq');
    const menuButton = page.getByRole('banner').locator('button[aria-controls="mobile-menu"]');
    const menu = page.locator('#mobile-menu');
    // A tap before the page has finished loading does nothing: retry until it opens.
    await expect(async () => {
      if ((await menuButton.getAttribute('aria-expanded')) !== 'true') await menuButton.click();
      await expect(menu).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 60_000 });
    await menu.getByRole('button', { name: "Installer l'application" }).click();
    await expect(menu.getByText('Touchez Partager, en bas de Safari')).toBeVisible();
    await expect(menu.getByText('Touchez Ajouter')).toBeVisible();
  });

  test('opened from the Home Screen, it offers nothing', async ({ page }) => {
    test.setTimeout(90_000);
    await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
    await page.goto('/fr/faq');
    const menuButton = page.getByRole('banner').locator('button[aria-controls="mobile-menu"]');
    await expect(async () => {
      if ((await menuButton.getAttribute('aria-expanded')) !== 'true') await menuButton.click();
      await expect(page.locator('#mobile-menu')).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 60_000 });
    await expect(page.locator('#mobile-menu').getByRole('button', { name: /Installer/ })).toHaveCount(0);
  });
});
