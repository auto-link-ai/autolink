import { readFile } from 'node:fs/promises';
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { adminContext, hasAdminCredentials } from './adminSession';

/**
 * The whole point of the product: a stranger scans a sticker on a car, writes
 * to the owner, and the owner hears about it — without either of them seeing
 * the other's details.
 */

const run = Date.now().toString(36);
const OWNER_EMAIL = `e2e-scan-${run}@example.dz`;
const OWNER_PASSWORD = 'e2e-scanner-password';
const OWNER_NAME = 'Amine Belkacem';
const OWNER_PHONE = '0551234567';
const PLATE = '12345-116-16';
const REPORT = 'Your lights are still on, level -2 of the car park.';
const SENDER_CONTACT = '0770 11 22 33';

/**
 * One sign-in for the whole file. The owner login limiter allows 10 an hour,
 * and a spec that signs in for every test spends them on nothing.
 */
let ownerSession: BrowserContext | null = null;

async function ownerPage(browser: Browser): Promise<Page> {
  if (!ownerSession) {
    // Granted up front: Chromium answers the permission request instead of
    // silently leaving it at "default", which no test could then explain.
    ownerSession = await browser.newContext({ permissions: ['notifications'] });
    const page = await ownerSession.newPage();
    await page.goto('/en/login');
    await page.getByLabel('Email').fill(OWNER_EMAIL);
    await page.getByLabel('Password').fill(OWNER_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/en\/dashboard/, { timeout: 60_000 });
    return page;
  }
  const page = await ownerSession.newPage();
  await page.goto('/en/dashboard');
  return page;
}

test.describe('scanning a sticker', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.');
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  let tag = { id: '', code: '' };

  test.afterAll(async () => {
    await ownerSession?.close();
    ownerSession = null;
  });

  test('an owner activates a sticker', async ({ browser }) => {
    test.setTimeout(180_000);
    const office = await adminContext(browser);
    const admin = await office.newPage();
    await admin.goto('/en/admin/tags');
    await admin.getByLabel('Batch name').fill('E2E scanner');
    await admin.getByLabel('Quantity').fill('1');
    const download = admin.waitForEvent('download');
    await admin.getByRole('button', { name: 'Generate and download' }).click();
    const zip = await JSZip.loadAsync(await readFile((await (await download).path())!));
    const [id, code] = (await zip.file('tags.csv')!.async('string')).split('\r\n')[1]!.split(',');
    tag = { id: id!, code: code! };
    await office.close();

    const home = await browser.newContext();
    const owner = await home.newPage();
    await owner.goto('/en/register');
    await owner.getByLabel('Full name').fill(OWNER_NAME);
    await owner.getByLabel('Email').fill(OWNER_EMAIL);
    await owner.getByLabel('Phone (optional)').fill(OWNER_PHONE);
    await owner.getByLabel('Password').fill(OWNER_PASSWORD);
    await owner.getByRole('button', { name: 'Create my account' }).click();
    await expect(owner).toHaveURL(/\/en\/dashboard/, { timeout: 60_000 });

    await owner.goto(`/en/activate?t=${tag.id}&c=${tag.code}`);
    await owner.getByLabel('Make', { exact: true }).fill('Peugeot');
    await owner.getByLabel('Model', { exact: true }).fill('208');
    await owner.getByLabel('Colour', { exact: true }).fill('Blue');
    await owner.getByLabel('Plate (optional)').fill(PLATE);
    await owner.getByRole('button', { name: 'Activate the sticker' }).click();
    await expect(owner).toHaveURL(/\/en\/dashboard\?activated=/, { timeout: 60_000 });
    await home.close();
  });

  test('a stranger scans it and writes, seeing nothing about the owner', async ({ browser }) => {
    test.setTimeout(180_000);
    // A clean context: no account, no session, exactly like a passer-by.
    const street = await browser.newContext();
    const page = await street.newPage();

    const response = await page.goto(`/t/${tag.id}`);
    expect(response?.status()).toBe(200);
    // The car, because the owner chose to show it.
    await expect(page.getByText('Peugeot 208 · Blue')).toBeVisible();

    // Nothing that belongs to the owner.
    const shown = await page.locator('body').innerText();
    for (const secret of [OWNER_EMAIL, OWNER_PHONE, OWNER_NAME, PLATE]) {
      expect(shown, secret).not.toContain(secret);
    }

    await page.getByRole('radio', { name: 'Lights are on' }).check();
    await page.getByLabel('Your message').fill(REPORT);
    await page.getByLabel('Your contact (optional)').fill(SENDER_CONTACT);
    await page.getByRole('button', { name: 'Send to the owner' }).click();

    await expect(page.getByRole('heading', { name: 'Message sent' })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('Your number was not shared.')).toBeVisible();
    await street.close();
  });

  test('the owner reads it on the dashboard', async ({ browser }) => {
    test.setTimeout(180_000);
    const page = await ownerPage(browser);

    const inbox = page.getByRole('region', { name: 'Messages' });
    await expect(inbox.getByText(REPORT)).toBeVisible();
    await expect(inbox.getByText(SENDER_CONTACT)).toBeVisible();
    await expect(inbox.getByText(`Received through ${tag.id}`)).toBeVisible();
    await expect(page.getByText('1 unread').first()).toBeVisible();

    await inbox.getByRole('button', { name: 'Mark as read' }).click();
    await expect(page.getByRole('status')).toHaveText('Change saved.');
    await expect(page.getByText('1 unread')).toHaveCount(0);
  });

  test('the owner is offered notifications, and a refusal is explained', async ({ browser }) => {
    test.setTimeout(180_000);
    // Chromium grants the permission instead of prompting.
    const page = await ownerPage(browser);

    const enable = page.getByRole('button', { name: 'Turn on notifications' });
    if ((await enable.count()) === 0) {
      // No VAPID keys configured here: the offer is withheld rather than broken.
      await expect(page.getByText('Know straight away')).toHaveCount(0);
      return;
    }

    await expect(page.getByText('Know straight away')).toBeVisible();
    await enable.click();

    // Automated Chrome cannot reach a real push service, so a subscription may
    // legitimately fail here. What must hold either way: the owner is told, and
    // the page keeps working. Delivery to a real phone is checked by hand.
    await expect(
      page.getByText(/Notifications are on for this device\.|Could not turn them on\./),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('region', { name: 'Messages' })).toBeVisible();
  });

  test('a switched-off sticker looks exactly like one that never existed', async ({ browser }) => {
    test.setTimeout(180_000);
    const owner = await ownerPage(browser);
    await owner.getByRole('button', { name: 'Switch off' }).click();
    await expect(owner.getByRole('status')).toHaveText('Change saved.');

    const street = await browser.newContext();
    const page = await street.newPage();
    const off = await page.goto(`/t/${tag.id}`);
    const offText = await page.locator('main').innerText();
    const unknown = await page.goto('/t/AUT-ZZZZZZZZ');
    const unknownText = await page.locator('main').innerText();

    expect(off?.status()).toBe(404);
    expect(unknown?.status()).toBe(404);
    expect(offText).toBe(unknownText);
    await street.close();
  });
});
