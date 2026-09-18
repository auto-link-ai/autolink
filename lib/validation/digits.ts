/**
 * Converts Arabic-Indic (٠-٩) and Extended Arabic-Indic (۰-۹) digits to ASCII,
 * so numbers typed on an Arabic keyboard validate the same as Western ones.
 */
export function toAsciiDigits(input: string): string {
  // Both blocks start at a code point ending in 0 (U+0660, U+06F0), so the low nibble is the digit.
  return input.replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 0x0f));
}
