import { expect, test, type Browser, type BrowserContext, type BrowserContextOptions, type Locator, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { adminContext } from './adminSession';
import { sentTo } from './whatsappMock';

/**
 * Owners, made the one way there is: a sticker from a new batch, scanned, and
 * activated with a WhatsApp number and a 4-digit PIN — the code read back from
 * the WhatsApp stand-in (whatsappMock.ts). One number is one account, so every
 * owner gets a number of their own. All of this writes to the database: specs
 * using it skip without `hasAdminCredentials`, like every spec that does.
 */

/** The PINs the specs choose: neither is on the weak list, and no number from freshPhone() ends with one. */
export const PIN = '4071';
export const NEW_PIN = '9302';

/** WHATSAPP_CODE_TEMPLATE_NAME in playwright.config.ts. */
const CODE_TEMPLATE = 'e2e_code';

export interface Car {
  /** A make on the list, or any other: typed under « Other make ». */
  brand: string;
  model: string;
}

export interface Owner extends Car {
  tagId: string;
  phone: string;
  pin: string;
  firstName: string;
  lastName: string;
}

/** An Algerian mobile nobody has yet: 05 and eight random digits. */
export function freshPhone(): string {
  for (;;) {
    const phone = `05${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
    // The end of the owner's own number is refused as a PIN.
    if (![PIN, NEW_PIN].some((pin) => phone.endsWith(pin))) return phone;
  }
}

/** 0551234567 → « 05 51 23 45 67 », as the site writes a number. */
export function formatPhone(phone: string): string {
  return phone.replace(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5');
}

/**
 * A browser of its own, on a connection of its own. Activations, codes and
 * sign-ins are limited per client address, and from one shared address the
 * suite would spend them all; real customers never share one. (198.18.0.0/15
 * is set aside for tests.)
 */
export function freshClient(browser: Browser, options: BrowserContextOptions = {}): Promise<BrowserContext> {
  const address = `198.18.${Math.floor(Math.random() * 256)}.${1 + Math.floor(Math.random() * 254)}`;
  return browser.newContext({ ...options, extraHTTPHeaders: { ...options.extraHTTPHeaders, 'x-forwarded-for': address } });
}

/** Stickers nobody owns yet, from the batch API with the saved admin session. */
export async function newStickers(browser: Browser, quantity = 1): Promise<string[]> {
  const office = await adminContext(browser);
  try {
    // The route answers requests from its own site only.
    const response = await office.request.post('/api/admin/batches', {
      data: { label: 'E2E owners', quantity },
      headers: { origin: test.info().project.use.baseURL! },
    });
    expect(response.status(), 'the batch API').toBe(200);
    const zip = await JSZip.loadAsync(await response.body());
    const rows = (await zip.file('tags.csv')!.async('string')).trim().split('\r\n').slice(1);
    return rows.map((row) => row.split(',')[0]!);
  } finally {
    await office.close();
  }
}

/** The codes the stand-in has sent to this number, oldest first. */
export async function codesTo(phone: string): Promise<string[]> {
  return (await sentTo(phone)).filter((sent) => sent.template === CODE_TEMPLATE).map((sent) => sent.body[0] ?? '');
}

/** Runs `ask` — the tap that sends a code — and returns the code it sent to `phone`. */
export async function codeFrom(phone: string, ask: () => Promise<unknown>): Promise<string> {
  const before = (await codesTo(phone)).length;
  await ask();
  // « Forgot PIN » sends once it has answered: the code can come a moment later.
  await expect.poll(async () => (await codesTo(phone)).length, { message: `a WhatsApp code to ${phone}` }).toBeGreaterThan(before);
  return (await codesTo(phone)).at(-1)!;
}

/** Make and model, on either activation screen. */
export async function chooseCar(page: Page, car: Car): Promise<void> {
  const make = page.getByLabel('Make', { exact: true });
  if (await make.locator(`option[value="${car.brand}"]`).count()) {
    await make.selectOption(car.brand);
  } else {
    await make.selectOption({ label: 'Other make' });
    await page.getByLabel('Which make?').fill(car.brand);
  }
  await page.getByLabel('Model', { exact: true }).fill(car.model);
}

/** The activation screen, signed out: who, which car, the PIN twice. */
export async function fillActivation(page: Page, owner: Omit<Owner, 'tagId'>): Promise<void> {
  await page.getByLabel('First name').fill(owner.firstName);
  await page.getByLabel('Last name').fill(owner.lastName);
  await page.getByLabel('WhatsApp number').fill(owner.phone);
  await chooseCar(page, owner);
  await page.getByLabel('PIN', { exact: true }).fill(owner.pin);
  await page.getByLabel('Confirm your PIN').fill(owner.pin);
}

/**
 * An owner, made as customers are: a new sticker (or `tagId`) scanned and
 * activated, with a fresh number unless `phone` is given, and the code
 * WhatsApp brought. Returns signed in, on the dashboard, with the sticker on
 * the account. The screen activation itself ends on is ownerAccount.spec's
 * business, not this helper's.
 */
export async function createOwner(page: Page, options: Partial<Owner> = {}): Promise<Owner> {
  const owner: Owner = {
    tagId: options.tagId ?? (await newStickers(page.context().browser()!))[0]!,
    phone: options.phone ?? freshPhone(),
    pin: options.pin ?? PIN,
    firstName: options.firstName ?? 'Amine',
    lastName: options.lastName ?? 'Belkacem',
    brand: options.brand ?? 'Renault',
    model: options.model ?? 'Symbol',
  };

  // A sticker nobody owns yet opens its activation.
  await page.goto(`/t/${owner.tagId}`);
  await expect(page).toHaveURL(new RegExp(`/en/activate\\?t=${owner.tagId}$`));
  await fillActivation(page, owner);
  const code = await codeFrom(owner.phone, () => page.getByRole('button', { name: 'Get my code on WhatsApp' }).click());
  const codeField = page.getByLabel('Code received on WhatsApp');
  await codeField.fill(code);
  await page.getByRole('button', { name: 'Activate my sticker' }).click();
  await expect(codeField, 'the code is accepted').toBeHidden({ timeout: 60_000 });

  await page.goto('/en/dashboard');
  await expect(page, 'signed in on the way').toHaveURL(/\/en\/dashboard$/);
  await expect(page.getByText(owner.tagId).first()).toBeVisible();
  return owner;
}

/** A signed-in owner's next sticker: scanned, the car named, one tap. Ends on the screen that says it is done. */
export async function addSticker(page: Page, tagId: string, car: Car = { brand: 'Peugeot', model: '208' }): Promise<void> {
  await page.goto(`/t/${tagId}`);
  await expect(page).toHaveURL(new RegExp(`/en/activate\\?t=${tagId}$`));
  await chooseCar(page, car);
  await page.getByRole('button', { name: 'Activate this sticker' }).click();
  await expect(page.getByRole('heading', { name: `It's activated: your ${car.brand} ${car.model} can now be reached.` })).toBeVisible({
    timeout: 60_000,
  });
}

