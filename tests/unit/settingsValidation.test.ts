import { describe, expect, it } from 'vitest';
import { commerceSettingsSchema } from '@/lib/validation/settings';

const VALID = {
  unitPriceDzd: '1990',
  currencyLabel: 'DA',
  maxOrderQuantity: '10',
  rateLimitOrdersPerHour: '5',
  servicePeriodMonths: '24',
  renewalPriceDzd: '1000',
  renewalPeriodMonths: '12',
  renewalWarningDays: '30',
  deliveryFees: [{ wilayaCode: '16', home: '600', stopdesk: '400' }],
};

describe('commerceSettingsSchema: what /admin/settings may save', () => {
  it('reads the form strings as numbers, service period and renewal included', () => {
    const parsed = commerceSettingsSchema.parse(VALID);
    expect(parsed).toMatchObject({
      unitPriceDzd: 1990,
      servicePeriodMonths: 24,
      renewalPriceDzd: 1000,
      renewalPeriodMonths: 12,
      renewalWarningDays: 30,
    });
  });

  it.each([
    ['servicePeriodMonths', '0'],
    ['servicePeriodMonths', '121'],
    ['renewalPeriodMonths', '0'],
    ['renewalPriceDzd', '-1'],
    ['renewalPriceDzd', '12.5'],
    ['renewalWarningDays', '0'],
    ['renewalWarningDays', '181'],
  ])('refuses %s = %s', (field, value) => {
    expect(commerceSettingsSchema.safeParse({ ...VALID, [field]: value }).success).toBe(false);
  });

  it('refuses a form that leaves the renewal out', () => {
    const { renewalPriceDzd: _dropped, ...rest } = VALID;
    expect(commerceSettingsSchema.safeParse(rest).success).toBe(false);
  });
});
