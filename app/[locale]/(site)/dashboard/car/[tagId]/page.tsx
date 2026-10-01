import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { LockIcon } from '@/components/site/icons';
import { PendingLink } from '@/components/ui/PendingLink';
import { routing } from '@/i18n/routing';
import { requireOwner } from '@/lib/auth/session';
import { algiersToday, dueItems } from '@/lib/care/due';
import { carBookPath } from '@/lib/care/sections';
import { getSettings } from '@/lib/config/settings';
import { carBookRepository } from '@/lib/db/repositories/carBook';
import { CarCard } from './_components/CarCard';
import { BookHeader } from './_components/parts';
import { SectionRows } from './_components/SectionRows';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string; tagId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'care' });
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/**
 * The car book's front page: the car, then one card per part of the book
 * with its date and the days left. Someone else's sticker, or one that does
 * not exist, is a plain 404 — the same answer for both.
 */
export default async function CarBookPage({ params }: Props) {
  const { locale, tagId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireOwner(locale, carBookPath(locale, tagId));

  const book = await carBookRepository.getBook(session.actor, tagId);
  if (!book) notFound();

  const [t, settings, cars] = await Promise.all([
    getTranslations('care'),
    getSettings(),
    carBookRepository.listCars(session.actor),
  ]);
  const items = dueItems(book.due, algiersToday(), settings.careReminderDays);
  const { fuel, year, engine } = book.profile;
  const details = [fuel && t(`profile.fuels.${fuel}`), year, engine].filter(Boolean).join(' · ');

  return (
    <section className="py-6 md:py-10">
      <div className="container-page flex max-w-190 flex-col gap-5">
        <BookHeader
          crumbs={[{ label: t('back'), href: `/${locale}/dashboard` }, { label: t('title') }]}
          title={t('overview.heading')}
        >
          <p className="mt-1 text-[16px] leading-relaxed text-text-secondary">{t('overview.subtitle')}</p>
        </BookHeader>

        <div>
          <CarCard
            href={carBookPath(locale, book.publicTagId, 'profile')}
            car={book.car}
            detail={details || null}
            fallbackName={t('yourCar')}
          />
          {cars.length > 1 && (
            <PendingLink
              href={`/${locale}/dashboard/car`}
              className="mt-1 inline-flex min-h-11 items-center text-sm font-bold text-accent underline-offset-4 hover:underline"
            >
              {t('changeCar')}
            </PendingLink>
          )}
        </div>

        <SectionRows book={book} locale={locale} items={items} />

        <div className="flex flex-col gap-1.5 text-sm text-text-muted">
          <p>{t('due.hint', { days: settings.careReminderDays })}</p>
          <p className="flex items-center gap-1.5">
            <LockIcon className="h-4 w-4" />
            {t('private')}
          </p>
        </div>
      </div>
    </section>
  );
}
