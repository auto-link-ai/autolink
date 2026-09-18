import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google';

/**
 * One family across all three scripts: IBM Plex Sans (Latin), IBM Plex Sans
 * Arabic (with system "Noto Sans Arabic" as fallback, see globals.css), and
 * IBM Plex Mono for eyebrow labels. Self-hosted by next/font — no third-party
 * request at runtime. Only the Latin face is preloaded; the others load on demand.
 */
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-sans',
  display: 'swap',
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-arabic',
  display: 'swap',
  preload: false,
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
  preload: false,
});

export const fontVariables = [plexSans.variable, plexArabic.variable, plexMono.variable].join(' ');
