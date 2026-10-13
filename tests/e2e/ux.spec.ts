import { expect, test } from '@playwright/test';
import { hasAdminCredentials } from './adminSession';
import { fillActivation, freshClient, newStickers, PIN } from './owner';

/**
 * The friction fixes, checked where people meet them.
 *
 * Contexts that write present their own client address (owner.ts, freshClient):
 * the activation and sign-in limiters count per address, and the rest of the
 * suite already spends most of its hour from 127.0.0.1. Real customers never
 * share one, so this is the honest setup.
 */

// ---- Public pages: no database writes -------------------------------------------------

test('a PIN is typed on the number keypad, and shows as dots', async ({ page }) => {
  await page.goto('/en/login');
  const pin = page.getByLabel('PIN', { exact: true });
  await expect(pin).toHaveAttribute('type', 'password');
  await expect(pin).toHaveAttribute('inputmode', 'numeric');
  await expect(pin).toHaveAttribute('maxlength', '4');
  await expect(page.getByLabel('WhatsApp number')).toHaveAttribute('inputmode', 'tel');
});

test('sign-in says what to do about a forgotten PIN', async ({ page }) => {
  await page.goto('/en/login');
  await expect(page.getByText('Forgot your PIN?')).toBeVisible();
  await page.getByRole('link', { name: 'Get a code on WhatsApp' }).click();
  await expect(page).toHaveURL(/\/en\/forgot-pin$/);
  await expect(page.getByRole('button', { name: 'Get the code on WhatsApp' })).toBeVisible();
});

test('someone new is sent from sign-in to activating their sticker, where an account starts', async ({ page }) => {
  await page.goto('/en/login');
  await expect(page.getByText('New here?')).toBeVisible();
  await page.getByRole('link', { name: 'Activate your sticker' }).click();
  await expect(page).toHaveURL(/\/en\/activate$/);
  await expect(page.getByLabel('Sticker id')).toBeVisible();
});

// ---- With a disposable database -------------------------------------------------------

test.describe('a first-time customer activating a sticker', () => {
  test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.');
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  test('activating needs a WhatsApp number: the browser stops on an empty one', async ({ browser }) => {
    test.setTimeout(120_000);
    const tagId = (await newStickers(browser))[0]!;
    const context = await freshClient(browser);
    const page = await context.newPage();
    await page.goto(`/t/${tagId}`);
    await fillActivation(page, { firstName: 'Amine', lastName: 'Belkacem', phone: '', brand: 'Renault', model: 'Symbol', pin: PIN });

    const phone = page.getByLabel('WhatsApp number');
    await expect(phone).toHaveAttribute('required', '');
    await page.getByRole('button', { name: 'Get my code on WhatsApp' }).click();
    // Nothing is sent: the browser stops on the empty number.
    expect(await phone.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
    await expect(page.getByLabel('Code received on WhatsApp')).toHaveCount(0);
    await context.close();
  });
});
