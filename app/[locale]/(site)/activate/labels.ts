import { getTranslations } from 'next-intl/server';
import type { CodeLabels } from '../_auth/CodeFields';
import type { WizardLabels } from './ActivationWizard';

/** The activation screen's copy, built once on the server for the client wizard. */
export async function activationLabels(): Promise<{
  wizard: Omit<WizardLabels, 'code' | 'errors'> & { code?: CodeLabels };
  signedIn: { submit: string; submitting: string };
  errors: Record<string, string>;
}> {
  const t = await getTranslations('activate');
  const auth = await getTranslations('auth');
  return {
    wizard: {
      steps: { details: t('steps.details'), code: t('steps.code'), done: t('steps.done') },
      you: t('details.you'),
      car: t('details.car'),
      pinTitle: t('details.pin'),
      firstName: auth('fields.firstName'),
      lastName: auth('fields.lastName'),
      phone: auth('fields.phone'),
      phoneHint: auth('fields.phoneHint'),
      pin: auth('fields.pin'),
      pinHint: auth('fields.pinHint'),
      pinConfirm: auth('fields.pinConfirm'),
      privacy: t('details.privacy'),
      submit: t('submit'),
      submitting: t('submitting'),
      activate: t('code.submit'),
      activating: t('code.submitting'),
      carLabels: {
        brand: t('fields.brand'),
        chooseBrand: t('fields.chooseBrand'),
        otherBrand: t('fields.otherBrand'),
        brandOther: t('fields.brandOther'),
        model: t('fields.model'),
        modelPlaceholder: t('fields.modelPlaceholder'),
      },
    },
    signedIn: { submit: t('signedIn.submit'), submitting: t('signedIn.submitting') },
    errors: {
      invalid: t('errors.invalid'),
      rate_limited: t('errors.rate_limited'),
      signed_out: t('errors.signed_out'),
    },
  };
}
