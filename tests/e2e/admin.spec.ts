import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import JSZip from 'jszip';

// ---- Without a session: no database needed -------------------------------------------

test('admin pages redirect to the login page without a session', async ({ page }) => {
  await page.goto('/fr/admin/tags');
  await expect(page).toHaveURL(/\/fr\/admin\/login$/);
  await page.goto('/en/admin');
  await expect(page).toHaveURL(/\/en\/admin\/login$/);
});

test('a forged admin cookie is rejected', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'autolink_admin', value: 'v1.AAAAAAAAAAAAAAAA.BBBBBBBB', url: baseURL! }]);
  await page.goto('/fr/admin/tags');
  await expect(page).toHaveURL(/\/fr\/admin\/login$/);
});

test('the admin login page renders right-to-left in Arabic', async ({ page }) => {
  await page.goto('/ar/admin/login');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('دخول المسؤول');
});

test('the batch API rejects unauthenticated and cross-origin requests', async ({ request, baseURL }) => {
  const body = { label: 'x', quantity: 1 };
  const anonymous = await request.post('/api/admin/batches', { data: body, headers: { origin: baseURL! } });
  expect(anonymous.status()).toBe(401);
  const crossSite = await request.post('/api/admin/batches', { data: body, headers: { origin: 'https://evil.example' } });
  expect(crossSite.status()).toBe(403);
  expect(await crossSite.json()).toEqual({ error: 'forbidden' });
});

// ---- With an admin account: needs a disposable database ------------------------------

const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;

async function signIn(page: Page) {
  await page.goto('/en/admin/login');
  await page.getByLabel('Email').fill(EMAIL!);
  await page.getByLabel('Password').fill(PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/en\/admin\/tags$/);
}

async function readZip(download: import('@playwright/test').Download) {
  return JSZip.loadAsync(await readFile((await download.path())!));
}

test.describe('with an admin account', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!EMAIL || !PASSWORD, 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.');
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  // Under `next dev`, the first hit on a route compiles it and pushes a Fast Refresh to
  // the open page, remounting client components mid-click. Compile both batch routes
  // up front (unauthenticated → 401, nothing written).
  test.beforeAll(async ({ request, baseURL }) => {
    const headers = { origin: baseURL! };
    await request.post('/api/admin/batches', { data: {}, headers });
    await request.post('/api/admin/batches/B-00000000/reissue', { data: {}, headers });
  });

  test('wrong password shows a generic error', async ({ page }) => {
    await page.goto('/en/admin/login');
    await page.getByLabel('Email').fill(EMAIL!);
    await page.getByLabel('Password').fill('definitely-wrong');
    await page.getByRole('button', { name: 'Sign in' }).click();
    // (Next's route announcer is also role="alert", so match by text.)
    await expect(page.getByRole('alert').filter({ hasText: 'Wrong email or password.' })).toBeVisible();
    await expect(page).toHaveURL(/\/en\/admin\/login\?error=invalid$/);
  });

  test('generate a batch, manage a tag, reissue codes, sign out', async ({ page }) => {
    // Long flow; in `next dev` each route also compiles on first hit.
    test.setTimeout(120_000);
    await signIn(page);

    // Generate 3 tags and inspect the ZIP.
    await page.getByLabel('Batch name').fill('E2E batch');
    await page.getByLabel('Quantity').fill('3');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Generate and download' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^autolink-e2e-batch-B-[0-9A-Z]{8}\.zip$/);
    const zip = await readZip(download);
    const csv = (await zip.file('tags.csv')!.async('string')).trim().split('\r\n');
    expect(csv[0]).toBe('tag_id,activation_code,qr_url');
    const rows = csv.slice(1).map((line) => line.split(','));
    expect(rows).toHaveLength(3);
    for (const [id, code, url] of rows) {
      expect(id).toMatch(/^AUT-[0-9A-HJKMNP-TV-Z]{8}$/);
      expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{2}$/);
      expect(url).toMatch(new RegExp(`/t/${id}$`));
      expect(zip.file(`pdf/${id}.pdf`)).not.toBeNull();
    }
    await expect(page.getByText('Batch created. The download has started.')).toBeVisible();

    // The new tags appear as unassigned; mark one lost, then reactivate it.
    const firstId = rows[0]![0]!;
    await page.getByLabel('Tag ID').fill(firstId);
    await page.getByRole('button', { name: 'Search' }).click();
    const row = page.getByRole('row', { name: new RegExp(firstId) });
    await expect(row.getByText('Unassigned')).toBeVisible();
    await row.getByRole('button', { name: 'Mark lost' }).click();
    await expect(page.getByRole('status')).toHaveText('Status updated.');
    await expect(page.getByRole('row', { name: new RegExp(firstId) }).getByText('Lost')).toBeVisible();
    await page.getByRole('row', { name: new RegExp(firstId) }).getByRole('button', { name: 'Reactivate' }).click();
    await expect(page.getByRole('row', { name: new RegExp(firstId) }).getByText('Unassigned')).toBeVisible();

    // Reissue: fresh codes for the same tags.
    page.once('dialog', (dialog) => dialog.accept());
    const batchRow = page.getByRole('row', { name: /E2E batch/ }).first();
    const [reissued] = await Promise.all([
      page.waitForEvent('download'),
      batchRow.getByRole('button', { name: 'Reissue codes' }).click(),
    ]);
    expect(reissued.suggestedFilename()).toMatch(/-reissue\.zip$/);
    const newRows = (await (await readZip(reissued)).file('tags.csv')!.async('string'))
      .trim()
      .split('\r\n')
      .slice(1)
      .map((line) => line.split(','));
    expect(newRows.map((r) => r[0]).sort()).toEqual(rows.map((r) => r[0]).sort());
    for (const [id, code] of newRows) expect(code).not.toBe(rows.find((r) => r[0] === id)![1]);

    // Sign out ends the session.
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/en\/admin\/login$/);
    await page.goto('/en/admin/tags');
    await expect(page).toHaveURL(/\/en\/admin\/login$/);
  });
});
