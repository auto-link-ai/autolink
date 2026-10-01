import { readFile } from 'node:fs/promises';
import { expect, test, type Browser, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { describeCar, linkSticker } from './linkSticker';

// ---- Public pages: no database writes -------------------------------------------------

test('linking asks you to sign in first, and remembers the sticker', async ({ page }) => {
  await page.goto('/en/activate?t=AUT-7K3M9QXZ');
  await expect(page).toHaveURL(/\/en\/login\?next=/);
  const next = decodeURIComponent(new URL(page.url()).searchParams.get('next') ?? '');
  expect(next).toBe('/en/activate?t=AUT-7K3M9QXZ');
});

test('the dashboard is closed to strangers', async ({ page }) => {
  await page.goto('/en/dashboard');
  await expect(page).toHaveURL(/\/en\/login\?next=/);
});

test('account pages are never indexed', async ({ page }) => {
  for (const path of ['/en/login', '/en/register']) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  }
});

// ---- The gate: needs a disposable database and an admin account -----------------------

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

const PASSWORD = 'e2e-activation-pass';
const run = Date.now().toString(36);
const customer = (n: number) => `e2e-owner-${run}-${n}@example.dz`;

const CANNOT_LINK = "This sticker can't be linked: it's already activated on an account, or the id is wrong.";

let address = 0;
function freshClient(browser: Browser) {
  address++;
  return browser.newContext({ extraHTTPHeaders: { 'x-forwarded-for': `198.51.100.${(Date.now() + address) % 250}` } });
}

async function fillRegistration(page: Page, email: string) {
  await page.getByLabel('Full name').fill('Amine Belkacem');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('WhatsApp number').fill('0551 23 45 67');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create my account' }).click();
}

test.describe('linking a sticker: scan it, sign in, it is yours', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.',
  );
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  const tags: string[] = [];

  test('a batch ships one QR per sticker, holding its public address only', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/en/admin/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL!);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/en\/admin\/(tags|orders)$/, { timeout: 60_000 });

    await page.goto('/en/admin/tags');
    await page.getByLabel('Batch name').fill('E2E activation');
    await page.getByLabel('Quantity').fill('3');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Generate and download' }).click();
    const zip = await JSZip.loadAsync(await readFile((await (await download).path())!));

    for (const line of (await zip.file('tags.csv')!.async('string')).trim().split('\r\n').slice(1)) {
      tags.push(line.split(',')[0]!);
    }
    expect(tags).toHaveLength(3);
    for (const id of tags) {
      expect(id).toMatch(/^AUT-[0-9A-HJKMNP-TV-Z]{8}$/);
      expect(zip.file(`qr/${id}.svg`)).not.toBeNull();
    }
  });

  test('scanned out of the box, a new sticker offers to link it; creating the account links it', async ({ browser }) => {
    test.setTimeout(180_000);
    const context = await freshClient(browser);
    const page = await context.newPage();

    await page.goto(`/t/${tags[0]}`);
    await expect(page.getByRole('heading', { name: "This sticker isn't activated yet." })).toBeVisible();
    // Nobody can write to a sticker that has no owner yet.
    await expect(page.getByRole('button', { name: 'Send to the owner' })).toHaveCount(0);

    await page.getByRole('link', { name: 'Create my account' }).click();
    await expect(page).toHaveURL(/\/en\/register\?next=/);
    await expect(page.getByText('This sticker will be linked to your account')).toBeVisible();
    await expect(page.getByText(tags[0]!).first()).toBeVisible();
    await fillRegistration(page, customer(1));

    // Linked on the way: straight to the dashboard, which asks for the car.
    await expect(page).toHaveURL(new RegExp(`/en/dashboard\\?activated=${tags[0]}$`), { timeout: 60_000 });
    await expect(page.getByText(`Sticker ${tags[0]} activated! Now add your car below.`)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your car', exact: true })).toBeVisible();
    await describeCar(page, tags[0]!, { make: 'Peugeot', model: '208', colour: 'Blue', plate: '12345-116-16' });
    await expect(page.getByRole('heading', { name: /^Peugeot 208/ })).toBeVisible();
    await expect(page.getByText('Active', { exact: true })).toBeVisible();
    // The plate is the owner's business; it is not part of the card.
    await expect(page.locator('h3', { hasText: '12345-116-16' })).toHaveCount(0);

    // Scanned again by its owner: their car. By anyone else: the message form.
    await page.goto(`/t/${tags[0]}`);
    await expect(page.getByRole('heading', { name: 'This is your car' })).toBeVisible();
    const stranger = await freshClient(browser);
    const street = await stranger.newPage();
    await street.goto(`/t/${tags[0]}`);
    await expect(street.getByRole('button', { name: 'Send to the owner' })).toBeVisible();
    await stranger.close();
    await context.close();
  });

  test('signed in, one tap links a new sticker — and a linked one cannot be taken', async ({ browser }) => {
    test.setTimeout(180_000);
    const context = await freshClient(browser);
    const page = await context.newPage();
    await page.goto('/en/register');
    await fillRegistration(page, customer(2));
    await expect(page.getByRole('heading', { name: 'No stickers yet' })).toBeVisible({ timeout: 60_000 });

    await linkSticker(page, tags[1]!);
    await expect(page.getByRole('region', { name: 'Add your car' })).toBeVisible();

    // Someone else's sticker shows its message form, never a way to take it…
    await page.goto(`/t/${tags[0]}`);
    await expect(page.getByRole('button', { name: 'Link this sticker to my account' })).toHaveCount(0);
    // …and asking for it directly gets the same answer as a sticker that never existed.
    await page.goto(`/en/activate?t=${tags[0]}`);
    await page.getByRole('button', { name: 'Link this sticker to my account' }).click();
    await expect(page.getByRole('alert').filter({ hasText: CANNOT_LINK })).toBeVisible();
    await page.goto('/en/activate');
    await page.getByLabel('Sticker id').fill('AUT-ZZZZZZZZ');
    await page.getByRole('button', { name: 'Link this sticker to my account' }).click();
    await expect(page.getByRole('alert').filter({ hasText: CANNOT_LINK })).toBeVisible();

    await page.goto('/en/dashboard');
    await expect(page.getByText(tags[1]!).first()).toBeVisible();
    await expect(page.getByText(tags[0]!)).toHaveCount(0);
    await context.close();
  });

  test('signing in to an existing account from the scan links it too', async ({ browser }) => {
    test.setTimeout(180_000);
    const context = await freshClient(browser);
    const page = await context.newPage();
    await page.goto(`/t/${tags[2]}`);
    await page.getByRole('link', { name: 'I already have an account' }).click();
    await expect(page.getByText('One step left to activate your sticker')).toBeVisible();
    await page.getByLabel('Email').fill(customer(2));
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(new RegExp(`/en/dashboard\\?activated=${tags[2]}$`), { timeout: 60_000 });
    await context.close();
  });
});
