import { expect, test } from '@playwright/test';
import { adminContext, hasAdminCredentials } from './adminSession';
import { createOwner, freshClient, NEW_PIN, openCustomer, signIn, signOut, trySignIn } from './owner';

/**
 * Support for an owner who cannot get in: a temporary PIN read out over the
 * phone, or the PIN tries that locked them out, cleared. Each test has an
 * owner of its own.
 */

test.describe('an admin helping a customer back in', () => {
  test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and a disposable MONGODB_DB_NAME.');
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Writes to the database: run once.');
  });

  test('a temporary PIN is shown once: it signs the customer in, and the old one no longer does', async ({ browser }) => {
    test.setTimeout(240_000);
    const home = await freshClient(browser);
    const page = await home.newPage();
    const customer = await createOwner(page, { firstName: 'Nadia', lastName: 'Haddad' });

    const office = await adminContext(browser);
    const admin = await office.newPage();
    await openCustomer(admin, customer.phone);
    await admin.getByRole('button', { name: 'New temporary PIN' }).click();
    const notice = admin.getByRole('status').filter({ hasText: 'Temporary PIN, shown only once — give it to the customer:' });
    await expect(notice).toBeVisible();
    const temporary = (await notice.locator('code').innerText()).trim();
    expect(temporary).toMatch(/^\d{4}$/);
    // It is shown, never put in the URL.
    expect([...new URL(admin.url()).searchParams.values()]).not.toContain(temporary);
    await office.close();

    // Signed out everywhere: the old PIN is refused, the temporary one signs in.
    await page.goto('/en/dashboard');
    await expect(page).toHaveURL(/\/en\/login\?next=/);
    await expect(await trySignIn(page, customer.phone, customer.pin)).toHaveText('Wrong number or PIN.');
    await signIn(page, customer.phone, temporary);
    await home.close();
  });

  test('a customer locked out by wrong PINs is let back in with « Unlock PIN »', async ({ browser }) => {
    test.setTimeout(240_000);
    const home = await freshClient(browser);
    const page = await home.newPage();
    const customer = await createOwner(page, { firstName: 'Walid', lastName: 'Mansouri' });
    await signOut(page);

    // Five wrong PINs, and the number is locked: even the right one is refused for now.
    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(await trySignIn(page, customer.phone, NEW_PIN)).toHaveText('Wrong number or PIN.');
    }
    await expect(await trySignIn(page, customer.phone, customer.pin)).toHaveText(
      'Too many tries for this number. Try again later, or choose a new PIN via WhatsApp.',
    );

    const office = await adminContext(browser);
    const admin = await office.newPage();
    await openCustomer(admin, customer.phone);
    await admin.getByRole('button', { name: 'Unlock PIN' }).click();
    await expect(admin.getByRole('status')).toHaveText('PIN unlocked: the customer can try again now.');
    await office.close();

    await signIn(page, customer.phone, customer.pin);
    await home.close();
  });
});
