import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import { cx } from '@/lib/cx';
import type { AdminCustomerRow } from '@/lib/db/repositories/customersAdminQueries';
import type { OwnerTagRow } from '@/lib/db/repositories/tagsOwner';
import { formatDateTime } from '@/lib/format/date';
import { formatPhone } from '@/lib/format/phone';
import { deleteCustomerAction } from '../accountActions';
import { setCustomerStatusAction, unlockCustomerPinAction } from '../actions';
import { ContactForm } from './ContactForm';
import { TemporaryPinForm } from './TemporaryPinForm';
import { carLabel } from '@/lib/vehicles/carName';

const CONTACT_ERRORS = ['required', 'too_short', 'too_long', 'invalid_phone', 'phone_taken'] as const;

/** One account opened from the list: who they are, their stickers, and support actions. */
export async function CustomerDetail({
  customer,
  stickers,
  locale,
  returnSearch,
  canEdit,
}: {
  customer: AdminCustomerRow;
  stickers: OwnerTagRow[];
  locale: Locale;
  returnSearch: string;
  canEdit: boolean;
}) {
  const t = await getTranslations('admin.customers');
  const blocked = customer.status === 'BLOCKED';
  const fullName = `${customer.firstName} ${customer.lastName}`.trim();
  // Who the confirmations name. The number stays unspaced: spaced, its groups
  // would come out in reverse order inside Arabic text.
  const who = fullName || customer.phone;

  const hidden = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="publicUserId" value={customer.publicUserId} />
      <input type="hidden" name="returnSearch" value={returnSearch} />
    </>
  );

  return (
    <section
      aria-labelledby="customer-detail"
      className="mb-8 rounded-md border border-border bg-surface p-5 shadow-card-sm md:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="customer-detail" className="text-h3 text-text">
          {fullName || t('detail.noName')}
        </h2>
        <span
          className={cx(
            'rounded-full px-3 py-1 text-xs font-bold',
            blocked ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success',
          )}
        >
          {t(`status.${customer.status}`)}
        </span>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        {[
          { label: t('detail.phone'), value: formatPhone(customer.phone), ltr: true },
          { label: t('detail.registered'), value: formatDateTime(customer.createdAt, locale) },
          {
            label: t('detail.lastLogin'),
            value: customer.lastLoginAt ? formatDateTime(customer.lastLoginAt, locale) : t('detail.never'),
          },
        ].map((row) => (
          <div key={row.label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">{row.label}</dt>
            <dd dir={row.ltr ? 'ltr' : undefined} className="mt-0.5 text-[15px] text-text">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-text-muted">
        {t('detail.stickers', { count: stickers.length })}
      </h3>
      {stickers.length === 0 ? (
        <p className="mt-2 text-sm text-text-muted">{t('detail.noStickers')}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {stickers.map((sticker) => (
            <li key={sticker.publicTagId} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm">
              <span dir="ltr" className="font-mono font-semibold text-text">
                {sticker.publicTagId}
              </span>
              <span className="text-text-secondary">
                {(sticker.vehicle && carLabel(sticker.vehicle)) ?? t('detail.noVehicle')}
              </span>
              <span className="text-text-muted">{t(`tagStatus.${sticker.status}`)}</span>
              {sticker.activatedAt && (
                <span className="text-text-muted">{formatDateTime(sticker.activatedAt, locale)}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        <div className="mt-6 flex flex-col gap-5 border-t border-border pt-5">
          {/* Keyed by account, so opening another customer never carries over
              this one's errors or freshly issued PIN. */}
          <ContactForm
            key={`contact-${customer.publicUserId}`}
            locale={locale}
            publicUserId={customer.publicUserId}
            returnSearch={returnSearch}
            values={{ firstName: customer.firstName, lastName: customer.lastName, phone: formatPhone(customer.phone) }}
            labels={{
              fields: { firstName: t('detail.firstName'), lastName: t('detail.lastName'), phone: t('detail.phone') },
              phoneHint: t('detail.phoneHint'),
              submit: t('detail.save'),
              working: t('detail.saving'),
              errors: Object.fromEntries(CONTACT_ERRORS.map((code) => [code, t(`errors.${code}`)])),
              formErrors: { not_found: t('results.not_found'), not_allowed: t('results.not_allowed') },
            }}
          />

          <TemporaryPinForm
            key={`pin-${customer.publicUserId}`}
            locale={locale}
            publicUserId={customer.publicUserId}
            labels={{
              submit: t('detail.tempPin'),
              working: t('detail.tempPinWorking'),
              hint: t('detail.tempPinHint'),
              done: t('detail.tempPinDone'),
              next: t('detail.tempPinNext'),
              errors: {
                not_found: t('results.not_found'),
                not_allowed: t('results.not_allowed'),
                server_error: t('detail.tempPinFailed'),
              },
            }}
          />

          <form action={unlockCustomerPinAction}>
            {hidden}
            <Button type="submit" variant="secondary" size="sm">
              {t('detail.unlockPin')}
            </Button>
            <span className="ms-3 text-sm text-text-muted">{t('detail.unlockPinHint')}</span>
          </form>

          {blocked ? (
            <form action={setCustomerStatusAction}>
              {hidden}
              <input type="hidden" name="status" value="ACTIVE" />
              <Button type="submit" variant="secondary" size="sm">
                {t('detail.unblock')}
              </Button>
              <span className="ms-3 text-sm text-text-muted">{t('detail.unblockHint')}</span>
            </form>
          ) : (
            // Blocking locks the customer out on their very next request, so it asks once.
            <details>
              <summary className="inline-flex h-10 cursor-pointer list-none items-center rounded-sm border border-danger/40 px-4 text-sm font-bold text-danger hover:bg-danger/5">
                {t('detail.block')}
              </summary>
              <div className="mt-3 rounded-sm border border-danger/30 bg-danger/5 p-4">
                <p className="text-sm text-text">{t('detail.blockConfirm', { name: who })}</p>
                <form action={setCustomerStatusAction} className="mt-3">
                  {hidden}
                  <input type="hidden" name="status" value="BLOCKED" />
                  <Button type="submit" variant="danger" size="sm">
                    {t('detail.blockYes')}
                  </Button>
                </form>
              </div>
            </details>
          )}

          {/* Delete: two taps, the second one says what disappears */}
          <details>
            <summary className="inline-flex h-10 cursor-pointer list-none items-center rounded-sm border border-danger/40 px-4 text-sm font-bold text-danger hover:bg-danger/5">
              {t('detail.delete')}
            </summary>
            <div className="mt-3 rounded-sm border border-danger/30 bg-danger/5 p-4">
              <p className="text-sm text-text">{t('detail.deleteConfirm', { name: who, count: stickers.length })}</p>
              <form action={deleteCustomerAction} className="mt-3">
                {hidden}
                <Button type="submit" variant="danger" size="sm">
                  {t('detail.deleteYes')}
                </Button>
              </form>
            </div>
          </details>
        </div>
      ) : (
        <p className="mt-6 border-t border-border pt-5 text-sm text-text-secondary">{t('readOnly')}</p>
      )}
    </section>
  );
}
