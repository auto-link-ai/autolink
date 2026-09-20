import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { isRtl } from '@/i18n/locales';
import { fontVariables } from '@/lib/fonts';
import { resolveScannerLocale } from '@/lib/scanner/request';
import '../globals.css';

/**
 * The second real root (see app/layout.tsx): the prefix-free scan page, which
 * the printed QR points at. It has no locale in the path, so the language —
 * and with it `lang` and `dir` — is decided here.
 *
 * Never indexed: a scan page belongs to one car, not to search results.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function ScannerLayout({ children }: { children: ReactNode }) {
  const locale = await resolveScannerLocale();

  return (
    <html lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'} className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
