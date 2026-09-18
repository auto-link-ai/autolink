import { defineRouting } from 'next-intl/routing';
import { defaultLocale, locales } from './locales';

/**
 * Every route is locale-prefixed (/fr, /ar, /en) except /t/[tagId], which is
 * excluded in middleware.ts so the printed QR URL stays short.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
});
