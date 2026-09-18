import { z } from 'zod';
import { toAsciiDigits } from './digits';

/**
 * Algerian mobile numbers — the single shared validator.
 *
 * Accepted: 05/06/07 + 8 digits, optionally written with +213 or 00213 in place
 * of the leading 0. Spaces, dots, dashes and parentheses are ignored, and
 * Arabic-Indic digits are accepted. Stored form is always `0XXXXXXXXX`.
 */
const NATIONAL_MOBILE = /^0[567]\d{8}$/;
const SEPARATORS = /[\s.\-() ]/g;

export function normalizeDzPhone(input: string): string | null {
  const compact = toAsciiDigits(input).replace(SEPARATORS, '');

  let national: string;
  if (compact.startsWith('+213')) {
    national = withTrunkZero(compact.slice(4));
  } else if (compact.startsWith('00213')) {
    national = withTrunkZero(compact.slice(5));
  } else {
    national = compact;
  }

  return NATIONAL_MOBILE.test(national) ? national : null;
}

// International form drops the trunk 0 (+213 5…); tolerate people who keep it (+213 05…).
function withTrunkZero(subscriber: string): string {
  return subscriber.startsWith('0') ? subscriber : `0${subscriber}`;
}

export function isValidDzPhone(input: string): boolean {
  return normalizeDzPhone(input) !== null;
}

/** Validates and normalizes. Output is `0XXXXXXXXX`. */
export const dzPhoneSchema = z.string().transform((value, ctx) => {
  const normalized = normalizeDzPhone(value);
  if (!normalized) {
    ctx.addIssue({ code: 'custom', message: 'invalid_phone' });
    return z.NEVER;
  }
  return normalized;
});
