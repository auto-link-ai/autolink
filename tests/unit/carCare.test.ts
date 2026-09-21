import { describe, expect, it } from 'vitest';
import {
  insuranceSchema,
  oilChangeSchema,
  parseDay,
  profileSchema,
  repairSchema,
  toDayInput,
  vignetteSchema,
} from '@/lib/validation/carCare';

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const blankOil = { date: '2026-09-01', km: '', oilType: '', garage: '', costDzd: '', nextDueDate: '', nextDueKm: '', note: '' };

describe('parseDay', () => {
  it('reads a calendar day as UTC midnight, and writes it back the same', () => {
    expect(parseDay('2026-09-21')).toEqual(day('2026-09-21'));
    expect(toDayInput(parseDay('2026-02-28'))).toBe('2026-02-28');
    expect(toDayInput(null)).toBe('');
  });

  it('refuses days that do not exist, and years out of range', () => {
    expect(parseDay('2026-02-30')).toBeNull();
    expect(parseDay('2026-13-01')).toBeNull();
    expect(parseDay('21/09/2026')).toBeNull();
    expect(parseDay('1900-01-01')).toBeNull();
  });
});

describe('oil change', () => {
  it('treats every empty field as "not filled in"', () => {
    const parsed = oilChangeSchema.parse(blankOil);
    expect(parsed).toMatchObject({ date: day('2026-09-01'), km: null, nextDueDate: null, nextDueKm: null, note: null });
  });

  it('reads thousands however people group them, but refuses decimals and negatives', () => {
    for (const km of ['85000', '85 000', '85 000', '85.000', '85,000']) {
      expect(oilChangeSchema.parse({ ...blankOil, km }).km).toBe(85000);
    }
    expect(oilChangeSchema.parse({ ...blankOil, km: '1 234 567' }).km).toBe(1234567);
    for (const km of ['85.5', '85,5', '8 50', 'abc', '-1']) {
      expect(oilChangeSchema.safeParse({ ...blankOil, km }).error?.issues[0]?.message).toBe('invalid_number');
    }
  });

  it('needs its date', () => {
    const result = oilChangeSchema.safeParse({ ...blankOil, date: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('required');
  });

  it('refuses a next change before this one, by date or by km', () => {
    const early = oilChangeSchema.safeParse({ ...blankOil, nextDueDate: '2026-08-01' });
    expect(early.error?.issues[0]).toMatchObject({ path: ['nextDueDate'], message: 'before_start' });

    const lowKm = oilChangeSchema.safeParse({ ...blankOil, km: '85000', nextDueKm: '85000' });
    expect(lowKm.error?.issues[0]).toMatchObject({ path: ['nextDueKm'], message: 'below_km' });

    expect(oilChangeSchema.safeParse({ ...blankOil, km: '85000', nextDueKm: '95000', nextDueDate: '2027-03-01' }).success).toBe(true);
  });
});

describe('the other sections', () => {
  it('cleans up a chassis number and refuses anything but letters and digits', () => {
    const base = { year: '', fuel: '', engine: '', registrationNumber: '' };
    expect(profileSchema.parse({ ...base, vin: ' vf3 1ab-23456789 ' }).vin).toBe('VF31AB23456789');
    expect(profileSchema.safeParse({ ...base, vin: 'VF3_1AB' }).success).toBe(false);
    expect(profileSchema.parse({ ...base, vin: '' }).vin).toBeNull();
  });

  it('keeps the year and fuel to real values', () => {
    const base = { engine: '', vin: '', registrationNumber: '' };
    expect(profileSchema.parse({ ...base, year: '2019', fuel: 'DIESEL' })).toMatchObject({ year: 2019, fuel: 'DIESEL' });
    expect(profileSchema.safeParse({ ...base, year: '1920', fuel: '' }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, year: '', fuel: 'COAL' }).success).toBe(false);
  });

  it('refuses an insurance that ends before it starts', () => {
    const result = insuranceSchema.safeParse({ company: 'SAA', policyNumber: '', startDate: '2026-06-01', expiryDate: '2026-05-31' });
    expect(result.error?.issues[0]).toMatchObject({ path: ['expiryDate'], message: 'before_start' });
  });

  it('lets a section be emptied entirely', () => {
    expect(vignetteSchema.parse({ paidDate: '', nextDueDate: '' })).toEqual({ paidDate: null, nextDueDate: null });
  });

  it('needs to know what work was done', () => {
    const repair = { date: '2026-09-01', km: '', garage: '', costDzd: '', note: '' };
    expect(repairSchema.safeParse({ ...repair, work: ' ' }).error?.issues[0]?.message).toBe('required');
    expect(repairSchema.parse({ ...repair, work: '  Front   brake pads ' }).work).toBe('Front brake pads');
  });
});
