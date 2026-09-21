import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import { cx } from '@/lib/cx';
import type { OwnerTagRow } from '@/lib/db/repositories/tagsOwner';
import type { AdminCustomerRow } from '@/lib/db/repositories/users';
import { formatDateTime } from '@/lib/format/date';
import { setCustomerStatusAction, updateCustomerContactAction } from '../actions';
import { ResetPasswordForm } from './ResetPasswordForm';

const INPUT = 'h-11 w-full rounded-sm border border-border-strong bg-surface px-3 text-sm text-text focus:border-accent';

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
          {customer.name ?? t('detail.noName')}
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

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t('detail.email'), value: customer.email, ltr: true },
          { label: t('detail.phone'), value: customer.phone ?? '—', ltr: true },
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
                {sticker.vehicle
                  ? `${sticker.vehicle.brand} ${sticker.vehicle.model} · ${sticker.vehicle.color}`
                  : t('detail.noVehicle')}
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
          <form action={updateCustomerContactAction} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            {hidden}
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-text">
              {t('detail.name')}
              <input name="name" defaultValue={customer.name ?? ''} maxLength={80} required className={INPUT} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-text">
              {t('detail.phone')}
              <input name="phone" defaultValue={customer.phone ?? ''} maxLength={20} dir="ltr" className={INPUT} />
            </label>
            <Button type="submit" variant="secondary" size="sm">
              {t('detail.save')}
            </Button>
          </form>

          <ResetPasswordForm
            locale={locale}
            publicUserId={customer.publicUserId}
            labels={{
              submit: t('detail.resetPassword'),
              working: t('detail.resetting'),
              hint: t('detail.resetHint'),
              done: t('detail.resetDone'),
              errors: {
                not_found: t('results.not_found'),
                not_allowed: t('results.not_allowed'),
                invalid: t('results.invalid'),
                server_error: t('detail.resetFailed'),
              },
            }}
          />

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
                <p className="text-sm text-text">{t('detail.blockConfirm', { email: customer.email })}</p>
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
        </div>
      ) : (
        <p className="mt-6 border-t border-border pt-5 text-sm text-text-secondary">{t('readOnly')}</p>
      )}
    </section>
  );
}
