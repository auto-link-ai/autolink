import { readFile } from 'node:fs/promises';
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { adminContext, hasAdminCredentials } from './adminSession';

/**
 * The owner's private car book: filled in from the dashboard, opened by
 * scanning their own sticker — and invisible to everyone else.
 */

const run = Date.now().toString(36);
const OWNER = { email: `e2e-book-${run}@example.dz`, password: 'e2e-car-book-password' };
const OTHER = { email: `e2e-book-other-${run}@example.dz`, password: 'e2e-car-book-other-pw' };
/** Words that exist only in this owner's car book. None may reach anyone else. */
const PRIVATE = { oil: 'Quartz 9000 5W-30', insurer: 'Assurances Tassili', notes: 'Spare key with my brother' };

/** A calendar day `days` from now, as a date input wants it. */
function inDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

let address = 0;
function freshClient(browser: Browser) {
  address++;
  return browser.newContext({ extraHTTPHeaders: { 'x-forwarded-for': `198.51.100.${(Date.now() + address) % 250}` } });
}

async function register(browser: Browser, who: { email: string; password: string }): Promise<BrowserContext> {
  const context = await freshClient(browser);
  const page = await context.newPage();
  await page.goto('/en/register');
  await page.getByLabel('Full name').fill('Karim Meziane');
  await page.getByLabel('Email').fill(who.email);
  await page.getByLabel('Password').fill(who.password);
  await page.getByRole('button', { name: 'Create my account' }).click();
  await expect(page).toHaveURL(/\/en\/dashboard/, { timeout: 60_000 });
  await page.close();
  return context;
}

async function expectNothingPrivate(page: Page) {
  const text = await page.locator('body').innerText();
  for (const word of [...Object.values(PRIVATE), 'This is your car', 'Car book']) expect(text).not.toContain(word);
}

