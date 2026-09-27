import { readFile } from 'node:fs/promises';
import { expect, test, type Browser, type BrowserContext } from '@playwright/test';
import JSZip from 'jszip';
import { adminContext, hasAdminCredentials } from './adminSession';

/**
 * Abusive messages, end to end, with the local Gemini stand-in
 * (tests/e2e/geminiMock.ts): the stranger is asked to rephrase, the admin
 * sees what was stopped and can deliver it — or remove it.
 */

const run = Date.now().toString(36).slice(-6);
/** Unique per run: the list may still hold earlier runs' entries. */
const INSULT = `ya hmar 7arrek tomobiltek ${run}`;

let address = 0;
function stranger(browser: Browser): Promise<BrowserContext> {
  address++;
  return browser.newContext({ extraHTTPHeaders: { 'x-forwarded-for': `203.0.113.${(Date.now() + address) % 250}` } });
}

async function send(browser: Browser, tagId: string, text: string) {
  const street = await stranger(browser);
  const page = await street.newPage();
  await page.goto(`/t/${tagId}`);
  await page.getByRole('radio', { name: 'Blocking access' }).check();
  await page.getByLabel('Anything to add? (optional)').fill(text);
  await page.getByLabel('Your contact (optional)').fill('0550 00 11 22');
  await page.getByRole('button', { name: 'Send to the owner' }).click();
  return { street, page };
}

test.describe('messages stopped for abusive words', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.');
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  let tagId = '';
  let owner: BrowserContext;
  test.afterAll(async () => owner?.close());

  test('an insult is refused and kept in the box; rephrased, it goes through', async ({ browser }) => {
    test.setTimeout(240_000);
    const office = await adminContext(browser);
    const admin = await office.newPage();
    await admin.goto('/en/admin/tags');
    await admin.getByLabel('Batch name').fill(`E2E blocked ${run}`);
    await admin.getByLabel('Quantity').fill('1');
    const download = admin.waitForEvent('download');
    await admin.getByRole('button', { name: 'Generate and download' }).click();
    const zip = await JSZip.loadAsync(await readFile((await (await download).path())!));
    const [id, code] = (await zip.file('tags.csv')!.async('string')).split('\r\n')[1]!.split(',');
    tagId = id!;
    await office.close();

    owner = await stranger(browser);
    const home = await owner.newPage();
    await home.goto('/en/register');
    await home.getByLabel('Full name').fill('Samir Owner');
    await home.getByLabel('Email').fill(`e2e-blocked-${run}@example.dz`);
    await home.getByLabel('Password').fill('e2e-blocked-password');
    await home.getByRole('button', { name: 'Create my account' }).click();
    await expect(home).toHaveURL(/\/en\/dashboard/, { timeout: 60_000 });
    await home.goto(`/en/activate?t=${tagId}&c=${code}`);
    await home.getByLabel('Make', { exact: true }).fill('Renault');
    await home.getByLabel('Model', { exact: true }).fill('Symbol');
    await home.getByLabel('Colour', { exact: true }).fill('Grey');
    await home.getByRole('button', { name: 'Activate the sticker' }).click();
    await expect(home).toHaveURL(/\/en\/dashboard\?activated=/, { timeout: 60_000 });
    await home.close();

    const { street, page } = await send(browser, tagId, INSULT);
    await expect(page.getByText('Your message contains insults or threats. Please rephrase it so it can be sent.')).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByLabel('Anything to add? (optional)')).toHaveValue(INSULT);

    await page.getByLabel('Anything to add? (optional)').fill('7arrek tomobiltek 3afak');
    await page.getByRole('button', { name: 'Send to the owner' }).click();
    await expect(page.getByRole('heading', { name: 'Message sent' })).toBeVisible({ timeout: 60_000 });
    await street.close();
  });

  test('the admin sees what was stopped, delivers it, and the owner receives it', async ({ browser }) => {
    test.setTimeout(120_000);
    const office = await adminContext(browser);
    const admin = await office.newPage();
    await admin.goto('/en/admin/blocked');
    // Usage: the check is on, and today counts at least this test's two messages, one stopped.
    const usage = admin.getByRole('region', { name: 'Gemini usage' });
    await expect(usage).toContainText('Check on');
    const today = usage.locator('div', { hasText: /^Today/ }).first();
    await expect(today).not.toContainText('0 checks');
    await expect(today).not.toContainText(/^Today0 stopped/);

    const entry = admin.locator('li').filter({ hasText: INSULT });
    await expect(entry).toContainText('Reason: Insulte (e2e).');
    await expect(entry).toContainText('0550 00 11 22');

    await entry.locator('summary', { hasText: 'Deliver to the owner' }).click();
    await expect(entry).toContainText(`sent to the owner of ${tagId}`);
    await entry.getByRole('button', { name: 'Yes, deliver' }).click();
    await expect(admin.getByRole('status')).toHaveText('Message delivered to the owner.');
    await expect(admin.locator('li').filter({ hasText: INSULT })).toHaveCount(0);
    await office.close();

    const home = await owner.newPage();
    await home.goto('/en/dashboard');
    await expect(home.getByRole('region', { name: 'Messages' })).toContainText(INSULT);
    await home.close();
  });

  test('a stopped message can be removed from the list', async ({ browser }) => {
    test.setTimeout(120_000);
    const text = `ya kelb ${run}`;
    const { street, page } = await send(browser, tagId, text);
    await expect(page.getByText('Your message contains insults or threats.', { exact: false })).toBeVisible({ timeout: 60_000 });
    await street.close();

    const office = await adminContext(browser);
    const admin = await office.newPage();
    await admin.goto('/en/admin/blocked');
    const entry = admin.locator('li').filter({ hasText: text });
    await entry.locator('summary', { hasText: /^Delete$/ }).click();
    await entry.getByRole('button', { name: 'Yes, delete' }).click();
    await expect(admin.getByRole('status')).toHaveText('Message removed from the list.');
    await expect(admin.locator('li').filter({ hasText: text })).toHaveCount(0);
    await office.close();
  });
});
