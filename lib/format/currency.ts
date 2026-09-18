/**
 * DZD formatting: `1 500 DA`.
 *
 * Western numerals in every locale (Arabic included), space as the thousands
 * separator. The spaces are non-breaking so an amount never wraps across lines.
 * DZD is shown in whole dinars. The label comes from settings.currencyLabel.
 */
const NBSP = ' ';

export function formatDzd(amount: number, label = 'DA'): string {
  if (!Number.isFinite(amount)) {
    throw new RangeError(`formatDzd: expected a finite number, got ${amount}`);
  }
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  const grouped = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${sign}${grouped}${NBSP}${label}`;
}
