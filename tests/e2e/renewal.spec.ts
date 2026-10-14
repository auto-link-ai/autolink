import { expect, test, type Browser, type BrowserContext } from '@playwright/test';
import { adminContext, hasAdminCredentials } from './adminSession';
import { createOwner, freshClient } from './owner';

/**
 * A renewal, end to end: a sticker close to the end of its service shows
 * « Renew », the owner asks, the admin confirms the payment, and the end moves
 * a year on. A new sticker ends two years out, so the test shortens the
 * included period to one month just for the sticker it links — and puts the
 * settings back straight after.
 */

type ServiceFields = Record<'servicePeriodMonths' | 'renewalWarningDays', string>;

async function setServiceSettings(browser: Browser, values: Partial<ServiceFields>): Promise<ServiceFields> {
  const office = await adminContext(browser);
  try {
    const page = await office.newPage();
    await page.goto('/en/admin/settings');
    const field = (name: keyof ServiceFields) => page.locator(`input[name="${name}"]`);
    const before = {
      servicePeriodMonths: await field('servicePeriodMonths').inputValue(),
      renewalWarningDays: await field('renewalWarningDays').inputValue(),
    };
    for (const [name, value] of Object.entries(values)) await field(name as keyof ServiceFields).fill(value);
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByRole('status')).toHaveText('Settings saved.');
    return before;
  } finally {
    await office.close();
  }
}

test.describe('renewing a sticker', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.');
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  let owner: BrowserContext;
  let original: ServiceFields | null = null;
  let tagId = '';
  let ref = '';
  test.afterAll(async ({ browser }) => {
    await owner?.close();
    // Whatever happened, the shop's own settings come back.
    if (original) await setServiceSettings(browser, original);
  });

  test('a sticker near its end shows « Renew », and the owner asks', async ({ browser }) => {
    test.setTimeout(240_000);
    original = await setServiceSettings(browser, { servicePeriodMonths: '1', renewalWarningDays: '60' });
    owner = await freshClient(browser);
    const page = await owner.newPage();
    try {
      tagId = (await createOwner(page, { firstName: 'Nadia', brand: 'Dacia', model: 'Logan' })).tagId;
    } finally {
      // Only the included period goes back: the 60-day window keeps this sticker's box showing.
      await setServiceSettings(browser, { servicePeriodMonths: original.servicePeriodMonths });
    }

    const card = page.locator('li').filter({ hasText: tagId });
    await expect(card).toContainText('Its service ends on');
    await card.getByRole('button', { name: 'Renew' }).click();
    await expect(page.getByRole('status').first()).toHaveText('Renewal requested: we will call you to arrange the payment.');

    const pending = card.getByRole('status');
    await expect(pending).toContainText('Renewal requested');
    ref = (await pending.textContent())?.match(/RN-[0-9A-Z]{6}/)?.[0] ?? '';
    expect(ref, 'the request reference').toMatch(/^RN-/);
    // Asking again is not a second request.
    await expect(card.getByRole('button', { name: 'Renew' })).toHaveCount(0);
  });

  test('the admin confirms the payment, and the end moves a year on', async ({ browser }) => {
    test.setTimeout(120_000);
    const office = await adminContext(browser);
    try {
      const admin = await office.newPage();
      await admin.goto('/en/admin');
      await expect(admin.getByRole('link', { name: /Renewals/ }).first()).toBeVisible();

      await admin.goto('/en/admin/renewals');
      const entry = admin.locator('li').filter({ hasText: ref });
      await expect(entry).toContainText(tagId);
      await expect(entry).toContainText('Nadia');
      await entry.locator('summary', { hasText: 'Payment received' }).click();
      await expect(entry).toContainText(`Sticker ${tagId} gets 1 year more of service.`);
      await entry.getByRole('button', { name: 'Yes, extend it' }).click();
      await expect(admin.getByRole('status')).toHaveText("Confirmed: the sticker's service is extended.");
      await expect(admin.locator('li').filter({ hasText: ref })).toContainText('Confirmed');
    } finally {
      await office.close();
    }

    // Back to the shop's own window: thirteen months out is no longer "soon".
    if (original) await setServiceSettings(browser, { renewalWarningDays: original.renewalWarningDays });
    const page = await owner.newPage();
    await page.goto('/en/dashboard');
    const card = page.locator('li').filter({ hasText: tagId });
    // One month included, then a year: about thirteen months from now.
    const year = new Date(Date.now() + 395 * 24 * 60 * 60 * 1000).getUTCFullYear();
    await expect(card).toContainText(new RegExp(`Service active until .*${year}`));
    await expect(card.getByRole('button', { name: 'Renew' })).toHaveCount(0);
  });
});
