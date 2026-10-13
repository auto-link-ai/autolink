import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CheckIcon } from '@/components/site/icons';
import { buttonClasses } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import { FormMessage } from '../_auth/fields';

/**
 * The moment the sticker works: what to do now, in order — stick it, test it,
 * add the dates — and the two places to go next.
 */
export async function ActivationDone({
  locale,
  publicTagId,
  car,
  pinUpdated,
}: {
  locale: Locale;
  publicTagId: string;
  car: string | null;
  pinUpdated: boolean;
}) {
  const t = await getTranslations('activate.done');
  const steps = [t('stick'), t('test'), t('dates')];

  return (
    <section aria-labelledby="activated" className="rounded-xl bg-white p-6 shadow-card-sm md:p-8">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckIcon className="h-7 w-7" />
      </span>
      <h2 id="activated" className="mt-4 text-h2 text-text">
        {car ? t('titleCar', { car }) : t('title')}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{t('body')}</p>
      <p dir="ltr" className="mt-1 font-mono text-sm text-text-muted rtl:text-end">
        {publicTagId}
      </p>
      {pinUpdated && (
        <div className="mt-4">
          <FormMessage tone="notice">{t('pinUpdated')}</FormMessage>
        </div>
      )}

      <h3 className="mt-8 text-[17px] font-bold text-text">{t('next')}</h3>
      <ol className="mt-3 flex flex-col gap-3">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-3 text-[15px] leading-relaxed text-text-secondary">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href={`/${locale}/dashboard`} className={buttonClasses('primary', 'md', 'w-full sm:w-auto')}>
          {t('messages')}
        </Link>
        <Link href={`/${locale}/dashboard/car/${publicTagId}`} className={buttonClasses('secondary', 'md', 'w-full sm:w-auto')}>
          {t('addDates')}
        </Link>
      </div>
    </section>
  );
}
