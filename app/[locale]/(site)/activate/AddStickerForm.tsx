'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { submitKeepingValues } from '@/components/ui/submitKeepingValues';
import type { Locale } from '@/i18n/locales';
import { ACTIVATION_INITIAL, type ActivationState } from '@/lib/activation/state';
import { FormMessage } from '../_auth/fields';
import { addStickerAction } from './actions';
import { CarFields, type CarLabels } from './CarFields';

/** Signed in already: which car this sticker goes on, and it is theirs (success redirects to /activate/done). */
export function AddStickerForm({
  locale,
  tagId,
  labels,
}: {
  locale: Locale;
  tagId: string;
  labels: { car: CarLabels; submit: string; submitting: string; errors: Record<string, string> };
}) {
  const [state, formAction, pending] = useActionState<ActivationState, FormData>(addStickerAction, ACTIVATION_INITIAL);

  const message = (code: string | undefined) => (code ? (labels.errors[code] ?? labels.errors.invalid) : undefined);
  const errors = state.step === 'details' ? (state.fieldErrors ?? {}) : {};

  return (
    <form
      action={formAction}
      onSubmit={submitKeepingValues(formAction)}
      className="flex flex-col gap-6 rounded-xl bg-white p-6 shadow-card-sm md:p-8"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="tagId" value={tagId} />
      <CarFields
        labels={labels.car}
        errors={{ brand: message(errors.brand), brandOther: message(errors.brandOther), model: message(errors.model) }}
        required
      />
      {state.formError && <FormMessage tone="error">{message(state.formError)}</FormMessage>}
      <Button type="submit" disabled={pending}>
        {pending ? labels.submitting : labels.submit}
      </Button>
    </form>
  );
}
