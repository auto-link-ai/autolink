import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import { formatDzd } from '@/lib/format/currency';
import { formatDateTime } from '@/lib/format/date';
import { availableOrderActions, canAssignTags, canDeleteOrder, canEditOrder } from '@/lib/orders/transitions';
import type { AdminOrderDTO } from '@/lib/db/repositories/ordersAdmin';
import { assignOrderTagsAction, changeOrderStatusAction, updateOrderShippingAction } from '../actions';
import { deleteOrderAction } from '../editActions';
import { OrderForm, type OrderFormLabels } from './OrderForm';

const INPUT = 'h-11 w-full rounded-sm border border-border-strong bg-surface px-3 text-sm text-text focus:border-accent';

/**
 * The order opened from the list: details, workflow, tag assignment, courier —
 * and correcting it (until it ships) or deleting it (new or cancelled, ADMIN only).
 */
export async function OrderDetail({
  order,
  locale,
  returnSearch,
  wilayaName,
  wilayas,
  formLabels,
  canDelete,
}: {
  order: AdminOrderDTO;
  locale: Locale;
  returnSearch: string;
  wilayaName: string;
  wilayas: { code: number; name: string }[];
  formLabels: OrderFormLabels;
  /** The signed-in account may delete (ADMIN role). */
  canDelete: boolean;
}) {
  const t = await getTranslations('admin.orders');
  const actions = availableOrderActions(order.status);
  const listHref = `/${locale}/admin/orders${returnSearch}`;

  const hidden = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="orderRef" value={order.orderRef} />
      <input type="hidden" name="returnSearch" value={returnSearch} />
    </>
  );

  return (
    <section aria-labelledby="order-detail" className="mb-8 rounded-md border border-border bg-surface p-5 shadow-card-sm md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="order-detail" className="text-h3 text-text">
          <span dir="ltr" className="font-mono">
            {order.orderRef}
          </span>
        </h2>
        <p className="text-sm text-text-muted">{formatDateTime(order.createdAt, locale)}</p>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: t('detail.customer'), value: order.customerName },
          { label: t('detail.phone'), value: order.phone, ltr: true },
          { label: t('detail.email'), value: order.email ?? '—', ltr: true },
          { label: t('detail.address'), value: `${order.address}, ${order.commune} (${wilayaName})` },
          {
            label: t('detail.delivery'),
            value: t(order.deliveryType === 'HOME' ? 'detail.home' : 'detail.stopdesk'),
          },
          { label: t('detail.notes'), value: order.deliveryNotes ?? '—' },
          { label: t('detail.quantity'), value: String(order.quantity) },
          { label: t('detail.unitPrice'), value: formatDzd(order.unitPrice), ltr: true },
          { label: t('detail.deliveryFee'), value: formatDzd(order.deliveryFee), ltr: true },
          { label: t('detail.total'), value: formatDzd(order.totalPrice), ltr: true },
        ].map((row) => (
          <div key={row.label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">{row.label}</dt>
            <dd dir={row.ltr ? 'ltr' : undefined} className="mt-0.5 text-[15px] text-text">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Workflow */}
      <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
        {actions.length === 0 && <p className="text-sm text-text-muted">{t('detail.noActions')}</p>}
        {actions.map((action) => (
          <form key={action} action={changeOrderStatusAction}>
            {hidden}
            <input type="hidden" name="action" value={action} />
            <Button type="submit" variant={action === 'cancel' ? 'danger' : 'secondary'} size="sm">
              {t(`actions.${action}`)}
            </Button>
          </form>
        ))}
      </div>

      {/* Tag assignment */}
      {canAssignTags(order.status) && (
        <form action={assignOrderTagsAction} className="mt-6 border-t border-border pt-5">
          {hidden}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-text">{t('detail.assignLabel', { count: order.quantity })}</span>
            <textarea
              name="tagIds"
              rows={2}
              dir="ltr"
              defaultValue={order.assignedTagIds.join(' ')}
              placeholder="AUT-7K3M9QXZ AUT-8WGBYZ4B"
              className={`${INPUT} h-auto py-2 font-mono`}
            />
            <span className="text-sm text-text-muted">{t('detail.assignHint')}</span>
          </label>
          <Button type="submit" variant="secondary" size="sm" className="mt-3">
            {t('detail.assignSubmit')}
          </Button>
        </form>
      )}

      {/* Courier + tracking */}
      <form action={updateOrderShippingAction} className="mt-6 grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
        {hidden}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-text">{t('detail.courier')}</span>
          <input name="courier" defaultValue={order.courier ?? ''} maxLength={60} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-text">{t('detail.tracking')}</span>
          <input name="trackingNumber" defaultValue={order.trackingNumber ?? ''} maxLength={60} dir="ltr" className={INPUT} />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" variant="secondary" size="sm">
            {t('detail.saveShipping')}
          </Button>
        </div>
      </form>

      {/* Correct the order, until it ships */}
      {canEditOrder(order.status) && (
        <details className="group mt-6 border-t border-border pt-5">
          <summary className="cursor-pointer list-none text-[15px] font-bold text-accent">{t('form.edit')}</summary>
          <p className="mt-2 text-sm text-text-muted">{t('form.editHint')}</p>
          <div className="mt-4">
            <OrderForm
              locale={locale}
              orderRef={order.orderRef}
              returnSearch={returnSearch}
              values={{
                customerName: order.customerName,
                phone: order.phone,
                email: order.email ?? '',
                wilayaCode: String(order.wilayaCode),
                commune: order.commune,
                address: order.address,
                deliveryType: order.deliveryType,
                deliveryNotes: order.deliveryNotes ?? '',
                quantity: String(order.quantity),
              }}
              wilayas={wilayas}
              labels={formLabels}
              cancelHref={listHref}
            />
          </div>
        </details>
      )}

      {/* Delete: two taps, the second one says what disappears */}
      {canDelete && canDeleteOrder(order.status) && (
        <details className="mt-6 border-t border-border pt-5">
          <summary className="cursor-pointer list-none text-[15px] font-bold text-danger">{t('form.delete')}</summary>
          <form action={deleteOrderAction} className="mt-3 flex flex-col items-start gap-3 rounded-sm border border-danger/30 bg-danger/5 p-4">
            {hidden}
            <p className="text-sm text-text">{t('form.deleteConfirm', { orderRef: order.orderRef })}</p>
            <Button type="submit" variant="danger" size="sm">
              {t('form.deleteYes')}
            </Button>
          </form>
        </details>
      )}
    </section>
  );
}
