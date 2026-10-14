/**
 * A sticker's paid service period. Plain logic, safe anywhere: the dashboard,
 * the admin, the renewal and the daily warning all agree because they all ask
 * this module. Lengths and the warning window come from settings (rule 5).
 */

export type ServiceState = 'ok' | 'soon' | 'expired' | 'undated';

const DAY_MS = 24 * 60 * 60 * 1000;

/** `date` plus `months` calendar months, same time of day. 31 January + 1 month is the last day of February. */
export function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getTime());
  const day = target.getUTCDate();
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

/**
 * Where a confirmed renewal moves the end to: `months` after the current end,
 * or after today if it has already passed. Renewing early loses nothing;
 * renewing late does not pay for the weeks the sticker was off.
 */
export function extendServiceUntil(current: Date | null, now: Date, months: number): Date {
  const from = current && current > now ? current : now;
  return addMonths(from, months);
}

/**
 * `soon` from `warningDays` before the end. `undated` is a sticker linked
 * before service periods existed and not dated yet: it still works.
 */
export function serviceState(serviceUntil: Date | null, now: Date, warningDays: number): ServiceState {
  if (!serviceUntil) return 'undated';
  if (serviceUntil <= now) return 'expired';
  return serviceUntil.getTime() - now.getTime() <= warningDays * DAY_MS ? 'soon' : 'ok';
}

/**
 * How copy names a length of service (`common.period`): in years when the
 * months make whole years — « 2 ans », « سنتين » — in months otherwise.
 */
export function periodParts(months: number): { unit: 'year' | 'month'; count: number } {
  return months % 12 === 0 ? { unit: 'year', count: months / 12 } : { unit: 'month', count: months };
}
