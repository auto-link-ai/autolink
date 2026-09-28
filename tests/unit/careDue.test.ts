import { describe, expect, it } from 'vitest';
import { addDays, algiersToday, dueItem, dueItems, duePill, mostUrgent } from '@/lib/care/due';
import { groupThousands } from '@/lib/format/number';

describe('groupThousands', () => {
  it('groups with a no-break space, which keeps "85 000" one number in Arabic text', () => {
    expect(groupThousands(85000)).toBe('85 000');
    expect(groupThousands(1234567)).toBe('1 234 567');
    expect(groupThousands(950)).toBe('950');
  });
});

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const today = day('2026-09-21');

describe('algiersToday', () => {
  it("is Algeria's calendar day, which starts an hour before UTC's", () => {
    expect(algiersToday(new Date('2026-09-21T22:59:00Z'))).toEqual(day('2026-09-21'));
    expect(algiersToday(new Date('2026-09-21T23:01:00Z'))).toEqual(day('2026-09-22'));
  });
});

describe('dueItem', () => {
  it('is due soon up to and including the reminder window, then OK', () => {
    expect(dueItem('INSURANCE', addDays(today, 7), null, today, 7)).toMatchObject({ status: 'soon', daysLeft: 7 });
    expect(dueItem('INSURANCE', addDays(today, 8), null, today, 7)).toMatchObject({ status: 'ok', daysLeft: 8 });
    expect(dueItem('INSURANCE', today, null, today, 7)).toMatchObject({ status: 'soon', daysLeft: 0 });
  });

  it('is overdue from the day after', () => {
    expect(dueItem('VIGNETTE', addDays(today, -1), null, today, 7)).toMatchObject({ status: 'overdue', daysLeft: -1 });
  });

  it('shows an oil change by km alone as such, and nothing at all as unset', () => {
    expect(dueItem('OIL_CHANGE', null, 95000, today, 7)).toMatchObject({ status: 'km', daysLeft: null, km: 95000 });
    expect(dueItem('INSPECTION', null, null, today, 7)).toMatchObject({ status: 'unset' });
  });
});

describe('dueItems', () => {
  const items = dueItems(
    {
      oilChange: { date: addDays(today, 3), km: 95000 },
      insuranceExpiry: addDays(today, -2),
      inspectionDue: addDays(today, 200),
      vignetteDue: null,
    },
    today,
    7,
  );

  it('puts the late one first, then the soon one, then the rest', () => {
    expect(items.map((item) => [item.kind, item.status])).toEqual([
      ['INSURANCE', 'overdue'],
      ['OIL_CHANGE', 'soon'],
      ['INSPECTION', 'ok'],
      ['VIGNETTE', 'unset'],
    ]);
  });

  it('names only something late or soon as most urgent', () => {
    expect(mostUrgent(items)?.kind).toBe('INSURANCE');
    const calm = dueItems({ oilChange: null, insuranceExpiry: addDays(today, 90), inspectionDue: null, vignetteDue: null }, today, 7);
    expect(mostUrgent(calm)).toBeNull();
  });
});

describe('duePill', () => {
  it('says « late » once a date has passed, with how long ago', () => {
    expect(duePill(dueItem('INSURANCE', addDays(today, -3), null, today, 7))).toEqual({ tone: 'late', days: 3 });
  });

  it('counts the days left: orange inside the reminder window, green after', () => {
    expect(duePill(dueItem('INSURANCE', addDays(today, 5), null, today, 7))).toEqual({ tone: 'soon', days: 5 });
    expect(duePill(dueItem('INSURANCE', today, null, today, 7))).toEqual({ tone: 'soon', days: 0 });
    expect(duePill(dueItem('INSURANCE', addDays(today, 45), null, today, 7))).toEqual({ tone: 'ok', days: 45 });
  });

  it('shows nothing without a date, even with a km', () => {
    expect(duePill(dueItem('OIL_CHANGE', null, 85000, today, 7))).toBeNull();
    expect(duePill(dueItem('VIGNETTE', null, null, today, 7))).toBeNull();
  });
});
