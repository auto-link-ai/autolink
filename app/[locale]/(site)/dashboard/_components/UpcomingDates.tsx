import { getTranslations } from 'next-intl/server';
import { DueList } from '@/components/care/DueList';
import { PendingLink } from '@/components/ui/PendingLink';
import type { Locale } from '@/i18n/locales';
import type { DueItem } from '@/lib/care/due';
import { carBookPath, SECTION_FOR_DUE } from '@/lib/care/sections';

export interface CarDates {
  publicTagId: string;
  car: string | null;
  /** Late or due soon only, most urgent first. */
  items: DueItem[];
}

/**
 * « À venir »: for each car, the dates that are late or close — contrôle
 * technique, assurance, vignette, vidange — each a tap from where it is kept.
 * Nothing to show, nothing shown: the owner's screen stays about messages.
 */
export async function UpcomingDates({ cars, locale }: { cars: CarDates[]; locale: Locale }) {
  const due = cars.filter((car) => car.items.length > 0);
  if (due.length === 0) return null;
  const t = await getTranslations('dashboard.upcoming');

  return (
    <section aria-labelledby="upcoming" className="mb-10">
      <h2 id="upcoming" className="mb-4 text-h3 text-text">
        {t('title')}
      </h2>
      <div className="flex flex-col gap-4">
        {due.map((car) => (
          <div key={car.publicTagId} className="rounded-xl bg-white px-5 py-3 shadow-card-sm">
            <p className="pt-1 text-sm font-bold text-text-secondary">{car.car ?? t('yourCar')}</p>
            <DueList
              items={car.items}
              locale={locale}
              hrefFor={(kind) => carBookPath(locale, car.publicTagId, SECTION_FOR_DUE[kind])}
              linkAs={PendingLink}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
