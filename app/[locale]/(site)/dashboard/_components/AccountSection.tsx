import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/locales';
import { formatPhone } from '@/lib/format/phone';
import { authErrorLabels } from '../../_auth/labels';
import { ChangePin } from './ChangePin';

/**
 * « Mon compte »: the number they sign in with — changed only through support,
 * who first check it is them — and a new PIN.
 */
export async function AccountSection({ locale, phone }: { locale: Locale; phone: string }) {
  const t = await getTranslations('dashboard.account');

  return (
    <section aria-labelledby="account" className="mt-12">
      <h2 id="account" className="mb-4 text-h3 text-text">
        {t('title')}
      </h2>
      <div className="mb-4 rounded-xl bg-white p-6 shadow-card-sm">
        <p className="text-sm font-bold text-text">{t('phone')}</p>
        <p dir="ltr" className="mt-1 text-[17px] font-bold text-text rtl:text-end">
          {formatPhone(phone)}
        </p>
        <p className="mt-1 text-sm text-text-muted">{t('phoneHint')}</p>
      </div>
      <ChangePin
        locale={locale}
        labels={{
          title: t('changePin'),
          current: t('current'),
          pin: t('newPin'),
          pinHint: t('pinHint'),
          pinConfirm: t('pinConfirm'),
          submit: t('submit'),
          working: t('working'),
          errors: { ...(await authErrorLabels()), wrong_current: t('wrongCurrent'), same_pin: t('samePin') },
        }}
      />
    </section>
  );
}
