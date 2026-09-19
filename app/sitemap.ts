import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/locales';
import { SITE_PAGES } from '@/components/site/links';
import { siteOrigin } from '@/lib/site/seo';

/** The seven public pages in three languages, each listing its alternates. */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  const url = (locale: string, path: string) => new URL(`/${locale}${path}`, origin).toString();

  return SITE_PAGES.flatMap((path) =>
    locales.map((locale) => ({
      url: url(locale, path),
      changeFrequency: 'monthly' as const,
      priority: path === '' ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(locales.map((other) => [other, url(other, path)])),
      },
    })),
  );
}
