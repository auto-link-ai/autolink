import { getTranslations } from 'next-intl/server';
import { WhatsAppIcon } from '@/components/site/icons';
import type { Locale } from '@/i18n/locales';
import { cx } from '@/lib/cx';
import { formatPhone } from '@/lib/format/phone';
import { setWhatsAppRemindersAction } from '../accountActions';

/**
 * Car book dates on WhatsApp — off until the owner switches them on. One
 * button that says what it does; the state shows as a switch beside it. The
 * messages left on a sticker always go to WhatsApp: only reminders are a choice.
 */
export async function RemindersCard({
  locale,
  on,
  phone,
  days,
}: {
  locale: Locale;
  on: boolean;
  phone: string;
  days: number;
}) {
  const t = await getTranslations('dashboard.reminders');

  return (
    <section aria-labelledby="wa-reminders" className="mb-4 rounded-xl bg-white p-6 shadow-card-sm">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-success">
          <WhatsAppIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="wa-reminders" className="text-[17px] font-bold text-text">
            {t('title')}
          </h3>
          <p className="mt-1 text-[15px] leading-relaxed text-text-secondary">
            {t('body', { days })}{' '}
            <span dir="ltr" className="font-semibold whitespace-nowrap text-text">
              {formatPhone(phone)}
            </span>
          </p>
          <form action={setWhatsAppRemindersAction} className="mt-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="on" value={on ? '0' : '1'} />
            {/* The label says what the tap does; the switch beside it shows where things stand. */}
            <button
              type="submit"
              className="flex min-h-11 items-center gap-3 rounded-full text-[15px] font-bold text-text"
            >
              <span
                aria-hidden="true"
                className={cx(
                  'relative h-7 w-12 shrink-0 rounded-full transition-colors',
                  on ? 'bg-success' : 'bg-border-strong',
                )}
              >
                <span
                  className={cx(
                    'absolute top-1 h-5 w-5 rounded-full bg-white shadow-card-sm transition-all',
                    on ? 'end-1' : 'start-1',
                  )}
                />
              </span>
              {on ? t('turnOff') : t('turnOn')}
            </button>
          </form>
          <p className="mt-3 text-sm text-text-muted">{t('alertsNote')}</p>
        </div>
      </div>
    </section>
  );
}
