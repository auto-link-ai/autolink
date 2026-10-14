import 'server-only';
import { getTranslations } from 'next-intl/server';
import { getSettings, type AppSettings } from '@/lib/config/settings';
import { formatDzd } from '@/lib/format/currency';
import { periodParts } from '@/lib/renewals/period';

type PeriodParts = ReturnType<typeof periodParts>;

export interface PublicPricing {
  unitPrice: number;
  /** e.g. "1 990 DA" */
  unitPriceLabel: string;
  currencyLabel: string;
  maxOrderQuantity: number;
  retentionDays: number;
  /** Service included with a sticker, for `common.period`: « 2 ans ». */
  servicePeriod: PeriodParts;
  /** e.g. "1 000 DA" */
  renewalPriceLabel: string;
  renewalPeriod: PeriodParts;
}

/** What the public pages may show of the settings. */
export function toPublicPricing(settings: AppSettings): PublicPricing {
  return {
    unitPrice: settings.unitPriceDzd,
    unitPriceLabel: formatDzd(settings.unitPriceDzd, settings.currencyLabel),
    currencyLabel: settings.currencyLabel,
    maxOrderQuantity: settings.maxOrderQuantity,
    retentionDays: settings.messageRetentionDays,
    servicePeriod: periodParts(settings.servicePeriodMonths),
    renewalPriceLabel: formatDzd(settings.renewalPriceDzd, settings.currencyLabel),
    renewalPeriod: periodParts(settings.renewalPeriodMonths),
  };
}

/**
 * Price and limits for marketing pages, always read from settings (rule 5).
 * If the database cannot be reached the page still renders: it returns null and
 * the UI says the price is shown at checkout instead of failing.
 */
export async function getPublicPricing(): Promise<PublicPricing | null> {
  try {
    return toPublicPricing(await getSettings());
  } catch (error) {
    console.error('[pricing] settings unavailable:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * The service and renewal as words, in the page's language — « 2 ans »,
 * « 1 000 DA pour 1 an » — or, when settings could not be read, words that
 * still read well in the same sentences.
 */
export async function servicePhrases(pricing: PublicPricing | null): Promise<{ service: string; renewal: string }> {
  const [price, common] = await Promise.all([getTranslations('site.price'), getTranslations('common')]);
  if (!pricing) return { service: price('serviceUnknown'), renewal: price('renewalUnknown') };
  return {
    service: common('period', pricing.servicePeriod),
    renewal: price('renewal', { price: pricing.renewalPriceLabel, period: common('period', pricing.renewalPeriod) }),
  };
}
