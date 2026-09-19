import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { CtaBand } from '@/components/site/sections/CtaBand';
import { Faq } from '@/components/site/sections/Faq';
import { Pricing } from '@/components/site/sections/Pricing';
import { PageHero } from '@/components/site/sections/SectionHeading';
import { routing } from '@/i18n/routing';
import { getPublicPricing } from '@/lib/site/pricing';
import { pageMetadata } from '@/lib/site/seo';

// The price comes from settings, so the page is rendered per request.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'site.pages.pricing' });
  return pageMetadata(locale, '/pricing', { title: t('metaTitle'), description: t('metaDescription') });
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('site.pages.pricing');
  const pricing = await getPublicPricing();

  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
      <Pricing locale={locale} pricing={pricing} headingLevel="none" />
      <Faq locale={locale} pricing={pricing} keys={['price', 'pay', 'activate', 'change']} />
      <CtaBand locale={locale} />
    </>
  );
}
