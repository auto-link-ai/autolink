import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import { cx } from '@/lib/cx';
import type { PendingRenewal } from '@/lib/db/repositories/renewals';
import { formatAlgiersDay } from '@/lib/format/date';
import { periodParts, serviceState } from '@/lib/renewals/period';
import { requestRenewalAction } from '../actions';

export interface RenewalTerms {
  /** « 1 000 DA » */
  priceLabel: string;
  months: number;
  warningDays: number;
}

/**
 * How long one sticker keeps working, and the way to extend it. Quiet while
 * the end is far; orange from `warningDays` before it, red once it has passed
 * (strangers then see "not available"). A request already made replaces the
 * button: the shop calls the owner to arrange the payment.
 */
export async function ServicePeriod({
  publicTagId,
  serviceUntil,
  pending,
  terms,
  phone,
  locale,
}: {
  publicTagId: string;
  serviceUntil: Date | null;
  pending: PendingRenewal | null;
  terms: RenewalTerms;
  /** The owner's number, as the site writes it. */
  phone: string;
  locale: Locale;
}) {
  const t = await getTranslations('dashboard.service');
  const tCommon = await getTranslations('common');
  const state = serviceState(serviceUntil, new Date(), terms.warningDays);
  // Linked before service periods existed and not dated yet: nothing to say.
  if (!serviceUntil || state === 'undated') return null;

  const date = formatAlgiersDay(serviceUntil, locale);
  const offer = t('offer', { price: terms.priceLabel, period: tCommon('period', periodParts(terms.months)) });

  if (pending) {
    return (
      <div role="status" className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm leading-relaxed">
        <p className="font-bold text-text">
          {t('pendingTitle')}{' '}
          <span dir="ltr" className="font-mono text-text-secondary">
            {pending.ref}
          </span>
        </p>
        <p className="mt-1 text-text-secondary">{t('pendingBody', { phone, offer })}</p>
        <p className="mt-1 text-text-muted">{t(state === 'expired' ? 'endedOn' : 'until', { date })}</p>
      </div>
    );
  }

  if (state === 'ok') return <p className="mt-3 text-sm text-text-muted">{t('until', { date })}</p>;

  const expired = state === 'expired';
  return (
    <div
      className={cx(
        'mt-4 rounded-2xl border-2 p-4 sm:p-5',
        expired ? 'border-danger/30 bg-danger/5' : 'border-accent/40 bg-accent-soft',
      )}
    >
      <p className={cx('text-[17px] font-bold', expired ? 'text-danger' : 'text-text')}>
        {t(expired ? 'expiredTitle' : 'soonTitle', { date })}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-text-secondary">
        {expired ? t('expiredBody', { offer }) : t('soonBody', { offer })}
      </p>
      <form action={requestRenewalAction} className="mt-3">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="publicTagId" value={publicTagId} />
        <Button type="submit" variant="primary" size="sm">
          {t('renew')}
        </Button>
      </form>
    </div>
  );
}
