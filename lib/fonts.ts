import { Cairo, IBM_Plex_Mono } from 'next/font/google';

/**
 * Cairo for everything people read, in all three languages: it draws Arabic and
 * Latin as one family, so the site looks the same in ar, fr and en. IBM Plex
 * Mono stays for tag IDs, codes and eyebrow labels — in a code, 0/O and 1/I must
 * never be confused, and Cairo has no monospaced cut. Both are self-hosted by
 * next/font: no third-party request at runtime. Cairo is the one preloaded.
 */
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
  preload: false,
});

export const fontVariables = [cairo.variable, plexMono.variable].join(' ');
