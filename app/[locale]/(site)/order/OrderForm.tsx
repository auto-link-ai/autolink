'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { submitKeepingValues } from '@/components/ui/submitKeepingValues';
import { useHydrated } from '@/components/ui/useHydrated';
import type { Locale } from '@/i18n/locales';
import { cx } from '@/lib/cx';
import type { DeliveryType } from '@/lib/domain/constants';
import { formatDzd } from '@/lib/format/currency';
import { computeOrderTotals, type FeeRow } from '@/lib/orders/totals';
import { orderFieldErrors, orderInputSchema } from '@/lib/validation/order';
import { ContactFields, DeliveryFields, QuantityFields } from './_components/OrderFields';
import { OrderReview } from './_components/OrderReview';
import { OrderSummary } from './_components/OrderSummary';
import { placeOrderAction } from './actions';
import { ORDER_FORM_INITIAL, type OrderFormState } from './formState';
import type { OrderFormLabels } from './orderLabels';
import { fieldsOfStep, ORDER_STEPS, REVIEW_STEP, stepWithField } from './orderSteps';

interface Props {
  locale: Locale;
  labels: OrderFormLabels;
  wilayas: { code: number; name: string }[];
  fees: FeeRow[];
  unitPrice: number;
  currencyLabel: string;
  maxQuantity: number;
}

/** Where to put the cursor when a field is refused. */
const FIELD_IDS: Record<string, string> = {
  quantity: 'order-quantity',
  customerName: 'order-name',
  phone: 'order-phone',
  email: 'order-email',
  wilayaCode: 'order-wilaya',
  commune: 'order-commune',
  address: 'order-address',
  deliveryNotes: 'order-notes',
};

/**
 * Guest checkout, one step at a time: quantity, contact, delivery, then a
 * review of everything before confirming. Each step checks its own fields with
 * the rules the server uses, so a problem is always shown on the step that
 * asks for it — never behind a hidden field, which used to make "Confirmer"
 * do nothing at all. Without JavaScript every step shows at once and the form
 * posts in one go, exactly as before.
 */
