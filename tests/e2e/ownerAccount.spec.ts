import { expect, test } from '@playwright/test';
import { hasAdminCredentials } from './adminSession';
import {
  codeFrom,
  codesTo,
  createOwner,
  fillActivation,
  formatPhone,
  freshClient,
  freshPhone,
  newStickers,
  NEW_PIN,
  PIN,
  signIn,
  signOut,
  submitSignIn,
  trySignIn,
} from './owner';

/**
 * An owner's account is a WhatsApp number and a PIN. Activating a sticker
 * makes it — one screen, then the code WhatsApp brings — and the PIN signs in
 * from then on: forgotten, it comes back through a new code; changed, it signs
 * every other device out. Each test has its own owner, number and connection.
 */

const WEAK = 'That PIN is too easy to guess. Choose another one.';
const WRONG = 'Wrong number or PIN.';

test.describe('an owner account: a WhatsApp number and a PIN', () => {
  test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.');
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  test('scanned out of the box, a sticker is activated on one screen and a WhatsApp code, then shows on the dashboard', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const tagId = (await newStickers(browser))[0]!;
    const context = await freshClient(browser);
    const page = await context.newPage();
    const owner = { phone: freshPhone(), pin: PIN, firstName: 'Nadia', lastName: 'Saadi', brand: 'Renault', model: 'Symbol' };

    await page.goto(`/t/${tagId}`);
    await expect(page).toHaveURL(new RegExp(`/en/activate\\?t=${tagId}$`));
    await expect(page.getByText(tagId)).toBeVisible();
    await fillActivation(page, owner);

    // Screen 1 refuses a PIN that is easy to guess, and two that differ —
    // under their fields, and before any code is sent.
    const pin = page.getByLabel('PIN', { exact: true });
    const confirm = page.getByLabel('Confirm your PIN');
    const send = page.getByRole('button', { name: 'Get my code on WhatsApp' });
    await pin.fill('1234');
    await confirm.fill('1234');
    await send.click();
    await expect(pin).toHaveAccessibleDescription(WEAK);
    await pin.fill(PIN);
    await confirm.fill(NEW_PIN);
    await send.click();
    await expect(confirm).toHaveAccessibleDescription("The two PINs don't match.");
    // The end of the owner's own number: the first thing someone who has it would try.
    await pin.fill(owner.phone.slice(-4));
    await confirm.fill(owner.phone.slice(-4));
    await send.click();
    await expect(confirm).toHaveAccessibleDescription('');
    await expect(pin).toHaveAccessibleDescription(WEAK);
    expect(await codesTo(owner.phone)).toEqual([]);

    await pin.fill(owner.pin);
    await confirm.fill(owner.pin);
    const code = await codeFrom(owner.phone, () => send.click());
    // Which number it went to, masked: enough to recognise it, not to read it over a shoulder.
    await expect(page.getByText(`05 •• •• ${owner.phone.slice(6, 8)} ${owner.phone.slice(8)}`)).toBeVisible();

    // A wrong code is refused on its field; the right one activates.
    const codeField = page.getByLabel('Code received on WhatsApp');
    const activate = page.getByRole('button', { name: 'Activate my sticker' });
    await codeField.fill(code === '000000' ? '111111' : '000000');
    await activate.click();
    await expect(codeField).toHaveAccessibleDescription("That's not the right code. Check the WhatsApp message.");
    await codeField.fill(code);
    await activate.click();

    await expect(page.getByRole('heading', { name: "It's activated: your Renault Symbol can now be reached." })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole('link', { name: 'Add my dates' })).toHaveAttribute('href', `/en/dashboard/car/${tagId}`);
    await page.getByRole('link', { name: 'See my messages' }).click();

    // Signed in on the way: the dashboard greets them, with the car and their number.
    await expect(page).toHaveURL(/\/en\/dashboard$/);
    await expect(page.getByText(`Hello Nadia · ${formatPhone(owner.phone)}`)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Renault Symbol' })).toBeVisible();
    await expect(page.getByText(tagId).first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'My account' })).toContainText(formatPhone(owner.phone));
    await context.close();
  });

  test('signed out, the number and the PIN sign back in; a wrong PIN says so, and keeps the number', async ({ browser }) => {
    test.setTimeout(180_000);
    const context = await freshClient(browser);
    const page = await context.newPage();
    const owner = await createOwner(page);
    await signOut(page);
    await page.goto('/en/dashboard');
    await expect(page).toHaveURL(/\/en\/login\?next=/);

    await submitSignIn(page, owner.phone, NEW_PIN);
    await expect(page.locator('form p[role="alert"]')).toHaveText(WRONG);
    // A wrong PIN costs a retype of the PIN, not of the whole form.
    await expect(page.getByLabel('WhatsApp number')).toHaveValue(owner.phone);
    // A number with no account gets the very same words: never say which part was wrong.
    await expect(await trySignIn(page, freshPhone(), owner.pin)).toHaveText(WRONG);

    await signIn(page, owner.phone, owner.pin);
    await expect(page.getByText(`Hello ${owner.firstName}`)).toBeVisible();
    await context.close();
  });

  test('too many tries for one number stop with their own message — even a number with no account', async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await freshClient(browser);
    const page = await context.newPage();
    const phone = freshPhone();
    // Five a quarter of an hour (settings), counted per number before anything is checked.
    for (let attempt = 0; attempt < 5; attempt++) await expect(await trySignIn(page, phone, PIN)).toHaveText(WRONG);
    await expect(await trySignIn(page, phone, PIN)).toHaveText(
      'Too many tries for this number. Try again later, or choose a new PIN via WhatsApp.',
    );
    await context.close();
  });

  test('a forgotten PIN is replaced through a WhatsApp code: the old one stops working, the new one signs in', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const context = await freshClient(browser);
    const page = await context.newPage();
    const owner = await createOwner(page);
    await signOut(page);

    await page.goto('/en/login');
    await page.getByRole('link', { name: 'Get a code on WhatsApp' }).click();
    await expect(page).toHaveURL(/\/en\/forgot-pin$/);
    await page.getByLabel('WhatsApp number').fill(owner.phone);
    const code = await codeFrom(owner.phone, () => page.getByRole('button', { name: 'Get the code on WhatsApp' }).click());
    // It never says whether a number has an account: only where a code would go.
    await expect(page.getByText('If this number has an account, the code is sent on WhatsApp to')).toBeVisible();
    await page.getByLabel('Code received on WhatsApp').fill(code);
    await page.getByLabel('New PIN', { exact: true }).fill(NEW_PIN);
    await page.getByLabel('Confirm your PIN').fill(NEW_PIN);
    await page.getByRole('button', { name: 'Save and sign in' }).click();
    await expect(page).toHaveURL(/\/en\/dashboard$/, { timeout: 60_000 });

    await signOut(page);
    await expect(await trySignIn(page, owner.phone, owner.pin)).toHaveText(WRONG);
    await signIn(page, owner.phone, NEW_PIN);
    await context.close();
  });

  test('a new PIN chosen on the dashboard: the current one is checked first, and every other device is signed out', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const context = await freshClient(browser);
    const page = await context.newPage();
    const owner = await createOwner(page);
    // Another device, signed in to the same account before the change.
    const tablet = await browser.newContext({ storageState: await context.storageState() });

    await page.locator('summary', { hasText: 'Change my PIN' }).click();
    const current = page.getByLabel('Current PIN');
    await current.fill('0000');
    await page.getByLabel('New PIN', { exact: true }).fill(NEW_PIN);
    await page.getByLabel('Confirm the new PIN').fill(NEW_PIN);
    await page.getByRole('button', { name: 'Save the new PIN' }).click();
    // A wrong current PIN is refused on its field, and changes nothing.
    await expect(current).toHaveAccessibleDescription("That's not your current PIN.");

    await current.fill(owner.pin);
    await page.getByRole('button', { name: 'Save the new PIN' }).click();
    await expect(page.getByText('PIN changed. Your other devices are signed out.')).toBeVisible({ timeout: 60_000 });

    const elsewhere = await tablet.newPage();
    await elsewhere.goto('/en/dashboard');
    await expect(elsewhere).toHaveURL(/\/en\/login\?next=/);
    await tablet.close();
    // This device stays signed in.
    await page.goto('/en/dashboard');
    await expect(page).toHaveURL(/\/en\/dashboard$/);

    await signOut(page);
    await expect(await trySignIn(page, owner.phone, owner.pin)).toHaveText(WRONG);
    await signIn(page, owner.phone, NEW_PIN);
    await context.close();
  });

  test('a second sticker activated with the same number joins the same account', async ({ browser }) => {
    test.setTimeout(240_000);
    const context = await freshClient(browser);
    const page = await context.newPage();
    const owner = await createOwner(page);
    await signOut(page);

    // Signed out, on the same screen as the first time: the number finds its
    // account. (Lada is not on the list of makes: it is typed under « Other make ».)
    const second = await createOwner(page, { phone: owner.phone, pin: owner.pin, brand: 'Lada', model: 'Niva' });
    await expect(page.getByText('2 stickers on your account.')).toBeVisible();
    for (const car of ['Renault Symbol', 'Lada Niva']) await expect(page.getByRole('heading', { name: car })).toBeVisible();
    for (const id of [owner.tagId, second.tagId]) await expect(page.getByText(id).first()).toBeVisible();
    await context.close();
  });
});
