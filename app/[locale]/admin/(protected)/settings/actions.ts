'use server';

import { redirect } from 'next/navigation';
import { toLocale } from '@/i18n/locales';
import { getAdminSession } from '@/lib/admin/auth';
import { invalidateSettingsCache } from '@/lib/config/settings';
import { settingsRepository } from '@/lib/db/repositories/settings';
import { commerceSettingsSchema, readFeeRows } from '@/lib/validation/settings';
import { getWilayas } from '@/lib/config/wilayas';

/** Saves price, quantity limit, order rate limit and the per-wilaya fees. */
export async function saveCommerceSettingsAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  // Only a full admin may change what customers are charged.
  if (session.actor.role !== 'ADMIN') redirect(`/${locale}/admin/settings?result=forbidden`);

  const codes = (await getWilayas()).map((w) => w.code);
  const parsed = commerceSettingsSchema.safeParse({
    unitPriceDzd: formData.get('unitPriceDzd'),
    currencyLabel: formData.get('currencyLabel'),
    maxOrderQuantity: formData.get('maxOrderQuantity'),
    rateLimitOrdersPerHour: formData.get('rateLimitOrdersPerHour'),
    deliveryFees: readFeeRows(formData, codes),
  });
  if (!parsed.success) redirect(`/${locale}/admin/settings?result=invalid`);

  try {
    await settingsRepository.updateCommerce(session.actor, parsed.data);
  } catch (error) {
    console.error('[settings] save failed:', error instanceof Error ? error.message : error);
    redirect(`/${locale}/admin/settings?result=error`);
  }
  invalidateSettingsCache();
  redirect(`/${locale}/admin/settings?result=ok`);
}
