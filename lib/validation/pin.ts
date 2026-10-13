import { z } from 'zod';
import { toAsciiDigits } from './digits';

/**
 * The owner's 4-digit PIN. Plain logic with no server imports, so the forms can
 * use the same rules; hashing lives in lib/security/pin.ts.
 *
 * Error codes, mapped to copy by the forms: `pin_format` (not 4 digits),
 * `pin_weak` (on the easy-to-guess list), `pin_mismatch` (confirmation differs).
 */
export const PIN_LENGTH = 4;
const PIN_PATTERN = /^\d{4}$/;

/** Arabic-Indic digits typed on an Arabic keyboard count, as do stray spaces. */
export function normalizePin(input: string): string {
  return toAsciiDigits(input).replace(/\s/g, '');
}

const RUNS = '01234567890';
const SNIPPETS = new Set(['1212', '2580', '1122', '6969', '2000', '1004']);

/**
 * The PINs a stranger tries first: one digit repeated, a run up or down, the
 * classics (2580 is the keypad's middle column), and the end of the owner's own
 * phone number — the first thing someone who has it would guess.
 */
export function isWeakPin(pin: string, phone?: string | null): boolean {
  if (/^(\d)\1{3}$/.test(pin)) return true;
  if (RUNS.includes(pin) || [...RUNS].reverse().join('').includes(pin)) return true;
  if (SNIPPETS.has(pin)) return true;
  const digits = phone ? toAsciiDigits(phone).replace(/\D/g, '') : '';
  return digits.length >= PIN_LENGTH && digits.endsWith(pin);
}

/** Any PIN the owner types to sign in: only the shape is checked. */
export const pinSchema = z
  .string()
  .transform(normalizePin)
  .pipe(z.string().regex(PIN_PATTERN, 'pin_format'));

/** The first problem with a PIN being chosen, or null when it is fine. */
export function newPinProblem(pin: string, confirm: string, phone?: string | null): 'pin_format' | 'pin_weak' | 'pin_mismatch' | null {
  const value = normalizePin(pin);
  if (!PIN_PATTERN.test(value)) return 'pin_format';
  if (isWeakPin(value, phone)) return 'pin_weak';
  if (normalizePin(confirm) !== value) return 'pin_mismatch';
  return null;
}
