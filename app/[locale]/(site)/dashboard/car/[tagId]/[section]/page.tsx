import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireOwner } from '@/lib/auth/session';
import { carBookPath, isCareSection, isLogSection } from '@/lib/care/sections';
import { getSettings } from '@/lib/config/settings';
import { carBookRepository } from '@/lib/db/repositories/carBook';
import { DetailsSection } from '../_components/DetailsSection';
import { LogSection } from '../_components/LogSection';
import { Banner, BookHeader } from '../_components/parts';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string; tagId: string; section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, section } = await params;
  if (!hasLocale(routing.locales, locale) || !isCareSection(section)) return {};
  const t = await getTranslations({ locale, namespace: 'care' });
  return { title: `${t(`${section}.title`)} · ${t('metaTitle')}`, robots: { index: false, follow: false } };
}

/** One section of the car book, on its own: read it, change it, or log a new entry. */
export default async function CarBookSectionPage({ params, searchParams }: Props) {
  const { locale, tagId, section } = await params;
  if (!hasLocale(routing.locales, locale) || !isCareSection(section)) notFound();
  setRequestLocale(locale);
  const session = await requireOwner(locale, carBookPath(locale, tagId, section));

  const book = await carBookRepository.getBook(session.actor, tagId);
  if (!book) notFound();

  const [t, settings, raw] = await Promise.all([getTranslations('care'), getSettings(), searchParams]);
  const title = t(`${section}.title`);
  const banner = raw.saved === '1' ? t('banner.saved') : raw.added === '1' ? t('banner.added') : raw.deleted === '1' ? t('banner.deleted') : null;
  const common = { book, locale, soonDays: settings.careReminderDays };

  return (
    <section className="py-8 md:py-12">
      <div className="container-page flex max-w-190 flex-col gap-6">
        <BookHeader
          crumbs={[
            { label: t('back'), href: `/${locale}/dashboard` },
            { label: `${t('title')} · ${book.car.brand} ${book.car.model}`, href: carBookPath(locale, book.publicTagId) },
            { label: title },
          ]}
          title={title}
        />

        {banner && <Banner>{banner}</Banner>}

        {isLogSection(section) ? (
          <LogSection {...common} section={section} adding={raw.new === '1'} currency={settings.currencyLabel} />
        ) : (
          <DetailsSection {...common} section={section} editing={raw.edit === '1'} />
        )}
      </div>
    </section>
  );
}
