import { readFile } from 'node:fs/promises';
import { expect, test, type BrowserContext } from '@playwright/test';
import JSZip from 'jszip';
import { addSticker, chooseCar, createOwner, editCar, freshClient } from './owner';

const CANNOT_ACTIVATE = "This sticker can't be activated: it already is, or the ID is wrong.";

// ---- Public pages: no database writes -------------------------------------------------

test('an account starts with a sticker: the old sign-up address leads to activation', async ({ page }) => {
  await page.goto('/en/register');
  await expect(page).toHaveURL(/\/en\/activate$/);
  await expect(page.getByLabel('Sticker id')).toBeVisible();
});

test('the dashboard is closed to strangers', async ({ page }) => {
  await page.goto('/en/dashboard');
  await expect(page).toHaveURL(/\/en\/login\?next=/);
});

test('account pages are never indexed', async ({ page }) => {
  for (const path of ['/en/login', '/en/forgot-pin', '/en/activate']) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  }
});

test('a sticker that cannot be activated says so, scanned or typed by hand', async ({ page }) => {
  await page.goto('/en/activate?t=AUT-7K3M9QXZ');
  await expect(page.getByRole('alert').filter({ hasText: CANNOT_ACTIVATE })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Get my code on WhatsApp' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Try another ID' }).click();
  await page.getByLabel('Sticker id').fill('aut-zzzz zzzz');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('alert').filter({ hasText: CANNOT_ACTIVATE })).toBeVisible();
});

// ---- The gate: needs a disposable database and an admin account -----------------------

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test.describe('activating a sticker: scan it, say who you are, it is yours', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.',
  );
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  const tags: string[] = [];
  /** A second owner, signed in, who tries to take the first one's sticker. */
  let other: BrowserContext;
  test.afterAll(async () => other?.close());

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

  test('scanned out of the box, a sticker opens its activation; then its owner sees their car, anyone else the message form', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const context = await freshClient(browser);
    const page = await context.newPage();

    // Nobody can write to a sticker that has no owner yet: it opens its activation instead.
    await page.goto(`/t/${tags[0]}`);
    await expect(page).toHaveURL(new RegExp(`/en/activate\\?t=${tags[0]}$`));
    await expect(page.getByRole('button', { name: 'Send to the owner' })).toHaveCount(0);
    await createOwner(page, { tagId: tags[0], brand: 'Peugeot', model: '208' });

    await expect(page.getByRole('heading', { name: 'Peugeot 208' })).toBeVisible();
    await expect(page.getByText('Active', { exact: true })).toBeVisible();
    // The plate is the owner's business: kept, but not part of the card.
    await editCar(page, tags[0]!, { plate: '12345-116-16' });
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

  test('signed in, the next sticker only asks which car — scanned, or its id typed by hand', async ({ browser }) => {
    test.setTimeout(240_000);
    other = await freshClient(browser);
    const page = await other.newPage();
    await createOwner(page, { firstName: 'Yasmine' });

    await addSticker(page, tags[1]!, { brand: 'Dacia', model: 'Logan' });
    // A camera that will not scan: the id printed under the QR, typed any old way.
    await page.goto('/en/activate');
    await page.getByLabel('Sticker id').fill(tags[2]!.toLowerCase().replace('-', ' '));
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText(tags[2]!)).toBeVisible();
    await chooseCar(page, { brand: 'Kia', model: 'Picanto' });
    await page.getByRole('button', { name: 'Activate this sticker' }).click();
    await expect(page.getByRole('heading', { name: "It's activated: your Kia Picanto can now be reached." })).toBeVisible({
      timeout: 60_000,
    });

    await page.getByRole('link', { name: 'See my messages' }).click();
    for (const id of [tags[1]!, tags[2]!]) await expect(page.getByText(id).first()).toBeVisible();
    await page.close();
  });

  test('a sticker someone activated cannot be taken: it answers like one that never existed', async () => {
    const page = await other.newPage();
    // Someone else's sticker shows its message form, never a way to take it…
    await page.goto(`/t/${tags[0]}`);
    await expect(page.getByRole('button', { name: 'Send to the owner' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Activate this sticker' })).toHaveCount(0);
    // …and asked for directly, it gets the same answer as a sticker that never existed.
    await page.goto(`/en/activate?t=${tags[0]}`);
    await expect(page.getByRole('alert').filter({ hasText: CANNOT_ACTIVATE })).toBeVisible();
    const taken = await page.locator('main').innerText();
    await page.goto('/en/activate?t=AUT-ZZZZZZZZ');
    expect(await page.locator('main').innerText()).toBe(taken);

    await page.goto('/en/dashboard');
    await expect(page.getByText(tags[0]!)).toHaveCount(0);
    await page.close();
  });
});
