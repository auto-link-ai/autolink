import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { CtaBand } from '@/components/site/sections/CtaBand';
import { Demo } from '@/components/site/sections/Demo';
import { Faq, HOME_FAQ } from '@/components/site/sections/Faq';
import { Hero } from '@/components/site/sections/Hero';
import { HowItWorks } from '@/components/site/sections/HowItWorks';
import { Pricing } from '@/components/site/sections/Pricing';
import { PrivacyBand } from '@/components/site/sections/PrivacyBand';
import { Scenarios } from '@/components/site/sections/Scenarios';
import { routing } from '@/i18n/routing';
import { getPublicPricing } from '@/lib/site/pricing';
import { pageMetadata } from '@/lib/site/seo';

// The price comes from settings, so the page is rendered per request.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'meta' });
  return pageMetadata(locale, '', { title: t('title'), description: t('description') });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const pricing = await getPublicPricing();

  return (
    <>
      <Hero locale={locale} pricing={pricing} />
      <HowItWorks locale={locale} />
      <Scenarios />
      <PrivacyBand />
      <Demo />
      <Pricing locale={locale} pricing={pricing} />
      <Faq locale={locale} pricing={pricing} keys={HOME_FAQ} showAllLink />
      <CtaBand locale={locale} />
    </>
  );
}
