/**
 * 85000 → "85 000": Western digits in every locale, as formatDzd. The separator
 * is a NO-BREAK SPACE on purpose: between two digits it keeps them one number
 * in right-to-left Arabic text, where a plain space would print "000 85".
 */
export function groupThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
