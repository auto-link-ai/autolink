import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/config/site';

/**
 * Lets an owner add AutoLink to their Home Screen — which is what an iPhone
 * requires before it allows any website to send notifications. It is the same
 * website, opened without the browser bar; nothing is cached or installed.
 *
 * The start page is the owner's dashboard; the language middleware adds the
 * locale. Colours match `--cream` and `--orange` in app/globals.css.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.brand,
    short_name: SITE.brand,
    description: 'Messages about your car, without sharing your number.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#fdf7f3',
    theme_color: '#f2541b',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
