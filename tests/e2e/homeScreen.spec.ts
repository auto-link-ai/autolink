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
