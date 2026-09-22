import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PageHero } from '@/components/site/sections/SectionHeading';
import { routing } from '@/i18n/routing';
import { getSettings } from '@/lib/config/settings';
import { wilayasRepository } from '@/lib/db/repositories/wilayas';
import { pageMetadata } from '@/lib/site/seo';
import { OrderForm } from './OrderForm';
import type { OrderFormLabels } from './orderLabels';
import { ORDER_STEPS } from './orderSteps';

// Price, delivery fees and the wilaya list come from the database.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'order' });
  return pageMetadata(locale, '/order', { title: t('metaTitle'), description: t('metaDescription') });
}

export default async function OrderPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('order');

  let data: { settings: Awaited<ReturnType<typeof getSettings>>; wilayas: Awaited<ReturnType<typeof wilayasRepository.list>> } | null =
    null;
  try {
    const [settings, wilayas] = await Promise.all([getSettings(), wilayasRepository.list()]);
    if (wilayas.length > 0) data = { settings, wilayas };
  } catch (error) {
    console.error('[order] cannot load settings:', error instanceof Error ? error.message : error);
  }

  const labels: OrderFormLabels = {
    fields: {
      quantity: t('fields.quantity'),
      name: t('fields.name'),
      phone: t('fields.phone'),
      phoneHint: t('fields.phoneHint'),
      email: t('fields.email'),
      emailHint: t('fields.emailHint'),
      wilaya: t('fields.wilaya'),
      wilayaPlaceholder: t('fields.wilayaPlaceholder'),
      commune: t('fields.commune'),
      address: t('fields.address'),
      deliveryType: t('fields.deliveryType'),
      home: t('fields.home'),
      stopdesk: t('fields.stopdesk'),
      notes: t('fields.notes'),
      notesHint: t('fields.notesHint'),
    },
    summary: {
      title: t('summary.title'),
      unitPrice: t('summary.unitPrice'),
      quantity: t('summary.quantity'),
      delivery: t('summary.delivery'),
      deliveryUnknown: t('summary.deliveryUnknown'),
      total: t('summary.total'),
      cod: t('summary.cod'),
    },
    steps: {
      quantity: t('steps.quantity'),
      contact: t('steps.contact'),
      delivery: t('steps.delivery'),
      review: t('steps.review'),
    },
    progress: ORDER_STEPS.map((_, index) => t('progress', { step: index + 1, total: ORDER_STEPS.length })),
    actions: {
      continue: t('actions.continue'),
      back: t('actions.back'),
      edit: t('actions.edit'),
      confirm: t('actions.confirm'),
      confirming: t('actions.confirming'),
    },
    errors: {
      required: t('errors.required'),
      invalid: t('errors.invalid'),
      too_short: t('errors.too_short'),
      too_long: t('errors.too_long'),
      too_small: t('errors.too_small'),
      too_large: t('errors.too_large'),
      invalid_phone: t('errors.invalid_phone'),
      invalid_email: t('errors.invalid_email'),
      no_delivery: t('errors.no_delivery'),
      rate_limited: t('errors.rate_limited'),
      rejected: t('errors.rejected'),
      server_error: t('errors.server_error'),
    },
    notice: t('notice'),
  };

  const wilayaName = (w: { nameFr: string; nameAr: string; nameEn: string }) =>
    locale === 'ar' ? w.nameAr : locale === 'en' ? w.nameEn : w.nameFr;

  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
      <section className="pb-16 pt-4 md:pb-24">
        <div className="container-page">
          {data ? (
            <OrderForm
              locale={locale}
              labels={labels}
              wilayas={data.wilayas.map((w) => ({ code: w.code, name: wilayaName(w) }))}
              fees={data.settings.deliveryFees}
              unitPrice={data.settings.unitPriceDzd}
              currencyLabel={data.settings.currencyLabel}
              maxQuantity={data.settings.maxOrderQuantity}
            />
          ) : (
            <p role="alert" className="rounded-xl bg-white p-6 text-[15px] text-text-secondary shadow-card-sm">
              {t('unavailable')}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
