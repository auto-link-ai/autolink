import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { fontVariables } from '@/lib/fonts';
import { siteOrigin } from '@/lib/site/seo';
import '../globals.css';

/**
 * A third real root (see app/layout.tsx): the Arabic ad page, reached from
 * Facebook / Instagram / TikTok ads. No site menu, no language switch: the
 * designer's page and nothing else.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: 'AutoLink — ملصق QR لسيارتك',
  description: 'خلّي الناس يتواصلو معاك ورقمك مخبي: ملصق QR على زجاج سيارتك، الدفع عند الاستلام.',
  alternates: { canonical: '/offre' },
  openGraph: {
    type: 'website',
    locale: 'ar_DZ',
    url: '/offre',
    title: 'AutoLink — ملصق QR لسيارتك',
    description: 'خلّي الناس يتواصلو معاك ورقمك مخبي: ملصق QR على زجاج سيارتك، الدفع عند الاستلام.',
    images: [{ url: '/images/offre/og.jpg', width: 1200, height: 630, alt: 'AutoLink — سيارتك غالقة الطريق وانت بعيد؟' }],
  },
};

export const viewport: Viewport = { themeColor: '#241d19' };

export default function OfferLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${fontVariables} motion-safe:scroll-smooth`}>
      <body>{children}</body>
    </html>
  );
}
