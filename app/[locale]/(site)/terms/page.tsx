import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { LegalDocument } from '@/components/site/LegalDocument';
import { routing } from '@/i18n/routing';
import { getPublicPricing } from '@/lib/site/pricing';
import { pageMetadata } from '@/lib/site/seo';

// The retention period is read from settings.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'legal.terms' });
  return pageMetadata(locale, '/terms', { title: t('title'), description: t('metaDescription') });
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const price = await getTranslations('site.price');
  const pricing = await getPublicPricing();
  const period = pricing ? price('retentionDays', { days: pricing.retentionDays }) : price('retentionUnknown');

  return <LegalDocument doc="terms" period={period} />;
}
