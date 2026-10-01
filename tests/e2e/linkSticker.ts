import { expect, type Page } from '@playwright/test';

export interface CarDetails {
  make: string;
  model: string;
  colour: string;
  plate?: string;
}

/**
 * Links a sticker the way a customer does, from a page already signed in:
 * scan it (open its address), one tap, then the dashboard. With `car`, also
 * describes the car in the « Add your car » box the dashboard then shows.
 */
export async function linkSticker(page: Page, tagId: string, car?: CarDetails): Promise<void> {
  await page.goto(`/t/${tagId}`);
  await page.getByRole('button', { name: 'Link this sticker to my account' }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard\\?activated=${tagId}$`), { timeout: 60_000 });
  if (car) await describeCar(page, tagId, car);
}

/** Fills in the « Add your car » box of one sticker on the dashboard. */
export async function describeCar(page: Page, tagId: string, car: CarDetails): Promise<void> {
  const box = page.locator('li').filter({ hasText: tagId }).getByRole('region', { name: 'Add your car' });
  await box.getByRole('textbox', { name: 'Make', exact: true }).fill(car.make);
  await box.getByRole('textbox', { name: 'Model', exact: true }).fill(car.model);
  await box.getByRole('combobox', { name: 'Colour', exact: true }).fill(car.colour);
  if (car.plate) await box.getByRole('textbox', { name: 'Plate (private)', exact: true }).fill(car.plate);
  await box.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Change saved.')).toBeVisible({ timeout: 60_000 });
}
