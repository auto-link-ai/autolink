import { z } from 'zod';
import { toAsciiDigits } from './digits';
import { applyCrockfordAliases } from './tagId';

/**
 * Private activation codes: 10 Crockford base32 characters (50 bits), printed
 * as XXXX-XXXX-XX on a slip that is separate from the sticker. Stored only as
 * an argon2id hash of the canonical (hyphenated) form.
 */
export const ACTIVATION_CODE_LENGTH = 10;
export const ACTIVATION_CODE_PATTERN =
  /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{2}$/;

const RAW_PATTERN = /^[0-9A-HJKMNP-TV-Z]{10}$/;

/** Formats 10 raw characters as XXXX-XXXX-XX. */
export function formatActivationCode(raw: string): string {
  if (!RAW_PATTERN.test(raw)) {
    throw new RangeError('formatActivationCode: expected 10 Crockford base32 characters');
  }
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}

export function isValidActivationCodeShape(value: unknown): value is string {
  return typeof value === 'string' && ACTIVATION_CODE_PATTERN.test(value);
}

/**
 * Lenient normalization for a code a person types: any case, spaces or hyphens
 * anywhere, I/L/O typos, Arabic-Indic digits. Returns the canonical form or null.
 */
export function normalizeActivationCodeInput(input: string): string | null {
  const compact = applyCrockfordAliases(
    toAsciiDigits(input).toUpperCase().replace(/[\s\-_]/g, ''),
  );
  return RAW_PATTERN.test(compact) ? formatActivationCode(compact) : null;
}

export const activationCodeInputSchema = z.string().transform((value, ctx) => {
  const normalized = normalizeActivationCodeInput(value);
  if (!normalized) {
    ctx.addIssue({ code: 'custom', message: 'invalid_activation_code' });
    return z.NEVER;
  }
  return normalized;
});
