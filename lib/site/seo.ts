import type { Metadata } from 'next';
import { defaultLocale, locales, type Locale } from '@/i18n/locales';

const OG_LOCALE: Record<Locale, string> = { fr: 'fr_DZ', ar: 'ar_DZ', en: 'en_US' };

/** Site origin for canonical URLs, sitemap and Open Graph (NEXT_PUBLIC_APP_URL). */
export function siteOrigin(): URL {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  } catch {
    return new URL('http://localhost:3000');
  }
}

/** Canonical + hreflang alternates for a public page path ('' for home). */
export function languageAlternates(path: string): NonNullable<Metadata['alternates']>['languages'] {
  return {
    ...Object.fromEntries(locales.map((l) => [l, `/${l}${path}`])),
    'x-default': `/${defaultLocale}${path}`,
  };
}

export function pageMetadata(
  locale: Locale,
  path: string,
  { title, description }: { title: string; description: string },
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: `/${locale}${path}`, languages: languageAlternates(path) },
    openGraph: {
      type: 'website',
      siteName: 'AutoLink',
      title,
      description,
      url: `/${locale}${path}`,
      locale: OG_LOCALE[locale],
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}