export function OrderForm({ locale, labels, wilayas, fees, unitPrice, currencyLabel, maxQuantity }: Props) {
  const [state, formAction, pending] = useActionState<OrderFormState, FormData>(placeOrderAction, ORDER_FORM_INITIAL);
  const hydrated = useHydrated();
  const form = useRef<HTMLFormElement>(null);

  const [step, setStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [wilayaCode, setWilayaCode] = useState<number | ''>('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('HOME');

  const totals =
    wilayaCode === ''
      ? null
      : computeOrderTotals({ quantity, wilayaCode, deliveryType }, { unitPrice, deliveryFees: fees });

  const errorOf = (field: string) => {
    const code = stepErrors[field] ?? state.fieldErrors?.[field as keyof typeof state.fieldErrors];
    return code ? (labels.errors[code] ?? labels.errors.invalid) : undefined;
  };

  const focusField = (field: string | undefined) => {
    const id = field ? FIELD_IDS[field] : undefined;
    if (id) document.getElementById(id)?.focus();
  };

  // A field the server refused belongs to a step: go there and show it.
  useEffect(() => {
    const refused = Object.keys(state.fieldErrors ?? {});
    if (refused.length === 0) return;
    const target = stepWithField(refused);
    if (target === null) return;
    setStep(target);
    focusField(refused.find((field) => fieldsOfStep(target).includes(field)));
  }, [state]);

  const read = (): Record<string, string> => {
    const data = new FormData(form.current ?? undefined);
    return Object.fromEntries([...data.entries()].map(([key, value]) => [key, typeof value === 'string' ? value : '']));
  };

  /** Checks this step's fields only, with the same rules the server applies. */
  const stepIsValid = (index: number): boolean => {
    const parsed = orderInputSchema(maxQuantity).safeParse(read());
    const mine = fieldsOfStep(index);
    const errors = parsed.success
      ? {}
      : Object.fromEntries(Object.entries(orderFieldErrors(parsed.error)).filter(([field]) => mine.includes(field)));
    setStepErrors(errors as Record<string, string>);
    const first = Object.keys(errors)[0];
    if (first) focusField(first);
    return !first;
  };

  const goTo = (index: number) => {
    setStepErrors({});
    if (index === REVIEW_STEP) setTyped(read());
    setStep(index);
  };

  const wilayaName = wilayas.find((wilaya) => wilaya.code === wilayaCode)?.name ?? '';
  const reviewBlocks = [
    { step: 0, title: labels.steps.quantity, lines: [`${quantity} × ${formatDzd(unitPrice, currencyLabel)}`] },
    { step: 1, title: labels.steps.contact, lines: [typed.customerName, typed.phone, typed.email] },
    {
      step: 2,
      title: labels.steps.delivery,
      lines: [
        [wilayaName, typed.commune].filter(Boolean).join(' · '),
        typed.address,
        deliveryType === 'HOME' ? labels.fields.home : labels.fields.stopdesk,
        typed.deliveryNotes,
      ],
    },
  ];

  // Before hydration (and without JavaScript) every step is shown and the form
  // posts in one go; the step buttons only appear once they can work.
  const panelClass = (index: number) => cx('flex flex-col gap-5', hydrated && index !== step && 'hidden');

  return (
    <form
      ref={form}
      action={formAction}
      onSubmit={submitKeepingValues(formAction)}
      noValidate
      className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start"
    >
      <input type="hidden" name="locale" value={locale} />
      {/* Honeypot: hidden from people, tempting for bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <div className="flex flex-col gap-6 rounded-xl bg-white p-6 shadow-card-sm md:p-8">
        {hydrated && (
          <div>
            <p className="text-sm font-semibold text-text-secondary">{labels.progress[step]}</p>
            <h2 aria-live="polite" className="mt-1 text-h3 text-text">
              {labels.steps[ORDER_STEPS[step]!.id]}
            </h2>
            <ol aria-hidden="true" className="mt-3 flex gap-1.5">
              {ORDER_STEPS.map((entry, index) => (
                <li
                  key={entry.id}
                  className={cx('h-1.5 flex-1 rounded-full', index <= step ? 'bg-accent' : 'bg-surface-3')}
                />
              ))}
            </ol>
          </div>
        )}

        <div className={panelClass(0)}>
          <QuantityFields
            labels={labels}
            errorOf={errorOf}
            maxQuantity={maxQuantity}
            quantity={quantity}
            onQuantity={setQuantity}
          />
        </div>

        <div className={panelClass(1)}>
          <ContactFields labels={labels} errorOf={errorOf} />
        </div>

        <div className={panelClass(2)}>
          <DeliveryFields
            labels={labels}
            errorOf={errorOf}
            wilayas={wilayas}
            wilayaCode={wilayaCode}
            onWilaya={setWilayaCode}
            deliveryType={deliveryType}
            onDeliveryType={setDeliveryType}
          />
        </div>

        {hydrated && (
          <div className={panelClass(REVIEW_STEP)}>
            <OrderReview blocks={reviewBlocks} editLabel={labels.actions.edit} onEdit={goTo} />
            {/*
              Confirm lives here, on the step that sends. Sharing one button
              with "Continuer" made React turn it into a submit inside the very
              click that moved here, and the order left a step early.
            */}
            <p className="mt-5 flex items-baseline justify-between gap-4 rounded-2xl bg-surface-3 px-4 py-3 text-[16px]">
              <span className="font-bold text-text">{labels.summary.total}</span>
              <span dir="ltr" className="font-bold text-accent">
                {totals ? formatDzd(totals.totalPrice, currencyLabel) : '—'}
              </span>
            </p>
            <Button type="submit" disabled={pending} className="mt-4 w-full sm:w-auto">
              {pending ? labels.actions.confirming : labels.actions.confirm}
            </Button>
          </div>
        )}

        {state.formError && (
          <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {labels.errors[state.formError] ?? labels.errors.server_error}
          </p>
        )}

        {/*
          On a phone the summary sits below, so without this line people would
          press the button having never seen the price.
        */}
        {(!hydrated || step !== REVIEW_STEP) && (
          <p className="flex items-baseline justify-between gap-4 rounded-2xl bg-surface-3 px-4 py-3 text-[15px] lg:hidden">
            <span className="font-bold text-text">{labels.summary.total}</span>
            <span dir="ltr" className="font-bold text-accent">
              {totals
                ? formatDzd(totals.totalPrice, currencyLabel)
                : `${formatDzd(unitPrice * quantity, currencyLabel)} + ${labels.summary.delivery}`}
            </span>
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          {hydrated && step > 0 && (
            <Button type="button" variant="secondary" onClick={() => goTo(step - 1)} className="w-full sm:w-auto">
              {labels.actions.back}
            </Button>
          )}
          {hydrated && step < REVIEW_STEP && (
            <Button
              type="button"
              onClick={() => {
                if (stepIsValid(step)) goTo(step + 1);
              }}
              className="w-full sm:w-auto"
            >
              {labels.actions.continue}
            </Button>
          )}
          {/* No JavaScript: every step is shown, and this one button sends it all. */}
          {!hydrated && (
            <Button type="submit" className="w-full sm:w-auto">
              {labels.actions.confirm}
            </Button>
          )}
        </div>
      </div>

      <OrderSummary
        labels={labels}
        unitPrice={unitPrice}
        currencyLabel={currencyLabel}
        quantity={quantity}
        totals={totals}
      />
    </form>
  );
}
