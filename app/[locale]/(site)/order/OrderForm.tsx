'use client';

import { useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { PhoneIcon, WhatsAppIcon } from '@/components/site/icons';
import { Button } from '@/components/ui/Button';
import { submitKeepingValues } from '@/components/ui/submitKeepingValues';
import type { Locale } from '@/i18n/locales';
import type { DeliveryType } from '@/lib/domain/constants';
import { formatDzd } from '@/lib/format/currency';
import { deliveryFreeEverywhere, shownOrderTotals, type FeeRow } from '@/lib/orders/totals';
import { orderFieldErrors, orderInputSchema } from '@/lib/validation/order';
import { DeliveryChoice } from './_components/DeliveryChoice';
import { AddressFields, ContactFields, ExtraFields } from './_components/OrderFields';
import { OrderTotal } from './_components/OrderTotal';
import { QuantityCards } from './_components/QuantityCards';
import { StickyOrderBar } from './_components/StickyOrderBar';
import { placeOrderAction } from './actions';
import { ORDER_FORM_INITIAL, type OrderFormState } from './formState';
import type { OrderFormLabels } from './orderLabels';
import { firstFieldToFix, TUCKED_AWAY } from './orderFieldOrder';

interface Props {
  locale: Locale;
  labels: OrderFormLabels;
  wilayas: { code: number; name: string }[];
  fees: FeeRow[];
  unitPrice: number;
  currencyLabel: string;
  maxQuantity: number;
  /** « Une question ? WhatsApp », when a number is set. */
  whatsapp: { href: string; label: string } | null;
}

/** Where to put the cursor when a field is refused. */
const FIELD_IDS: Record<string, string> = {
  customerName: 'order-name',
  phone: 'order-phone',
  email: 'order-email',
  wilayaCode: 'order-wilaya',
  commune: 'order-commune',
  address: 'order-address',
  deliveryType: 'order-delivery-HOME',
  deliveryNotes: 'order-notes',
};

function Part({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4">
      <legend className="mb-4 flex items-center gap-3 text-[18px] font-bold text-text">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm text-white">
          {number}
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * Guest checkout on one screen: how many, who, where — then one button. The
 * button first checks every field with the rules the server uses and puts the
 * cursor on the first one to fix, top to bottom. Without JavaScript the form
 * simply posts and the server answers the same way.
 */
export function OrderForm({ locale, labels, wilayas, fees, unitPrice, currencyLabel, maxQuantity, whatsapp }: Props) {
  const [state, formAction, pending] = useActionState<OrderFormState, FormData>(placeOrderAction, ORDER_FORM_INITIAL);
  const form = useRef<HTMLFormElement>(null);

  const [checked, setChecked] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [wilayaCode, setWilayaCode] = useState<number | ''>('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('HOME');
  const [extrasOpen, setExtrasOpen] = useState(false);

  const free = deliveryFreeEverywhere(fees);
  const fee =
    wilayaCode === ''
      ? free
        ? { wilayaCode: 0, home: 0, stopdesk: 0 }
        : null
      : (fees.find((row) => row.wilayaCode === wilayaCode) ?? null);
  const totals = shownOrderTotals({ quantity, wilayaCode, deliveryType }, { unitPrice, deliveryFees: fees });

  const errorOf = (field: string) => {
    const code = checked[field] ?? state.fieldErrors?.[field as keyof typeof state.fieldErrors];
    return code ? (labels.errors[code] ?? labels.errors.invalid) : undefined;
  };

  /** Opens the optional part if needed, then brings the field into view with the cursor in it. */
  const reveal = (field: string | null) => {
    if (!field) return;
    if (TUCKED_AWAY.has(field)) setExtrasOpen(true);
    requestAnimationFrame(() => {
      const el =
        field === 'quantity'
          ? form.current?.querySelector<HTMLElement>('input[name="quantity"]:checked')
          : document.getElementById(FIELD_IDS[field] ?? '');
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  };

  // A field the server refused: show it and go there.
  useEffect(() => {
    reveal(firstFieldToFix(state.fieldErrors ?? {}));
  }, [state]);

  const check = (): Record<string, string> => {
    const values = Object.fromEntries(
      [...new FormData(form.current ?? undefined).entries()].map(([key, value]) => [key, typeof value === 'string' ? value : '']),
    );
    const parsed = orderInputSchema(maxQuantity).safeParse(values);
    return parsed.success ? {} : (orderFieldErrors(parsed.error) as Record<string, string>);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const errors = check();
    setChecked(errors);
    if (Object.keys(errors).length > 0) {
      event.preventDefault();
      reveal(firstFieldToFix(errors));
      return;
    }
    submitKeepingValues(formAction)(event);
  };

  // Once refused, a field's message goes away as soon as it is right — never new ones while typing.
  const onChange = () => {
    if (Object.keys(checked).length === 0) return;
    const now = check();
    setChecked((before) => Object.fromEntries(Object.keys(before).flatMap((f) => (now[f] ? [[f, now[f]]] : []))));
  };

  const needsFixing = Object.keys(checked).length > 0 || Object.keys(state.fieldErrors ?? {}).length > 0;

  return (
    <form
      id="order-form"
      ref={form}
      action={formAction}
      onSubmit={onSubmit}
      onChange={onChange}
      noValidate
      className="flex scroll-mt-24 flex-col gap-8 rounded-xl bg-white p-5 shadow-card-md sm:p-7 md:p-8"
    >
      <input type="hidden" name="locale" value={locale} />
      {/* Honeypot: hidden from people, tempting for bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <Part number={1} title={labels.sections.quantity}>
        <QuantityCards
          labels={labels}
          maxQuantity={maxQuantity}
          quantity={quantity}
          onQuantity={setQuantity}
          unitPrice={unitPrice}
          currencyLabel={currencyLabel}
          error={errorOf('quantity')}
        />
      </Part>

      <Part number={2} title={labels.sections.contact}>
        <ContactFields labels={labels} errorOf={errorOf} />
      </Part>

      <Part number={3} title={labels.sections.delivery}>
        <AddressFields labels={labels} errorOf={errorOf} wilayas={wilayas} wilayaCode={wilayaCode} onWilaya={setWilayaCode} />
        <DeliveryChoice
          labels={labels}
          deliveryType={deliveryType}
          onDeliveryType={setDeliveryType}
          fee={fee}
          currencyLabel={currencyLabel}
        />
        <details open={extrasOpen} onToggle={(event) => setExtrasOpen(event.currentTarget.open)} className="group">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 text-[15px] font-bold text-accent hover:underline [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className="text-lg leading-none group-open:hidden">
              +
            </span>
            <span aria-hidden="true" className="hidden text-lg leading-none group-open:inline">
              −
            </span>
            {labels.extras}
          </summary>
          <ExtraFields labels={labels} errorOf={errorOf} />
        </details>
      </Part>

      <div className="flex flex-col gap-4">
        <OrderTotal labels={labels} unitPrice={unitPrice} currencyLabel={currencyLabel} quantity={quantity} totals={totals} />

        {state.formError && (
          <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {labels.errors[state.formError] ?? labels.errors.server_error}
          </p>
        )}
        {needsFixing && !pending && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {labels.checkFields}
          </p>
        )}

        <Button type="submit" disabled={pending} data-order-submit className="h-15 w-full text-[17px]">
          {pending ? labels.actions.ordering : labels.actions.order}
        </Button>

        <p className="flex items-center justify-center gap-2 text-center text-sm text-text-secondary">
          <PhoneIcon className="h-4 w-4 shrink-0 text-accent" />
          {labels.reassurance}
        </p>
        {whatsapp && (
          <a
            href={whatsapp.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border-strong px-5 text-[15px] font-bold text-text hover:bg-surface-2"
          >
            <WhatsAppIcon className="h-5 w-5 text-success" />
            {whatsapp.label}
          </a>
        )}
        <p className="text-center text-xs leading-relaxed text-text-muted">{labels.notice}</p>
      </div>

      <StickyOrderBar
        form={form}
        label={totals ? labels.total.total : labels.sticky.price}
        amount={formatDzd(totals ? totals.totalPrice : unitPrice, currencyLabel)}
        action={labels.sticky.order}
      />
    </form>
  );
}
