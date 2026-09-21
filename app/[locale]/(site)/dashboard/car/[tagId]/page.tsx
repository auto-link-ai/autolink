import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DueList } from '@/components/care/DueList';
import { routing } from '@/i18n/routing';
import { requireOwner } from '@/lib/auth/session';
import { algiersToday, dueItems } from '@/lib/care/due';
import { getSettings } from '@/lib/config/settings';
import { carBookRepository } from '@/lib/db/repositories/carBook';
import { NotesSection, OilSection, RepairSection } from './_components/LogSections';
import { InspectionSection, InsuranceSection, VignetteSection } from './_components/PaperSections';
import { BookCard } from './_components/parts';
import { ProfileSection } from './_components/ProfileSection';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string; tagId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'care' });
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/**
 * The owner's private car book for one sticker's car. Someone else's sticker,
 * or one that does not exist, is a plain 404 — the same answer for both.
 */
export default async function CarBookPage({ params }: Props) {
  const { locale, tagId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireOwner(locale, `/${locale}/dashboard/car/${tagId}`);

  const book = await carBookRepository.getBook(session.actor, tagId);
  if (!book) notFound();

  const [t, settings] = await Promise.all([getTranslations('care'), getSettings()]);
  const items = dueItems(book.due, algiersToday(), settings.careReminderDays);
  const sectionProps = { book, locale, currency: settings.currencyLabel };

  return (
    <section className="py-10 md:py-14">
      <div className="container-page flex max-w-225 flex-col gap-6">
        <div>
          <Link href={`/${locale}/dashboard`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-accent hover:underline">
            <span aria-hidden="true" className="inline-block rtl:rotate-180">
              ←
            </span>
            {t('back')}
          </Link>
          <h1 className="mt-2 text-h2 text-text">{t('title')}</h1>
          <p className="mt-1 text-[17px] font-bold text-text">
            {book.car.brand} {book.car.model}
            <span className="font-normal text-text-muted"> · {book.car.color}</span>
          </p>
          <p dir="ltr" className="mt-1 font-mono text-sm text-text-secondary rtl:text-end">
            {book.publicTagId}
          </p>
          <p className="mt-3 text-sm text-text-muted">{t('private')}</p>
        </div>

        <BookCard id="due" title={t('due.title')}>
          <DueList items={items} locale={locale} />
          <p className="mt-3 text-sm text-text-muted">{t('due.hint', { days: settings.careReminderDays })}</p>
        </BookCard>

        <ProfileSection book={book} locale={locale} />
        <OilSection {...sectionProps} />
        <InsuranceSection book={book} locale={locale} />
        <InspectionSection book={book} locale={locale} />
        <VignetteSection book={book} locale={locale} />
        <RepairSection {...sectionProps} />
        <NotesSection book={book} locale={locale} />
      </div>
    </section>
  );
}
