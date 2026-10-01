import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { deliveryFreeEverywhere } from '@/lib/orders/totals';
import { pageMetadata } from '@/lib/site/seo';
import { OrderExtras } from './_components/OrderExtras';
import { ProductGallery, ProductIntro } from './_components/ProductShowcase';
import { OrderForm } from './OrderForm';
import { loadOrderFormData, orderFormLabels } from './orderFormData';

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
  const [t, data] = await Promise.all([getTranslations('order'), loadOrderFormData(locale)]);

  if (!data) {
    return (
      <section className="pb-16 pt-6 md:pt-10">
        <div className="container-page grid gap-8 lg:grid-cols-2">
          <ProductGallery />
          <p role="alert" className="self-start rounded-xl bg-white p-6 text-[15px] text-text-secondary shadow-card-sm">
            {t('unavailable')}
          </p>
        </div>
      </section>
    );
  }

  const { settings, wilayas, pricing, whatsapp } = data;
  return (
    <>
      {/*
        Phone: headline and price, the sticker, then the form. Wide screen: the
        sticker stays in view on the left while the form scrolls on the right.
      */}
      <section className="pb-6 pt-6 md:pt-10">
        <div className="container-page grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-x-12">
          <div className="lg:col-start-2">
            <ProductIntro priceLabel={pricing.unitPriceLabel} freeDelivery={deliveryFreeEverywhere(settings.deliveryFees)} />
          </div>
          <ProductGallery className="lg:sticky lg:top-28 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start" />
          <div className="lg:col-start-2">
            <OrderForm
              locale={locale}
              labels={await orderFormLabels(locale)}
              wilayas={wilayas}
              fees={settings.deliveryFees}
              unitPrice={settings.unitPriceDzd}
              currencyLabel={settings.currencyLabel}
              maxQuantity={settings.maxOrderQuantity}
              whatsapp={whatsapp}
            />
          </div>
        </div>
      </section>
      <OrderExtras locale={locale} pricing={pricing} whatsapp={whatsapp} />
    </>
  );
}
