import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/site/seo';

/** Public pages are indexable; the admin, the API and scanner pages are not. */
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/t/', '/fr/admin', '/ar/admin', '/en/admin', '/fr/order/', '/ar/order/', '/en/order/'],
      },
    ],
    sitemap: new URL('/sitemap.xml', origin).toString(),
  };
}