test.describe('the car book', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.');
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  let owner: BrowserContext;
  let tagId = '';
  test.afterAll(async () => owner?.close());

  test('an owner opens the car book from their sticker', async ({ browser }) => {
    test.setTimeout(180_000);
    const office = await adminContext(browser);
    const admin = await office.newPage();
    await admin.goto('/en/admin/tags');
    await admin.getByLabel('Batch name').fill('E2E car book');
    await admin.getByLabel('Quantity').fill('1');
    const download = admin.waitForEvent('download');
    await admin.getByRole('button', { name: 'Generate and download' }).click();
    const zip = await JSZip.loadAsync(await readFile((await (await download).path())!));
    const [id, code] = (await zip.file('tags.csv')!.async('string')).split('\r\n')[1]!.split(',');
    tagId = id!;
    await office.close();

    owner = await register(browser, OWNER);
    const page = await owner.newPage();
    await page.goto(`/en/activate?t=${tagId}&c=${code}`);
    await page.getByLabel('Make', { exact: true }).fill('Renault');
    await page.getByLabel('Model', { exact: true }).fill('Clio');
    await page.getByLabel('Colour', { exact: true }).fill('Grey');
    await page.getByRole('button', { name: 'Activate the sticker' }).click();
    await expect(page).toHaveURL(/\/en\/dashboard\?activated=/, { timeout: 60_000 });

    await page.getByRole('link', { name: 'My car book' }).click();
    await expect(page).toHaveURL(new RegExp(`/en/dashboard/car/${tagId}$`));
    await expect(page.getByRole('heading', { name: 'Car book', level: 1 })).toBeVisible();
    const due = page.getByRole('region', { name: 'Coming up' });
    await expect(due.getByText('Not set')).toHaveCount(4);
  });

  test('filling it in, and a mistake that keeps what was typed', async () => {
    test.setTimeout(180_000);
    const page = await owner.newPage();
    await page.goto(`/en/dashboard/car/${tagId}`);

    const profile = page.getByRole('region', { name: 'Car profile' });
    await profile.getByLabel('Year').fill('2019');
    await profile.getByLabel('Fuel').selectOption('DIESEL');
    await profile.getByLabel('Chassis number (VIN)').fill('vf1 rb000-1234567');
    await profile.getByRole('button', { name: 'Save' }).click();
    await expect(profile.getByRole('status')).toHaveText('Saved.');

    const oil = page.getByRole('region', { name: 'Oil change (vidange)' });
    await oil.getByLabel('Km at the change').fill('85000');
    await oil.getByLabel('Oil', { exact: true }).fill(PRIVATE.oil);
    await oil.getByLabel('Next change: date').fill(inDays(3));
    await oil.getByLabel('Next change: km').fill('95000');
    await oil.getByRole('button', { name: 'Add' }).click();
    await expect(oil.getByRole('status')).toHaveText('Added.');
    await expect(oil.getByRole('listitem').filter({ hasText: PRIVATE.oil })).toContainText('85 000 km');
    // Ready for the next one.
    await expect(oil.getByLabel('Km at the change')).toHaveValue('');

    await oil.getByLabel('Km at the change').fill('90000');
    await oil.getByLabel('Next change: km').fill('80000');
    await oil.getByRole('button', { name: 'Add' }).click();
    await expect(oil.getByRole('alert')).toContainText('Next change: km — Must be more than the km at the change.');
    await expect(oil.getByLabel('Km at the change')).toHaveValue('90000');

    const insurance = page.getByRole('region', { name: 'Insurance' });
    await insurance.getByLabel('Company').fill(PRIVATE.insurer);
    await insurance.getByLabel('Expiry date').fill(inDays(-10));
    await insurance.getByRole('button', { name: 'Save' }).click();
    await expect(insurance.getByRole('status')).toHaveText('Saved.');

    const repairs = page.getByRole('region', { name: 'Repairs & service' });
    await repairs.getByLabel('What was done').fill('Front brake pads');
    await repairs.getByRole('button', { name: 'Add' }).click();
    await expect(repairs.getByRole('listitem').filter({ hasText: 'Front brake pads' })).toBeVisible();
    // Deleting asks first.
    const entry = repairs.getByRole('listitem').filter({ hasText: 'Front brake pads' });
    await entry.locator('summary', { hasText: 'Delete' }).click();
    await entry.getByRole('button', { name: 'Yes, delete it' }).click();
    await expect(repairs.getByText('Front brake pads')).toHaveCount(0);

    const notes = page.getByRole('region', { name: 'Notes' });
    await notes.getByLabel('Notes').fill(PRIVATE.notes);
    await notes.getByRole('button', { name: 'Save' }).click();
    await expect(notes.getByRole('status')).toHaveText('Saved.');

    // A fresh load: everything was kept, and "Coming up" reflects it.
    await page.reload();
    await expect(page.getByLabel('Chassis number (VIN)')).toHaveValue('VF1RB0001234567');
    const due = page.getByRole('region', { name: 'Coming up' });
    await expect(due.getByRole('listitem').first()).toContainText('Insurance');
    await expect(due.getByRole('listitem').filter({ hasText: 'Insurance' })).toContainText('Overdue');
    await expect(due.getByRole('listitem').filter({ hasText: 'Oil change' })).toContainText('Due soon');

    // The dashboard names the most urgent thing on the sticker's card.
    await page.goto('/en/dashboard');
    await expect(page.getByText(/Insurance: .*days late/)).toBeVisible();
    await page.close();
  });

  test('scanning their own sticker shows the owner their car, not the message form', async () => {
    const page = await owner.newPage();
    await page.goto(`/t/${tagId}`);
    await expect(page.getByRole('heading', { name: 'This is your car', level: 1 })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Coming up' })).toContainText('Overdue');
    await expect(page.getByRole('link', { name: 'Open my car book' })).toHaveAttribute('href', `/en/dashboard/car/${tagId}`);
    await expect(page.locator('textarea')).toHaveCount(0);

    // Exactly what everyone else gets, on request.
    await page.getByRole('link', { name: 'See what others see' }).click();
    await expect(page.getByRole('heading', { name: 'Something wrong with this car?' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send to the owner' })).toBeVisible();
    await expectNothingPrivate(page);
    await page.close();
  });

  test('nobody else sees any of it: not a stranger, not another account', async ({ browser }) => {
    test.setTimeout(180_000);
    const street = await freshClient(browser);
    const stranger = await street.newPage();
    await stranger.goto(`/t/${tagId}`);
    await expect(stranger.getByRole('button', { name: 'Send to the owner' })).toBeVisible();
    await expectNothingPrivate(stranger);
    await street.close();

    const someoneElse = await register(browser, OTHER);
    const page = await someoneElse.newPage();
    await page.goto(`/t/${tagId}`);
    await expect(page.getByRole('button', { name: 'Send to the owner' })).toBeVisible();
    await expectNothingPrivate(page);

    // Their book is a plain 404 — the same as a sticker that does not exist.
    const theirs = await page.goto(`/en/dashboard/car/${tagId}`);
    expect(theirs?.status()).toBe(404);
    const theirsText = await page.locator('main').innerText();
    await expectNothingPrivate(page);
    const unknown = await page.goto('/en/dashboard/car/AUT-00000000');
    expect(unknown?.status()).toBe(404);
    expect(await page.locator('main').innerText()).toBe(theirsText);
    await someoneElse.close();
  });

  test('signing in from the scan page brings the owner back to their car', async ({ browser }) => {
    test.setTimeout(120_000);
    const phone = await freshClient(browser);
    const page = await phone.newPage();
    await page.goto(`/t/${tagId}`);
    await page.getByRole('link', { name: 'Is this your car? Sign in' }).click();
    await page.getByLabel('Email').fill(OWNER.email);
    await page.getByLabel('Password').fill(OWNER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(new RegExp(`/t/${tagId}$`), { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: 'This is your car' })).toBeVisible();
    await phone.close();
  });

  test('the daily reminder job is closed to the public, and finds what is due', async ({ request }) => {
    expect((await request.get('/api/cron/care-reminders')).status()).toBe(401);
    const wrong = await request.get('/api/cron/care-reminders', { headers: { authorization: 'Bearer not-the-secret' } });
    expect(wrong.status()).toBe(401);

    test.skip(!process.env.CRON_SECRET, 'Set CRON_SECRET to run the job itself.');
    const response = await request.get('/api/cron/care-reminders', {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    expect(response.status()).toBe(200);
    const result = (await response.json()) as { due: number; sent: number };
    // At least this owner's oil change (in 3 days) and insurance (late). No
    // notifications are on in this browser, so nothing is marked as sent.
    expect(result.due).toBeGreaterThanOrEqual(2);
    expect(Object.keys(result).sort()).toEqual(['due', 'sent']);
  });
});