/** « Edit the car » on one sticker of the dashboard: what activation does not ask. */
export async function editCar(page: Page, tagId: string, car: { colour?: string; plate?: string }): Promise<void> {
  await page.goto('/en/dashboard');
  // The sticker's card, not a message received through it.
  const card = page.locator('li').filter({ hasText: tagId }).filter({ has: page.locator('summary', { hasText: 'Edit the car' }) });
  await card.locator('summary', { hasText: 'Edit the car' }).click();
  if (car.colour) await card.getByRole('combobox', { name: 'Colour', exact: true }).fill(car.colour);
  if (car.plate) await card.getByRole('textbox', { name: 'Plate (private)', exact: true }).fill(car.plate);
  await card.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Change saved.')).toBeVisible({ timeout: 60_000 });
}

/** Fills the sign-in form already on screen, and sends it. */
export async function submitSignIn(page: Page, phone: string, pin: string): Promise<void> {
  await page.getByLabel('WhatsApp number').fill(phone);
  await page.getByLabel('PIN', { exact: true }).fill(pin);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/** One try on a fresh sign-in form. Returns where the form says what went wrong. */
export async function trySignIn(page: Page, phone: string, pin: string): Promise<Locator> {
  await page.goto('/en/login');
  await submitSignIn(page, phone, pin);
  return page.locator('form p[role="alert"]');
}

/** Signs in with the WhatsApp number and the PIN, and lands on the dashboard. */
export async function signIn(page: Page, phone: string, pin: string): Promise<void> {
  await page.goto('/en/login');
  await submitSignIn(page, phone, pin);
  await expect(page).toHaveURL(/\/en\/dashboard$/, { timeout: 60_000 });
}

/** Signs out with the dashboard's own button. */
export async function signOut(page: Page): Promise<void> {
  await page.goto('/en/dashboard');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/en$/);
}

/** The admin opening one customer's panel, found by their number. */
export async function openCustomer(admin: Page, phone: string): Promise<void> {
  await admin.goto('/en/admin/customers');
  await admin.getByLabel('Search').fill(phone);
  await admin.getByRole('button', { name: 'Search' }).click();
  // The newest customer is already on the unfiltered list: wait for the search,
  // or the click lands on a page that is about to be replaced.
  await expect(admin).toHaveURL(/[?&]q=/);
  await admin.getByRole('row').filter({ hasText: formatPhone(phone) }).getByRole('link').click();
  await expect(admin).toHaveURL(/id=USR-[0-9A-HJKMNP-TV-Z]{8}/);
}
