import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import { savePhoneAction } from '../actions';

const INPUT =
  'h-12 w-full rounded-2xl border border-border-strong bg-white px-4 text-[16px] text-text outline-none focus:border-accent sm:max-w-72 rtl:text-end';

/**
 * The owner's WhatsApp number. `prompt`: an account made before the number
 * was required has none yet — an orange card near the top asks for it.
 * `account`: in « Mon compte », the number as it is, and a way to change it.
 * A plain form: it saves, then the dashboard says how it went.
 */
export async function PhoneCard({
  locale,
  phone,
  variant,
}: {
  locale: Locale;
  phone: string | null;
  variant: 'prompt' | 'account';
}) {
  const t = await getTranslations('dashboard.phone');
  const form = (
    <form action={savePhoneAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="locale" value={locale} />
      <label className="flex flex-1 flex-col gap-1.5 text-sm font-bold text-text">
        {t('label')}
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          required
          dir="ltr"
          autoComplete="tel"
          defaultValue={phone ?? ''}
          placeholder="05 12 34 56 78"
          className={INPUT}
        />
      </label>
      <Button type="submit" size="sm" variant={variant === 'prompt' ? 'primary' : 'secondary'} className="h-12">
        {t('save')}
      </Button>
    </form>
  );

  if (variant === 'prompt') {
    return (
      <section
        aria-labelledby="phone-prompt"
        className="mb-6 rounded-xl border-2 border-accent/40 bg-accent-soft p-5 md:p-6"
      >
        <h2 id="phone-prompt" className="text-[17px] font-bold text-text">
          {t('promptTitle')}
        </h2>
        <p className="mt-1 text-[15px] leading-relaxed text-text-secondary">{t('hint')}</p>
        {form}
      </section>
    );
  }

  return (
    <details className="group mb-4 rounded-xl bg-white p-5 shadow-card-sm md:p-6">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-[16px] font-bold text-text">{t('label')}</span>
          <span dir="ltr" className="block font-mono text-[15px] text-text-secondary rtl:text-end">
            {phone ?? '—'}
          </span>
        </span>
        <span className="text-sm font-bold text-accent group-open:hidden">{t('change')}</span>
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">{t('hint')}</p>
      {form}
    </details>
  );
}
