'use client';

import { useActionState, useEffect, useRef, useState, type FormEvent } from 'react';
import { submitKeepingValues } from '@/components/ui/submitKeepingValues';
import type { Locale } from '@/i18n/locales';
import type { DeliveryType } from '@/lib/domain/constants';
import { formatDzd } from '@/lib/format/currency';
import { deliveryFreeEverywhere, shownOrderTotals, type FeeRow } from '@/lib/orders/totals';
import { orderFieldErrors, orderInputSchema, shortOrderInputSchema } from '@/lib/validation/order';
import { DeliveryChoice } from './_components/DeliveryChoice';
import { FormPart as Part } from './_components/FormPart';
import { AddressFields, ContactFields, ExtraFields, WilayaField } from './_components/OrderFields';
import { QuantityCards } from './_components/QuantityCards';
import { StickyOrderBar } from './_components/StickyOrderBar';
import { SubmitArea } from './_components/SubmitArea';
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
  /**
   * The ad page's short form (/offre): quantity, name, phone and wilaya only —
   * commune and address are taken on the confirmation call, delivery is home.
   */
  short?: boolean;
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

/**
 * Guest checkout on one screen: how many, who, where — then one button. The
 * button first checks every field with the rules the server uses and puts the
 * cursor on the first one to fix, top to bottom. Without JavaScript the form
 * simply posts and the server answers the same way.
 */
export function OrderForm({
  locale,
  labels,
  wilayas,
  fees,
  unitPrice,
  currencyLabel,
  maxQuantity,
  whatsapp,
  short = false,
}: Props) {
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
    const values = {
      // A field this form does not show counts as empty, as on the server (lib/orders/placeOrder.ts).
      email: '',
      deliveryNotes: '',
      commune: '',
      address: '',
      ...Object.fromEntries(
        [...new FormData(form.current ?? undefined).entries()].map(([key, value]) => [key, typeof value === 'string' ? value : '']),
      ),
    };
    const parsed = (short ? shortOrderInputSchema : orderInputSchema)(maxQuantity).safeParse(values);
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
      {short && (
        <>
          <input type="hidden" name="form" value="short" />
          <input type="hidden" name="deliveryType" value="HOME" />
        </>
      )}

      <Part number={1} title={labels.sections.quantity}>
        <QuantityCards
          labels={labels}
          maxQuantity={maxQuantity}
          quantity={quantity}
          onQuantity={setQuantity}
          unitPrice={unitPrice}
          currencyLabel={currencyLabel}
          error={errorOf('quantity')}
          small={short}
        />
      </Part>

      <Part number={2} title={labels.sections.contact}>
        <ContactFields labels={labels} errorOf={errorOf} phoneHint={!short} />
        {short && (
          <WilayaField labels={labels} errorOf={errorOf} wilayas={wilayas} wilayaCode={wilayaCode} onWilaya={setWilayaCode} />
        )}
      </Part>

      {!short && (
      <Part number={3} title={labels.sections.delivery}>
        <AddressFields
          labels={labels}
          errorOf={errorOf}
          wilayas={wilayas}
          wilayaCode={wilayaCode}
          onWilaya={setWilayaCode}
          communeLanguage={locale === 'ar' ? 'ar' : 'fr'}
        />
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
      )}

      <SubmitArea
        labels={labels}
        unitPrice={unitPrice}
        currencyLabel={currencyLabel}
        quantity={quantity}
        totals={totals}
        formError={state.formError}
        needsFixing={needsFixing}
        pending={pending}
        whatsapp={whatsapp}
        short={short}
      />

      <StickyOrderBar
        form={form}
        label={totals ? labels.total.total : labels.sticky.price}
        amount={formatDzd(totals ? totals.totalPrice : unitPrice, currencyLabel)}
        action={labels.sticky.order}
      />
    </form>
  );
}
