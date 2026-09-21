import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CashIcon, CheckIcon, PhoneIcon, QrIcon, TruckIcon } from '@/components/site/icons';
import { href } from '@/components/site/links';
import { buttonClasses } from '@/components/ui/Button';
import { routing } from '@/i18n/routing';
import { ordersRepository } from '@/lib/db/repositories/orders';
import { wilayasRepository } from '@/lib/db/repositories/wilayas';
import { formatDzd } from '@/lib/format/currency';
import { isValidOrderRef } from '@/lib/orders/ref';
import { ORDER_VIEW_COOKIE, isValidOrderViewToken } from '@/lib/orders/viewToken';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string; orderRef: string }> };

/** A confirmation page must never be indexed: it can carry the order details. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'order.confirmation' });
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/**
 * The whole road to a working sticker. It used to stop at paying — and the step
 * that makes the sticker theirs, activating it, was nowhere on the page.
 */
const NEXT_STEPS = [
  { key: 'call', Icon: PhoneIcon },
  { key: 'deliver', Icon: TruckIcon },
  { key: 'pay', Icon: CashIcon },
  { key: 'activate', Icon: QrIcon },
] as const;

export default async function OrderConfirmationPage({ params }: Props) {
  const { locale, orderRef } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  if (!isValidOrderRef(orderRef)) notFound();

  const t = await getTranslations('order.confirmation');
  const order = await ordersRepository.findByRef(orderRef);
  if (!order) notFound();

  // Personal details are shown only to the browser that placed the order.
  const cookie = (await cookies()).get(ORDER_VIEW_COOKIE)?.value ?? '';
  const [cookieRef, token] = cookie.split('.');
  const mine = cookieRef === orderRef && isValidOrderViewToken(orderRef, token);

  const wilaya = mine ? (await wilayasRepository.list()).find((w) => w.code === order.wilayaCode) : undefined;
  const wilayaName = wilaya ? (locale === 'ar' ? wilaya.nameAr : locale === 'en' ? wilaya.nameEn : wilaya.nameFr) : '';

  return (
    <section className="py-12 md:py-20">
      <div className="container-page max-w-225">
        <div className="rounded-xl bg-white p-7 shadow-card-md md:p-10">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <CheckIcon className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-h1 text-text">{t('title')}</h1>
          <p className="mt-3 max-w-[56ch] text-[16px] leading-relaxed text-text-secondary">{t('body')}</p>

          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl bg-surface-3 px-5 py-4">
            <div>
              <p className="text-sm text-text-muted">{t('refLabel')}</p>
              <p dir="ltr" className="font-mono text-xl font-bold text-accent">
                {order.orderRef}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-muted">{t('statusLabel')}</p>
              <p className="font-bold text-text">{t(`status.${order.status}`)}</p>
            </div>
          </div>

          {mine ? (
            <dl className="mt-8 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-text-muted">{t('summary.name')}</dt>
                <dd className="font-semibold text-text">{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-sm text-text-muted">{t('summary.phone')}</dt>
                <dd dir="ltr" className="font-semibold text-text">
                  {order.phone}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-text-muted">{t('summary.address')}</dt>
                <dd className="font-semibold text-text">
                  {order.address}, {order.commune}
                  {wilayaName && ` (${wilayaName})`}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-text-muted">{t('summary.delivery')}</dt>
                <dd className="font-semibold text-text">
                  {t(`summary.${order.deliveryType === 'HOME' ? 'home' : 'stopdesk'}`)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-text-muted">{t('summary.quantity')}</dt>
                <dd className="font-semibold text-text">{order.quantity}</dd>
              </div>
              <div>
                <dt className="text-sm text-text-muted">{t('summary.total')}</dt>
                <dd dir="ltr" className="text-h3 text-accent">
                  {formatDzd(order.totalPrice)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-8 border-t border-border pt-6 text-[15px] leading-relaxed text-text-secondary">
              {t('privateNote')}
            </p>
          )}

          <h2 className="mt-8 border-t border-border pt-6 text-[17px] font-bold text-text">{t('nextTitle')}</h2>
          <ol className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {NEXT_STEPS.map(({ key, Icon }, index) => (
              <li key={key} className="flex gap-3">
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-3 text-accent">
                  <Icon className="h-5 w-5" />
                  <span className="absolute -inset-e-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent font-mono text-[10px] font-bold text-white">
                    {index + 1}
                  </span>
                </span>
                <div>
                  <p className="text-[15px] leading-relaxed text-text-secondary">{t(`next.${key}`)}</p>
                  {key === 'activate' && (
                    <Link href={href(locale, '/register')} className="mt-1 inline-block text-sm font-bold text-accent hover:underline">
                      {t('activateLink')}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <Link href={href(locale, '')} className={buttonClasses('secondary', 'md', 'mt-8')}>
            {t('backHome')}
          </Link>
        </div>
      </div>
    </section>
  );
}
