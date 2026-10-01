import { readFile } from 'node:fs/promises';
import { expect, test, type Browser, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { adminContext, hasAdminCredentials } from './adminSession';
import { linkSticker } from './linkSticker';

/**
 * Cleaning up stickers: an unused one deleted, a test batch emptied until it
 * goes, and a sticker taken back from a customer — free again for whoever scans it next.
 */

const run = Date.now().toString(36).slice(-6);

async function generate(page: Page, label: string, quantity: number): Promise<{ id: string }[]> {
  await page.goto('/en/admin/tags');
  await page.getByLabel('Batch name').fill(label);
  await page.getByLabel('Quantity').fill(String(quantity));
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate and download' }).click();
  const zip = await JSZip.loadAsync(await readFile((await (await download).path())!));
  const rows = (await zip.file('tags.csv')!.async('string')).trim().split('\r\n').slice(1);
  return rows.map((row) => {
    const [id] = row.split(',');
    return { id: id! };
  });
}

async function customerWith(browser: Browser, tag: { id: string }) {
  const shop = await browser.newContext({ extraHTTPHeaders: { 'x-forwarded-for': `198.51.100.${Date.now() % 250}` } });
  const page = await shop.newPage();
  await page.goto('/en/register');
  await page.getByLabel('Full name').fill('Yacine Take');
  await page.getByLabel('Email').fill(`e2e-take-${run}@example.dz`);
  await page.getByLabel('WhatsApp number').fill('0551 23 45 67');
  await page.getByLabel('Password').fill('e2e-take-back-password');
  await page.getByRole('button', { name: 'Create my account' }).click();
  await expect(page).toHaveURL(/\/en\/dashboard/, { timeout: 60_000 });
  await linkSticker(page, tag.id, { make: 'Dacia', model: 'Logan', colour: 'White' });
  return { shop, page };
}

test.describe('an admin cleaning up stickers', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.');
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  const label = `E2E clean ${run}`;
  let tags: { id: string }[] = [];

  test('an unused sticker is deleted in two taps', async ({ browser }) => {
    test.setTimeout(180_000);
    const office = await adminContext(browser);
    const page = await office.newPage();
    tags = await generate(page, label, 3);

    await page.goto(`/en/admin/tags?q=${tags[0]!.id}`);
    const row = page.getByRole('row', { name: new RegExp(tags[0]!.id) });
    await row.locator('summary', { hasText: 'Delete' }).click();
    await expect(row).toContainText(`Sticker ${tags[0]!.id} was never used`);
    await row.getByRole('button', { name: 'Yes, delete' }).click();
    await expect(page.getByRole('status')).toHaveText('Sticker deleted.');
    await expect(page.getByRole('row', { name: new RegExp(tags[0]!.id) })).toHaveCount(0);
    await office.close();
  });

  test('a test batch is cleaned up, and goes once empty', async ({ browser }) => {
    const office = await adminContext(browser);
    const page = await office.newPage();
    await page.goto('/en/admin/tags');
    const batch = page.getByRole('row', { name: new RegExp(label) });
    await batch.locator('summary', { hasText: 'Delete the 2 unused' }).click();
    await batch.getByRole('button', { name: 'Yes, delete' }).click();
    await expect(page.getByRole('status')).toHaveText('Unused stickers deleted.');
    await expect(page.getByRole('row', { name: new RegExp(label) })).toHaveCount(0);
    await office.close();
  });

  test('a sticker is taken back from its customer, and is free to link again', async ({ browser }) => {
    test.setTimeout(240_000);
    const office = await adminContext(browser);
    const admin = await office.newPage();
    const [tag] = await generate(admin, `E2E take ${run}`, 1);
    const { shop, page } = await customerWith(browser, tag!);

    await admin.goto(`/en/admin/tags?q=${tag!.id}`);
    const row = admin.getByRole('row', { name: new RegExp(tag!.id) });
    await expect(row).toContainText('Active');
    // A used sticker can be taken back, never deleted.
    await expect(row.locator('summary', { hasText: /^Delete$/ })).toHaveCount(0);
    await row.locator('summary', { hasText: 'Take back' }).click();
    await row.getByRole('button', { name: 'Yes, take it back' }).click();
    await expect(admin.getByRole('status')).toContainText('Sticker taken back');
    await expect(admin.getByRole('row', { name: new RegExp(tag!.id) })).toContainText('Unassigned');

    // The customer no longer has it; scanned, it waits for an owner again — whoever links it next.
    await page.goto('/en/dashboard');
    await expect(page.getByText(tag!.id)).toHaveCount(0);
    await page.goto(`/t/${tag!.id}`);
    await expect(page.getByRole('heading', { name: "This sticker isn't activated yet." })).toBeVisible();
    await linkSticker(page, tag!.id);

    await shop.close();
    await office.close();
  });
});
