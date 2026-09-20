import { isLocale, locales, defaultLocale, type Locale } from '@/i18n/locales';

/**
 * `/t/[tagId]` carries no locale prefix — the printed QR has to stay short —
 * so the page picks the language itself: an explicit `?lang=` first (the
 * switcher on the page), otherwise the best match from Accept-Language,
 * otherwise French.
 */
export function scannerLocale(acceptLanguage: string | null, requested?: string | null): Locale {
  if (isLocale(requested)) return requested;

  const ranked = (acceptLanguage ?? '')
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='))?.split('=')[1];
      return { tag: (tag ?? '').trim().toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((entry) => entry.tag && Number.isFinite(entry.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    // "fr-DZ" and "fr" both mean French.
    const base = tag.split('-')[0];
    const match = locales.find((locale) => locale === base);
    if (match) return match;
  }
  return defaultLocale;
}
