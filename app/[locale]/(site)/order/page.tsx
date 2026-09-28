import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PageHero } from '@/components/site/sections/SectionHeading';
import { routing } from '@/i18n/routing';
import { getSettings } from '@/lib/config/settings';
import { getWilayas } from '@/lib/config/wilayas';
import { pageMetadata } from '@/lib/site/seo';
import { OrderForm } from './OrderForm';
import type { OrderFormLabels } from './orderLabels';

// Price, delivery fees and the wilaya list come from the database.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

const ERROR_CODES = [
  'required',
  'invalid',
  'too_short',
  'too_long',
  'too_small',
  'too_large',
  'invalid_phone',
  'invalid_email',
  'no_delivery',
  'rate_limited',
  'rejected',
  'server_error',
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'order' });
  return pageMetadata(locale, '/order', { title: t('metaTitle'), description: t('metaDescription') });
}

async function formLabels(): Promise<OrderFormLabels> {
  const t = await getTranslations('order');
  const field = (key: keyof OrderFormLabels['fields']) => t(`fields.${key}`);
  return {
    fields: {
      name: field('name'),
      phone: field('phone'),
      phoneHint: field('phoneHint'),
      email: field('email'),
      emailHint: field('emailHint'),
      wilaya: field('wilaya'),
      wilayaPlaceholder: field('wilayaPlaceholder'),
      commune: field('commune'),
      address: field('address'),
      deliveryType: field('deliveryType'),
      home: field('home'),
      stopdesk: field('stopdesk'),
      notes: field('notes'),
      notesHint: field('notesHint'),
    },
    sections: { quantity: t('sections.quantity'), contact: t('sections.contact'), delivery: t('sections.delivery') },
    quantity: {
      hint: t('quantity.hint'),
      cars: t.raw('quantity.cars') as [string, string, string],
      more: t('quantity.more'),
      stickers: t('quantity.stickers'),
      fewer: t('quantity.fewer'),
      oneMore: t('quantity.oneMore'),
    },
    feeAfterWilaya: t('feeAfterWilaya'),
    free: t('free'),
    extras: t('extras'),
    total: {
      stickers: t('total.stickers'),
      delivery: t('total.delivery'),
      deliveryPending: t('total.deliveryPending'),
      total: t('total.total'),
      nothingNow: t('total.nothingNow'),
    },
    actions: { order: t('actions.order'), ordering: t('actions.ordering') },
    checkFields: t('checkFields'),
    reassurance: t('reassurance'),
    errors: Object.fromEntries(ERROR_CODES.map((code) => [code, t(`errors.${code}`)])),
    notice: t('notice'),
  };
}

export default async function OrderPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('order');

  let data: { settings: Awaited<ReturnType<typeof getSettings>>; wilayas: Awaited<ReturnType<typeof getWilayas>> } | null =
    null;
  try {
    const [settings, wilayas] = await Promise.all([getSettings(), getWilayas()]);
    if (wilayas.length > 0) data = { settings, wilayas };
  } catch (error) {
    console.error('[order] cannot load settings:', error instanceof Error ? error.message : error);
  }

  const wilayaName = (w: { nameFr: string; nameAr: string; nameEn: string }) =>
    locale === 'ar' ? w.nameAr : locale === 'en' ? w.nameEn : w.nameFr;

  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
      <section className="pb-16 pt-4 md:pb-24">
        <div className="container-page max-w-3xl">
          {data ? (
            <OrderForm
              locale={locale}
              labels={await formLabels()}
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
