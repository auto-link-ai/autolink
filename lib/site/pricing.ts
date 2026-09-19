import 'server-only';
import { getSettings } from '@/lib/config/settings';
import { formatDzd } from '@/lib/format/currency';

export interface PublicPricing {
  unitPrice: number;
  /** e.g. "1 500 DA" */
  unitPriceLabel: string;
  currencyLabel: string;
  maxOrderQuantity: number;
  retentionDays: number;
}

/**
 * Price and limits for marketing pages, always read from settings (rule 5).
 * If the database cannot be reached the page still renders: it returns null and
 * the UI says the price is shown at checkout instead of failing.
 */
export async function getPublicPricing(): Promise<PublicPricing | null> {
  try {
    const settings = await getSettings();
    return {
      unitPrice: settings.unitPriceDzd,
      unitPriceLabel: formatDzd(settings.unitPriceDzd, settings.currencyLabel),
      currencyLabel: settings.currencyLabel,
      maxOrderQuantity: settings.maxOrderQuantity,
      retentionDays: settings.messageRetentionDays,
    };
  } catch (error) {
    console.error('[pricing] settings unavailable:', error instanceof Error ? error.message : error);
    return null;
  }
}
