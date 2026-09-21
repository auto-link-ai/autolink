import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { DueChip, dueSentence } from '@/components/care/DueList';
import { buttonClasses } from '@/components/ui/Button';
import { routing } from '@/i18n/routing';
import { requireOwner } from '@/lib/auth/session';
import { algiersToday, dueItems, mostUrgent } from '@/lib/care/due';
import { carBookPath } from '@/lib/care/sections';
import { getSettings } from '@/lib/config/settings';
import { carBookRepository } from '@/lib/db/repositories/carBook';
import { BookCard, BookHeader } from './[tagId]/_components/parts';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'care' });
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/**
 * "Carnet" in the menu. One car: straight to its book. Several: pick one.
 * None yet: say how the car book starts.
 */
export default async function CarBooksPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireOwner(locale, `/${locale}/dashboard/car`);

  const cars = await carBookRepository.listCars(session.actor);
  if (cars.length === 1) redirect(carBookPath(locale, cars[0]!.publicTagId));

  const [t, tNav, settings] = await Promise.all([getTranslations('care'), getTranslations('site.nav'), getSettings()]);
  const today = algiersToday();
  const rows = await Promise.all(
    cars.map(async (car) => {
      const urgent = mostUrgent(dueItems(car.due, today, settings.careReminderDays));
      return {
        ...car,
        urgent,
        urgentText: urgent ? `${t(`due.kinds.${urgent.kind}`)} · ${await dueSentence(urgent, locale)}` : null,
      };
    }),
  );

  return (
    <section className="py-8 md:py-12">
      <div className="container-page flex max-w-190 flex-col gap-6">
        <BookHeader
          crumbs={[{ label: t('back'), href: `/${locale}/dashboard` }, { label: tNav('carBook') }]}
          title={cars.length === 0 ? t('empty.title') : t('choose.title')}
        >
          {cars.length > 0 && <p className="mt-2 text-[16px] text-text-secondary">{t('choose.subtitle')}</p>}
        </BookHeader>

        {cars.length === 0 ? (
          <BookCard>
            <p className="text-[16px] leading-relaxed text-text-secondary">{t('empty.body')}</p>
            <a href={`/${locale}/activate`} className={buttonClasses('primary', 'md', 'mt-5 w-full sm:w-auto')}>
              {t('empty.cta')}
            </a>
          </BookCard>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((car) => (
              <li key={car.publicTagId}>
                <a
                  href={carBookPath(locale, car.publicTagId)}
                  className="flex min-h-18 items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-card-sm transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-bold text-text">
                      {car.car.brand} {car.car.model}
                      <span className="font-normal text-text-muted"> · {car.car.color}</span>
                    </span>
                    <span dir="ltr" className="block font-mono text-sm text-text-secondary rtl:text-end">
                      {car.publicTagId}
                    </span>
                    {car.urgentText && <span className="block text-sm font-semibold text-text">{car.urgentText}</span>}
                  </span>
                  {car.urgent && <DueChip status={car.urgent.status} locale={locale} />}
                  <span aria-hidden="true" className="inline-block text-2xl leading-none text-text-muted rtl:rotate-180">
                    ›
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
