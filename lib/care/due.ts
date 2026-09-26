import type { CareDueKind } from '@/lib/domain/constants';

/**
 * When things are due in the car book. Plain logic: the pages, the scan panel
 * and the daily reminder all agree because they all ask this module.
 *
 * Due dates are calendar days stored as UTC midnight, so "today" is Algeria's
 * calendar day expressed the same way.
 */

export type DueStatus = 'overdue' | 'soon' | 'ok' | 'km' | 'unset';

export interface DueInputs {
  /** From the latest oil change entry: typed by hand, by date and/or km. */
  oilChange: { date: Date | null; km: number | null } | null;
  insuranceExpiry: Date | null;
  inspectionDue: Date | null;
  vignetteDue: Date | null;
}

export interface DueItem {
  kind: CareDueKind;
  date: Date | null;
  km: number | null;
  status: DueStatus;
  /** Days from today; negative when late. Null without a date. */
  daysLeft: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const ORDER: Record<DueStatus, number> = { overdue: 0, soon: 1, ok: 2, km: 3, unset: 4 };

/** Algeria's calendar day, as UTC midnight. */
export function algiersToday(now: Date = new Date()): Date {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Algiers',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return new Date(`${day}T00:00:00.000Z`);
}

export function addDays(day: Date, days: number): Date {
  return new Date(day.getTime() + days * DAY_MS);
}

export function dueItem(
  kind: CareDueKind,
  date: Date | null,
  km: number | null,
  today: Date,
  soonDays: number,
): DueItem {
  if (!date) return { kind, date: null, km, status: km !== null ? 'km' : 'unset', daysLeft: null };
  const daysLeft = Math.round((date.getTime() - today.getTime()) / DAY_MS);
  const status: DueStatus = daysLeft < 0 ? 'overdue' : daysLeft <= soonDays ? 'soon' : 'ok';
  return { kind, date, km, status, daysLeft };
}

/** All four, most urgent first; within a status, soonest first. */
export function dueItems(inputs: DueInputs, today: Date, soonDays: number): DueItem[] {
  const items = [
    dueItem('OIL_CHANGE', inputs.oilChange?.date ?? null, inputs.oilChange?.km ?? null, today, soonDays),
    dueItem('INSURANCE', inputs.insuranceExpiry, null, today, soonDays),
    dueItem('INSPECTION', inputs.inspectionDue, null, today, soonDays),
    dueItem('VIGNETTE', inputs.vignetteDue, null, today, soonDays),
  ];
  return items.sort(
    (a, b) => ORDER[a.status] - ORDER[b.status] || (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity),
  );
}

/** The one thing worth a line on the dashboard: late or due soon, else nothing. */
export function mostUrgent(items: DueItem[]): DueItem | null {
  const first = items[0];
  return first && (first.status === 'overdue' || first.status === 'soon') ? first : null;
}

/**
 * How many dates need looking at, across every car: late or due soon. `late`
 * says whether any of them has already passed — the badge turns red then.
 */
export function countDueSoon(
  dueByCar: Iterable<DueInputs>,
  today: Date,
  soonDays: number,
): { count: number; late: boolean } {
  let count = 0;
  let late = false;
  for (const inputs of dueByCar) {
    for (const item of dueItems(inputs, today, soonDays)) {
      if (item.status === 'overdue') late = true;
      if (item.status === 'overdue' || item.status === 'soon') count++;
    }
  }
  return { count, late };
}
