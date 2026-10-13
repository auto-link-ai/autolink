import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { hasAdminCredentials } from './adminSession';
import { createOwner, editCar, formatPhone, freshClient, signIn, type Owner } from './owner';

/**
 * The whole point of the product: a stranger scans a sticker on a car, writes
 * to the owner, and the owner hears about it — without either of them seeing
 * the other's details.
 */

const PLATE = '12345-116-16';
const REPORT = 'Your lights are still on, level -2 of the car park.';
const SENDER_CONTACT = '0770 11 22 33';

/** The owner, made by the first test: their number and PIN sign in for the rest. */
let owner: Owner;

/**
 * One sign-in for the whole file. The owner login limiter allows 10 an hour,
 * and a spec that signs in for every test spends them on nothing.
 */
let ownerSession: BrowserContext | null = null;

async function ownerPage(browser: Browser): Promise<Page> {
  if (!ownerSession) {
    // Granted up front: Chromium answers the permission request instead of
    // silently leaving it at "default", which no test could then explain.
    ownerSession = await freshClient(browser, { permissions: ['notifications'] });
    const page = await ownerSession.newPage();
    await signIn(page, owner.phone, owner.pin);
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

  test.afterAll(async () => {
    await ownerSession?.close();
    ownerSession = null;
  });

  test('an owner activates a sticker', async ({ browser }) => {
    test.setTimeout(180_000);
    const home = await freshClient(browser);
    const page = await home.newPage();
    owner = await createOwner(page, { firstName: 'Amine', lastName: 'Belkacem', brand: 'Peugeot', model: '208' });
    // What activation does not ask: the colour strangers may see, the plate they never do.
    await editCar(page, owner.tagId, { colour: 'Blue', plate: PLATE });
    await home.close();
  });

  test('a stranger scans it and writes, seeing nothing about the owner', async ({ browser }) => {
    test.setTimeout(180_000);
    // A clean context: no account, no session, exactly like a passer-by.
    const street = await browser.newContext();
    const page = await street.newPage();

    const response = await page.goto(`/t/${owner.tagId}`);
    expect(response?.status()).toBe(200);
    // The car, because the owner chose to show it.
    await expect(page.getByText('Peugeot 208 · Blue')).toBeVisible();

    // Nothing that belongs to the owner.
    const shown = await page.locator('body').innerText();
    for (const secret of [owner.phone, formatPhone(owner.phone), owner.firstName, owner.lastName, PLATE]) {
      expect(shown, secret).not.toContain(secret);
    }

    await page.getByRole('radio', { name: 'Lights are on' }).check();
    await page.getByLabel('Anything to add? (optional)').fill(REPORT);
    await page.getByLabel('Your contact (optional)').fill(SENDER_CONTACT);
    await page.getByRole('button', { name: 'Send to the owner' }).click();

    await expect(page.getByRole('heading', { name: 'Message sent' })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('Your number was not shared.')).toBeVisible();
    await street.close();
  });

  test('one tap is a complete report: no words needed', async ({ browser }) => {
    test.setTimeout(120_000);
    const street = await browser.newContext();
    const page = await street.newPage();
    await page.goto(`/t/${owner.tagId}`);
    await page.getByRole('radio', { name: 'Blocking access' }).check();
    await page.getByRole('button', { name: 'Send to the owner' }).click();
    await expect(page.getByRole('heading', { name: 'Message sent' })).toBeVisible({ timeout: 60_000 });
    await street.close();
  });

  test('the owner reads it on the dashboard', async ({ browser }) => {
    test.setTimeout(180_000);
    const page = await ownerPage(browser);

    const inbox = page.getByRole('region', { name: 'Messages' });
    await expect(inbox.getByText(REPORT)).toBeVisible();
    await expect(inbox.getByText(SENDER_CONTACT)).toBeVisible();
    await expect(inbox.getByText(owner.tagId, { exact: true }).first()).toBeVisible();
    // The one-tap report arrives too, its category standing in for the words.
    await expect(inbox.getByRole('heading', { name: 'Blocking access' })).toBeVisible();
    await expect(page.getByText('2 unread').first()).toBeVisible();
    // And the header says so on every page, not only here.
    await expect(page.getByRole('banner').getByRole('link', { name: /Messages/ })).toContainText('2');

    await inbox.getByRole('button', { name: 'Mark as read' }).first().click();
    await expect(page.getByRole('status')).toHaveText('Change saved.');
    await expect(page.getByText('1 unread').first()).toBeVisible();
  });

  test('a browser that already allowed notifications is switched on at sign-in, without a tap', async ({ browser }) => {
    test.setTimeout(180_000);
    // This context granted the permission up front, as an earlier "Allow" would
    // have. (The notification tests need WEB_PUSH_* keys; `next dev` reads .env.)
    const page = await ownerPage(browser);

    // Automated Chrome cannot reach a real push service, so linking may
    // legitimately fail here. What must hold either way: no tap was needed, the
    // owner is told, and the page keeps working. Delivery is checked by hand.
    await expect(
      page.getByText(/Notifications are on in this browser\.|Could not turn them on\./),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('region', { name: 'Messages' })).toBeVisible();
  });

  test('a browser that has not answered yet is asked, for this website only', async ({ browser }) => {
    test.setTimeout(180_000);
    await ownerPage(browser);
    // Same account, fresh browser: no permission granted, none refused.
    const fresh = await browser.newContext({ storageState: await ownerSession!.storageState() });
    const page = await fresh.newPage();
    await page.goto('/en/dashboard');

    const panel = page.getByRole('region', { name: 'Know straight away' });
    await expect(panel).toBeVisible({ timeout: 60_000 });
    await expect(panel).toContainText('only for this website');
    await expect(panel.getByRole('button', { name: 'Turn on notifications' })).toBeEnabled();
    await fresh.close();
  });

  test('an iPhone in Safari is shown how to add AutoLink to the Home Screen', async ({ browser }) => {
    test.setTimeout(180_000);
    await ownerPage(browser);
    const iphone = await browser.newContext({
      storageState: await ownerSession!.storageState(),
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    });
    const page = await iphone.newPage();
    await page.goto('/en/dashboard');

    const panel = page.getByRole('region', { name: 'Know straight away' });
    await expect(panel).toContainText('“Add to Home Screen”', { timeout: 60_000 });
    // Nothing to tap that could not work there.
    await expect(panel.getByRole('button')).toHaveCount(0);
    await iphone.close();
  });

  test('a switched-off sticker looks exactly like one that never existed', async ({ browser }) => {
    test.setTimeout(180_000);
    const dashboard = await ownerPage(browser);
    // It asks first: switching off makes the owner unreachable.
    await dashboard.locator('summary', { hasText: 'Switch off' }).click();
    await expect(dashboard.getByText('cannot write to you')).toBeVisible();
    await dashboard.getByRole('button', { name: 'Yes, switch it off' }).click();
    await expect(dashboard.getByRole('status')).toHaveText('Change saved.');

    const street = await browser.newContext();
    const page = await street.newPage();
    const off = await page.goto(`/t/${owner.tagId}`);
    const offText = await page.locator('main').innerText();
    const unknown = await page.goto('/t/AUT-ZZZZZZZZ');
    const unknownText = await page.locator('main').innerText();

    expect(off?.status()).toBe(404);
    expect(unknown?.status()).toBe(404);
    expect(offText).toBe(unknownText);
    await street.close();
  });
});
