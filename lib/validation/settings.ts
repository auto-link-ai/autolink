import { z } from 'zod';
import { WILAYA_CODE_MAX, WILAYA_CODE_MIN } from '@/lib/domain/constants';

const money = z.coerce.number().int().min(0).max(1_000_000);

/** What /admin/settings may change. Everything else stays untouched. */
export const commerceSettingsSchema = z.object({
  unitPriceDzd: money,
  currencyLabel: z.string().trim().min(1).max(8),
  maxOrderQuantity: z.coerce.number().int().min(1).max(100),
  rateLimitOrdersPerHour: z.coerce.number().int().min(1).max(1000),
  deliveryFees: z
    .array(
      z.object({
        wilayaCode: z.coerce.number().int().min(WILAYA_CODE_MIN).max(WILAYA_CODE_MAX),
        home: money,
        stopdesk: money,
      }),
    )
    .min(1),
});

export type CommerceSettingsInputRaw = z.input<typeof commerceSettingsSchema>;

/** Reads the flat `fee_home_16` / `fee_stopdesk_16` fields the form posts. */
export function readFeeRows(formData: FormData, codes: number[]) {
  return codes.map((wilayaCode) => ({
    wilayaCode,
    home: formData.get(`fee_home_${wilayaCode}`),
    stopdesk: formData.get(`fee_stopdesk_${wilayaCode}`),
  }));
}
