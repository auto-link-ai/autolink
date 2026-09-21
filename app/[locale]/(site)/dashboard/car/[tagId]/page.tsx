import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { DueList } from '@/components/care/DueList';
import { routing } from '@/i18n/routing';
import { requireOwner } from '@/lib/auth/session';
import { algiersToday, dueItems } from '@/lib/care/due';
import { carBookPath, SECTION_FOR_DUE } from '@/lib/care/sections';
import { getSettings } from '@/lib/config/settings';
import { carBookRepository } from '@/lib/db/repositories/carBook';
import { BookCard, BookHeader } from './_components/parts';
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
 * The car book's front page: what is coming up, then every section as one
 * row to open. Someone else's sticker, or one that does not exist, is a plain
 * 404 — the same answer for both.
 */
export default async function CarBookPage({ params }: Props) {
  const { locale, tagId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireOwner(locale, carBookPath(locale, tagId));

  const book = await carBookRepository.getBook(session.actor, tagId);
  if (!book) notFound();

  const [t, settings] = await Promise.all([getTranslations('care'), getSettings()]);
  const items = dueItems(book.due, algiersToday(), settings.careReminderDays);
  const dated = items.filter((item) => item.date);

  return (
    <section className="py-8 md:py-12">
      <div className="container-page flex max-w-190 flex-col gap-6">
        <BookHeader crumbs={[{ label: t('back'), href: `/${locale}/dashboard` }, { label: t('title') }]} title={t('title')}>
          <p className="mt-2 text-[18px] font-bold text-text">
            {book.car.brand} {book.car.model}
            <span className="font-normal text-text-muted"> · {book.car.color}</span>
          </p>
          <p dir="ltr" className="mt-0.5 font-mono text-sm text-text-secondary rtl:text-end">
            {book.publicTagId}
          </p>
          <p className="mt-3 text-sm text-text-muted">{t('private')}</p>
        </BookHeader>

        <BookCard title={t('due.title')}>
          {dated.length > 0 ? (
            <DueList
              items={dated}
              locale={locale}
              hrefFor={(kind) => carBookPath(locale, book.publicTagId, SECTION_FOR_DUE[kind])}
            />
          ) : (
            <p className="text-[16px] leading-relaxed text-text-secondary">{t('overview.noDates')}</p>
          )}
          <p className="mt-3 text-sm text-text-muted">{t('due.hint', { days: settings.careReminderDays })}</p>
        </BookCard>

        <section aria-labelledby="car-book-sections">
          <h2 id="car-book-sections" className="mb-3 text-h3 text-text">
            {t('overview.everything')}
          </h2>
          <SectionRows book={book} locale={locale} items={items} />
        </section>
      </div>
    </section>
  );
}
