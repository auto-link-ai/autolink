import { describe, expect, it } from 'vitest';
import { inService } from '@/lib/db/repositories/inService';
import { generateRenewalRef, isValidRenewalRef } from '@/lib/renewals/ref';
import { addMonths, extendServiceUntil, periodParts, serviceState } from '@/lib/renewals/period';

const day = (iso: string) => new Date(`${iso}T10:00:00.000Z`);

describe('addMonths', () => {
  it('keeps the day and the time of day', () => {
    expect(addMonths(day('2026-10-14'), 24).toISOString()).toBe('2028-10-14T10:00:00.000Z');
    expect(addMonths(day('2026-10-14'), 12).toISOString()).toBe('2027-10-14T10:00:00.000Z');
  });

  it('lands on the last day of a shorter month instead of spilling into the next', () => {
    expect(addMonths(day('2027-01-31'), 1).toISOString()).toBe('2027-02-28T10:00:00.000Z');
    expect(addMonths(day('2028-01-31'), 1).toISOString()).toBe('2028-02-29T10:00:00.000Z');
    expect(addMonths(day('2026-08-31'), 1).toISOString()).toBe('2026-09-30T10:00:00.000Z');
  });

  it('crosses year ends', () => {
    expect(addMonths(day('2026-11-15'), 3).toISOString()).toBe('2027-02-15T10:00:00.000Z');
  });
});

describe('extendServiceUntil: what a confirmed renewal moves the end to', () => {
  const now = day('2026-10-14');

  it('adds to the current end when renewing early: nothing is lost', () => {
    expect(extendServiceUntil(day('2026-11-01'), now, 12).toISOString()).toBe('2027-11-01T10:00:00.000Z');
  });

  it('starts from today once the end has passed: the weeks it was off are not paid for', () => {
    expect(extendServiceUntil(day('2026-06-01'), now, 12).toISOString()).toBe('2027-10-14T10:00:00.000Z');
  });

  it('starts from today for a sticker with no end yet', () => {
    expect(extendServiceUntil(null, now, 12).toISOString()).toBe('2027-10-14T10:00:00.000Z');
  });
});

describe('serviceState', () => {
  const now = day('2026-10-14');

  it('is quiet while the end is further than the warning window', () => {
    expect(serviceState(day('2026-11-14'), now, 30)).toBe('ok');
  });

  it('warns from warningDays before the end', () => {
    expect(serviceState(day('2026-11-13'), now, 30)).toBe('soon');
    expect(serviceState(new Date(now.getTime() + 1000), now, 30)).toBe('soon');
  });

  it('has expired at the end itself, and after', () => {
    expect(serviceState(now, now, 30)).toBe('expired');
    expect(serviceState(day('2026-01-01'), now, 30)).toBe('expired');
  });

  it('says nothing about a sticker not dated yet', () => {
    expect(serviceState(null, now, 30)).toBe('undated');
  });
});

describe('periodParts: how copy names a length', () => {
  it('speaks in years when the months make whole years', () => {
    expect(periodParts(24)).toEqual({ unit: 'year', count: 2 });
    expect(periodParts(12)).toEqual({ unit: 'year', count: 1 });
  });

  it('speaks in months otherwise', () => {
    expect(periodParts(18)).toEqual({ unit: 'month', count: 18 });
    expect(periodParts(6)).toEqual({ unit: 'month', count: 6 });
  });
});

describe('inService: the filter every "can a stranger reach the owner" query adds', () => {
  it('lets through a sticker whose end is still ahead, or that has no end yet', () => {
    const now = day('2026-10-14');
    expect(inService(now)).toEqual({ $or: [{ serviceUntil: null }, { serviceUntil: { $gt: now } }] });
  });
});

describe('renewal references', () => {
  it('are RN- and six Crockford characters', () => {
    for (let i = 0; i < 50; i++) {
      const ref = generateRenewalRef();
      expect(ref).toMatch(/^RN-[0-9A-HJKMNP-TV-Z]{6}$/);
      expect(isValidRenewalRef(ref)).toBe(true);
    }
  });

  it('refuse anything else, an order reference included', () => {
    for (const value of ['AL-7K3M9Q', 'RN-7K3M9', 'RN-7K3M9QX', 'rn-7k3m9q', 'RN-7K3M9I', '', null, 42]) {
      expect(isValidRenewalRef(value)).toBe(false);
    }
  });
});
