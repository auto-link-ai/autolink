import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import JSZip from 'jszip';

// ---- Public pages: no database writes -------------------------------------------------

test('activation asks you to sign in first, and remembers the claim link', async ({ page }) => {
  await page.goto('/en/activate?t=AUT-7K3M9QXZ&c=ABCD-EFGH-JK');
  await expect(page).toHaveURL(/\/en\/login\?next=/);
  // The tag and code survive the round trip, so the customer does not retype them.
  const next = decodeURIComponent(new URL(page.url()).searchParams.get('next') ?? '');
  expect(next).toBe('/en/activate?t=AUT-7K3M9QXZ&c=ABCD-EFGH-JK');
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

const WRONG_ANSWER = 'Wrong sticker id or code.';

/** The form's own message, not Next's route announcer (also role=alert). */
const formAlert = (page: Page) => page.locator('form p[role="alert"]');

async function register(page: Page, email: string) {
  await page.goto('/en/register');
  await page.getByLabel('Full name').fill('Amine Belkacem');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create my account' }).click();
  await expect(page).toHaveURL(/\/en\/dashboard/, { timeout: 60_000 });
}

async function tryActivate(page: Page, tagId: string, code: string) {
  await page.goto(`/en/activate?t=${tagId}&c=${code}`);
  await page.getByLabel('Make', { exact: true }).fill('Peugeot');
  await page.getByLabel('Model', { exact: true }).fill('208');
  await page.getByLabel('Colour', { exact: true }).fill('Blue');
  await page.getByRole('button', { name: 'Activate the sticker' }).click();
}

test.describe('claiming a sticker end to end', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.',
  );
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  const tags: { id: string; code: string }[] = [];

  test('a batch ships a public QR and a separate claim QR per tag', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/en/admin/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL!);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/en\/admin\/(tags|orders)$/, { timeout: 60_000 });

    await page.goto('/en/admin/tags');
    await page.getByLabel('Batch name').fill('E2E activation');
    await page.getByLabel('Quantity').fill('2');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Generate and download' }).click();
    const zip = await JSZip.loadAsync(await readFile((await (await download).path())!));

    for (const line of (await zip.file('tags.csv')!.async('string')).split('\r\n').slice(1)) {
      const [id, code] = line.split(',');
      if (id && code) tags.push({ id, code });
    }
    expect(tags).toHaveLength(2);
    expect(tags[0]!.id).toMatch(/^AUT-[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(tags[0]!.code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{2}$/);

    // One claim image per tag, and the code never reaches the QR that goes on the car.
    for (const tag of tags) {
      expect(zip.file(`claim/${tag.id}.png`)).not.toBeNull();
      const svg = await zip.file(`qr/${tag.id}.svg`)!.async('string');
      expect(svg).not.toContain(tag.code.slice(0, 4));
    }
  });

  test('a customer registers, claims a sticker and sees it on the dashboard', async ({ browser }) => {
    test.setTimeout(180_000);
    const context = await browser.newContext();
    const page = await context.newPage();

    await register(page, customer(1));
    await expect(page.getByRole('heading', { name: 'No stickers yet' })).toBeVisible();

    const tag = tags[0]!;
    await page.goto(`/en/activate?t=${tag.id}&c=${tag.code}`);
    // The claim link fills both values in, so the customer only describes the car.
    await expect(page.getByLabel('Sticker id')).toHaveValue(tag.id);
    await expect(page.getByLabel('Activation code')).toHaveValue(tag.code);
    await page.getByLabel('Make', { exact: true }).fill('Peugeot');
    await page.getByLabel('Model', { exact: true }).fill('208');
    await page.getByLabel('Colour', { exact: true }).fill('Blue');
    await page.getByLabel('Plate (optional)').fill('12345-116-16');
    await page.getByRole('button', { name: 'Activate the sticker' }).click();

    await expect(page).toHaveURL(new RegExp(`/en/dashboard\\?activated=${tag.id}`), { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: 'Peugeot 208' })).toBeVisible();
    await expect(page.getByText(tag.id).first()).toBeVisible();
    await expect(page.getByText('Active', { exact: true })).toBeVisible();
    // The plate is the owner's business; it is not part of the card.
    await expect(page.getByText('12345-116-16')).toHaveCount(0);

    // The same code cannot be used twice, not even by the account that owns it.
    await tryActivate(page, tag.id, tag.code);
    await expect(formAlert(page)).toHaveText(WRONG_ANSWER);

    await context.close();
  });

  test('another account sees nothing, and a locked sticker looks like an unknown one', async ({ browser }) => {
    test.setTimeout(240_000);
    const context = await browser.newContext();
    const page = await context.newPage();

    await register(page, customer(2));
    await expect(page.getByRole('heading', { name: 'No stickers yet' })).toBeVisible();
    await expect(page.getByText(tags[0]!.id)).toHaveCount(0);

    // Someone else's sticker answers exactly like a sticker that never existed.
    await tryActivate(page, tags[0]!.id, tags[0]!.code);
    await expect(formAlert(page)).toHaveText(WRONG_ANSWER);
    await tryActivate(page, 'AUT-ZZZZZZZZ', 'ZZZZ-ZZZZ-ZZ');
    await expect(formAlert(page)).toHaveText(WRONG_ANSWER);

    // Five wrong codes lock the second sticker for a day...
    const target = tags[1]!;
    for (let attempt = 1; attempt <= 5; attempt++) {
      await tryActivate(page, target.id, `ZZZZ-ZZZZ-Z${attempt}`);
      await expect(formAlert(page)).toHaveText(WRONG_ANSWER);
    }
    // ...so even the right code is refused now, and the dashboard stays empty.
    await tryActivate(page, target.id, target.code);
    await expect(formAlert(page)).toHaveText('Too many attempts on this sticker. Try again in 24 hours.');

    await page.goto('/en/dashboard');
    await expect(page.getByRole('heading', { name: 'No stickers yet' })).toBeVisible();
    await context.close();
  });
});
