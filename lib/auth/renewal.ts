/**
 * The sign-in is renewed at most once a day: the first page an owner opens
 * that day asks Auth.js for a fresh cookie, the others do not. Plain logic, so
 * it runs in unit tests; the day is the phone's own calendar day.
 */
export const RENEWED_ON_KEY = 'autolink:signin-renewed-on';

/** « 2026-10-01 » for the given moment, in the phone's own time zone. */
export function localDay(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Renew unless it was already done today. Unknown (no storage, first visit): renew. */
export function shouldRenew(renewedOn: string | null, today: string): boolean {
  return renewedOn !== today;
}
