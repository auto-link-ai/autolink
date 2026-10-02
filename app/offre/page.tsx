import { getTranslations } from 'next-intl/server';
import { OrderForm } from '@/app/[locale]/(site)/order/OrderForm';
import { loadOrderFormData, orderFormLabels } from '@/app/[locale]/(site)/order/orderFormData';
import type { Locale } from '@/i18n/locales';
import { OfferHeader } from './_components/OfferHeader';
import { OFFER_ANCHOR, OFFER_SLICES, type OfferSlice } from './slices';

// The price, the fees and the wilaya list come from the database.
export const dynamic = 'force-dynamic';

/** An Arabic page, like the design. */
const LOCALE: Locale = 'ar';
/** The order form's own id (OrderForm): where every « اطلب » in the picture leads. */
const FORM_ANCHOR = 'order-form';

/** One slice of the designer's picture, with a real link on each button drawn in it. */
function Slice({ slice, first }: { slice: OfferSlice; first?: boolean }) {
  return (
    <section id={slice.anchor} className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element -- slices are pre-sized WebP, nothing for an optimiser to do */}
      <img
        src={slice.src}
        width={slice.width}
        height={slice.height}
        alt={slice.alt}
        loading={first ? 'eager' : 'lazy'}
        fetchPriority={first ? 'high' : undefined}
        decoding="async"
        className="block h-auto w-full"
      />
      {slice.buttons.map((button) => (
        <a
          key={button.label}
          href={button.to === 'order' ? `#${FORM_ANCHOR}` : `#${OFFER_ANCHOR}`}
          aria-label={button.label}
          data-offer-button={button.to}
          className="absolute rounded-full focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white"
          style={{
            top: `${button.box.top}%`,
            height: `${button.box.height}%`,
            left: `${button.box.left}%`,
            width: `${button.box.width}%`,
          }}
        />
      ))}
    </section>
  );
}

/**
 * The ad page as a cash-on-delivery page: the top of the design, the title and
 * the live price, a short order form — quantity, name, phone, wilaya; commune
 * and address are taken on the confirmation call — then the rest of the design,
 * whose « اطلب » buttons all come back up to the form. After ordering: the
 * usual confirmation page.
 */
export default async function OfferPage() {
  const [first, ...rest] = OFFER_SLICES as [OfferSlice, ...OfferSlice[]];
  const [data, labels, t, tFooter] = await Promise.all([
    loadOrderFormData(LOCALE),
    orderFormLabels(LOCALE),
    getTranslations({ locale: LOCALE, namespace: 'order' }),
    getTranslations({ locale: LOCALE, namespace: 'site.footer' }),
  ]);

  return (
    <main className="min-h-dvh bg-surface-inverse">
      <div className="mx-auto w-full max-w-150">
        <Slice slice={first} first />
        {data ? (
          <>
            <OfferHeader locale={LOCALE} priceLabel={data.pricing.unitPriceLabel} />
            <div className="bg-surface px-3 pb-8 sm:px-4">
              <OrderForm
                locale={LOCALE}
                labels={labels}
                wilayas={data.wilayas}
                fees={data.settings.deliveryFees}
                unitPrice={data.settings.unitPriceDzd}
                currencyLabel={data.settings.currencyLabel}
                maxQuantity={data.settings.maxOrderQuantity}
                whatsapp={data.whatsapp}
                short
              />
            </div>
          </>
        ) : (
          <p role="alert" className="bg-surface px-5 py-8 text-center text-[15px] text-text-secondary">
            {t('unavailable')}
          </p>
        )}
        {rest.map((slice) => (
          <Slice key={slice.src} slice={slice} />
        ))}
        {/*
          The page's end. On a phone the order bar hides while a footer is on
          screen, so it never covers the design's last button.
        */}
        <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 pt-6 pb-10 text-sm text-text-secondary-on-inverse">
          <a href={`/${LOCALE}`} className="inline-flex min-h-11 items-center font-bold text-text-on-inverse hover:underline">
            qauto.store
          </a>
          <a href={`/${LOCALE}/privacy`} className="inline-flex min-h-11 items-center hover:underline">
            {tFooter('privacy')}
          </a>
          <a href={`/${LOCALE}/terms`} className="inline-flex min-h-11 items-center hover:underline">
            {tFooter('terms')}
          </a>
        </footer>
      </div>
    </main>
  );
}
