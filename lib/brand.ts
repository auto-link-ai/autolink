/**
 * The logo artwork, in one place: the site links to these public files and the
 * print code reads the same SVG off disk. `width`/`height` are the artwork's
 * own viewBox, so a page reserves the right box before the file loads — a test
 * checks them against the files, since the artwork gets re-exported.
 */
export const BRAND_ASSETS = {
  full: { src: '/brand/autolink-logo.svg', width: 1015, height: 337 },
  mark: { src: '/brand/autolink-mark.svg', width: 387, height: 361 },
} as const;

export type BrandVariant = keyof typeof BRAND_ASSETS;
