import { readFile } from 'node:fs/promises';
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { adminContext, hasAdminCredentials } from './adminSession';

/**
 * The owner's private car book: an overview, one page per section, read
 * first and edited on request; opened from the menu or by scanning their own
 * sticker — and invisible to everyone else.
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
  // Not 'Car book': it is a menu entry for every signed-in owner. The book's own words are what must not leak.
  for (const word of [...Object.values(PRIVATE), 'This is your car']) expect(text).not.toContain(word);
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

  test('the menu opens the car book: an overview, every section still to fill in', async ({ browser }) => {
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

    // One car: the "Car book" tab goes straight to it.
    await page.getByRole('link', { name: 'Car book', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/en/dashboard/car/${tagId}$`));
    await expect(page.getByRole('heading', { name: 'My car book', level: 1 })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Where you are' })).toContainText('My stickers');

    // The car on top, opening its details; then one card per part, each still to fill in.
    const car = page.getByRole('link', { name: /^Renault Clio/ });
    await expect(car).toContainText('Grey');
    await expect(car).toHaveAttribute('href', `/en/dashboard/car/${tagId}/profile`);
    const sections = page.getByRole('list', { name: 'Everything about the car' }).getByRole('link');
    await expect(sections).toHaveCount(6);
    await expect(sections.filter({ hasText: 'To fill in' })).toHaveCount(5);
    await expect(sections.filter({ hasText: 'Repairs & service' })).toContainText('Nothing logged yet');
    await page.close();
  });

  test('a section never filled in opens on its form, then reads back as plain text', async () => {
    test.setTimeout(120_000);
    const page = await owner.newPage();
    await page.goto(`/en/dashboard/car/${tagId}`);
    await page.getByRole('link', { name: /^Insurance/ }).click();
    await expect(page).toHaveURL(new RegExp(`/car/${tagId}/insurance$`));
    await expect(page.getByRole('heading', { name: 'Insurance', level: 1 })).toBeVisible();

    await page.getByLabel('Company').fill(PRIVATE.insurer);
    await page.getByLabel('Expiry date').fill(inDays(-10));
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page).toHaveURL(/\/insurance\?saved=1$/);
    await expect(page.getByRole('status')).toHaveText('Saved.');
    const expiry = page.locator('dt', { hasText: 'Expiry date' }).locator('xpath=following-sibling::dd');
    await expect(expiry).toContainText('days late');
    await expect(expiry).toContainText('Overdue');
    await expect(page.locator('dt', { hasText: 'Company' }).locator('xpath=following-sibling::dd')).toHaveText(PRIVATE.insurer);
    await expect(page.locator('dt', { hasText: 'Policy number' }).locator('xpath=following-sibling::dd')).toHaveText('Not filled in');

    // Edit shows what is saved; Cancel changes nothing.
    await page.getByRole('link', { name: 'Edit' }).click();
    await expect(page.getByLabel('Company')).toHaveValue(PRIVATE.insurer);
    await page.getByLabel('Company').fill('Something else');
    await page.getByRole('link', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(new RegExp(`/car/${tagId}/insurance$`));
    await expect(page.getByText(PRIVATE.insurer)).toBeVisible();
    await page.close();
  });

  test('logging an oil change: an error sits under its field, and nothing typed is lost', async () => {
    test.setTimeout(120_000);
    const page = await owner.newPage();
    await page.goto(`/en/dashboard/car/${tagId}/oil`);
    await page.getByRole('link', { name: 'Log your first oil change' }).click();

    await page.getByLabel('Km at the change').fill('90 000');
    await page.getByLabel('Oil', { exact: true }).fill(PRIVATE.oil);
    await page.getByLabel('Next change: km').fill('80000');
    await page.getByRole('button', { name: 'Add' }).click();

    const nextKm = page.getByLabel('Next change: km');
    await expect(nextKm).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#care-oil-nextDueKm-error')).toHaveText('Must be more than the km at the change.');
    // Focus goes to the list of what to correct; each item leads to its field.
    await expect(page.locator(':focus')).toContainText('Please correct the fields below:');
    await expect(page.getByRole('link', { name: 'Next change: km — Must be more than the km at the change.' })).toHaveAttribute(
      'href',
      '#care-oil-nextDueKm',
    );
    await expect(page.getByLabel('Km at the change')).toHaveValue('90 000');

    await nextKm.fill('95000');
    await page.getByLabel('Next change: date').fill(inDays(3));
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page).toHaveURL(/\/oil\?added=1$/);
    await expect(page.getByRole('status')).toHaveText('Added.');
    const next = page.locator('dt', { hasText: 'Next oil change' }).locator('xpath=following-sibling::dd');
    await expect(next).toContainText('In 3 days');
    await expect(next).toContainText('95 000 km');
    await expect(next).toContainText('Due soon');
    await expect(page.getByRole('region', { name: 'Past oil changes' })).toContainText(PRIVATE.oil);
    // The delete control says which entry it deletes.
    await expect(page.locator('summary', { hasText: 'Delete' })).toHaveAttribute('aria-label', /^Delete the entry of \d{1,2} \S+ \d{4}$/);
    await page.close();
  });

  test('repairs, the car profile and notes: add, read, delete', async () => {
    test.setTimeout(120_000);
    const page = await owner.newPage();
    await page.goto(`/en/dashboard/car/${tagId}/repairs`);
    await page.getByRole('link', { name: 'Log your first repair' }).click();
    await page.getByLabel('What was done').fill('Front brake pads');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByRole('status')).toHaveText('Added.');
    await page.locator('summary', { hasText: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes, delete it' }).click();
    await expect(page).toHaveURL(/\/repairs\?deleted=1$/);
    await expect(page.getByRole('status')).toHaveText('Entry deleted.');
    await expect(page.getByRole('link', { name: 'Log your first repair' })).toBeVisible();

    await page.goto(`/en/dashboard/car/${tagId}/profile`);
    await page.getByLabel('Year').fill('2019');
    await page.getByLabel('Fuel').selectOption('DIESEL');
    await page.getByLabel('Chassis number (VIN)').fill('vf1 rb000-1234567');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveText('Saved.');
    await expect(page.locator('dt', { hasText: 'Chassis number (VIN)' }).locator('xpath=following-sibling::dd')).toHaveText(
      'VF1RB0001234567',
    );

    await page.goto(`/en/dashboard/car/${tagId}/notes`);
    await page.getByLabel('Notes').fill(PRIVATE.notes);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveText('Saved.');

    // An address that is not a section is simply not there.
    expect((await page.goto(`/en/dashboard/car/${tagId}/engine`))?.status()).toBe(404);
    await page.close();
  });

  test('the overview and the dashboard reflect it all, and link to the right place', async () => {
    const page = await owner.newPage();
    await page.goto(`/en/dashboard/car/${tagId}`);
    // Each date with its pill: late in words, otherwise the days left.
    const sections = page.getByRole('list', { name: 'Everything about the car' });
    const insurance = sections.getByRole('link', { name: /^Insurance/ });
    await expect(insurance).toContainText('Late');
    await expect(insurance).toContainText(/\d+ days? late/);
    await expect(sections.getByRole('link', { name: /^Oil change/ })).toContainText('3 days');
    await expect(sections.getByRole('link', { name: /^Oil change/ })).toContainText('95 000 km');
    await expect(page.getByRole('link', { name: /^Renault Clio/ })).toContainText('Diesel · 2019');
    await expect(sections.getByRole('link', { name: /^Notes/ })).toContainText(PRIVATE.notes);

    await insurance.click();
    await expect(page).toHaveURL(new RegExp(`/car/${tagId}/insurance$`));

    await page.goto('/en/dashboard');
    await expect(page.getByText(/Insurance: .*days late/)).toBeVisible();
    await page.close();
  });

  test('the stickers and the car book are one tap apart: tabs on a computer, a bar on a phone', async () => {
    test.setTimeout(120_000);
    const page = await owner.newPage();

    // A computer: two tabs in the header, the current one marked, a badge for what is due.
    await page.goto('/en/dashboard');
    const tabs = page.getByRole('navigation', { name: 'My space' });
    await expect(tabs.getByRole('link', { name: /^My stickers/ })).toHaveAttribute('aria-current', 'page');
    const bookTab = tabs.getByRole('link', { name: /^Car book\s*\d+ dates? coming up or passed$/ });
    await expect(bookTab).not.toHaveAttribute('aria-current');
    await bookTab.click();
    await expect(page).toHaveURL(new RegExp(`/en/dashboard/car/${tagId}$`));
    await expect(tabs.getByRole('link', { name: /^Car book/ })).toHaveAttribute('aria-current', 'true');
    await expect(tabs.getByRole('link', { name: /^My stickers/ })).not.toHaveAttribute('aria-current');

    // A phone: the same two, in a bar at the bottom of the screen, on every page.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/en/dashboard/car/${tagId}/insurance`);
    const bar = page.getByRole('navigation', { name: 'My space' });
    await expect(bar).toBeVisible();
    expect((await bar.boundingBox())!.y).toBeGreaterThan(844 - 120);
    await expect(bar.getByRole('link', { name: /^Car book/ })).toHaveAttribute('aria-current', 'true');
    await bar.getByRole('link', { name: /^My stickers/ }).click();
    await expect(page).toHaveURL(/\/en\/dashboard$/);
    await expect(bar.getByRole('link', { name: /^My stickers/ })).toHaveAttribute('aria-current', 'page');
    await page.goto('/en/faq');
    await expect(bar).toBeVisible();
    await expect(bar.getByRole('link', { name: /^Car book/ })).not.toHaveAttribute('aria-current');

    // Typing: the bar steps aside so it never rides on the keyboard, then comes back.
    await page.goto(`/en/dashboard/car/${tagId}/notes?edit=1`);
    await page.getByRole('textbox').first().focus();
    await expect(bar).toBeHidden();
    await page.getByRole('heading', { level: 1 }).click();
    await expect(bar).toBeVisible();
    await page.close();
  });

  test('the header says who is signed in, and signs them out', async ({ browser }) => {
    test.setTimeout(120_000);
    // An account of its own: signing out here must not end the owner's session used after.
    const who = { email: `e2e-book-out-${run}@example.dz`, password: 'e2e-sign-out-password' };
    const context = await register(browser, who);
    const page = await context.newPage();
    await page.goto('/en/faq');

    const account = page.getByRole('banner').getByRole('button', { name: 'My account, Signed in' });
    await expect(account).toBeVisible();
    await account.click();
    const menu = page.locator('#mobile-menu');
    await expect(menu).toContainText('Signed in as');
    await expect(menu).toContainText(who.email);

    await menu.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/en$/);
    // Signed out: « Sign in » is back, and the account button is gone.
    await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('banner').getByRole('button', { name: 'My account, Signed in' })).toHaveCount(0);
    await page.goto('/en/dashboard');
    await expect(page).toHaveURL(/\/en\/login/);
    await context.close();
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
    for (const section of ['insurance', 'oil', 'notes']) {
      expect((await page.goto(`/en/dashboard/car/${tagId}/${section}`))?.status()).toBe(404);
      await expectNothingPrivate(page);
    }
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
