import 'server-only';
import { cookies, headers } from 'next/headers';
import type { Locale } from '@/i18n/locales';
import { scannerLocale } from './locale';

/**
 * The language for `/t/[tagId]`, agreed on by the layout (which sets lang/dir)
 * and the page (which loads the copy). A cookie set by the switcher wins;
 * otherwise it follows the phone's own language.
 */
export const SCANNER_LANG_COOKIE = 'autolink_scan_lang';

export async function resolveScannerLocale(): Promise<Locale> {
  const [headerList, jar] = await Promise.all([headers(), cookies()]);
  return scannerLocale(headerList.get('accept-language'), jar.get(SCANNER_LANG_COOKIE)?.value ?? null);
}
