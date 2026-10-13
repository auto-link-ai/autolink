import { getTranslations } from 'next-intl/server';

/** Every error code the owner forms can show, translated once for all of them. */
const CODES = [
  'invalid',
  'too_short',
  'too_long',
  'required',
  'invalid_phone',
  'pin_format',
  'pin_weak',
  'pin_mismatch',
  'invalid_credentials',
  'throttled',
  'rate_limited',
  'code_invalid',
  'code_expired',
  'code_too_soon',
  'code_unavailable',
  'send_failed',
  'server_error',
] as const;

export async function authErrorLabels(): Promise<Record<string, string>> {
  const t = await getTranslations('auth.errors');
  return Object.fromEntries(CODES.map((code) => [code, t(code)]));
}
