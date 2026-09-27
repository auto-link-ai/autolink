import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { NewCustomerLabels } from './NewCustomerForm';

const ERROR_CODES = ['required', 'invalid_email', 'too_short', 'too_long', 'invalid_phone', 'email_taken', 'not_allowed', 'server_error'] as const;

/** The « new customer » form's words. */
export async function newCustomerLabels(): Promise<NewCustomerLabels> {
  const t = await getTranslations('admin.customers.new');
  return {
    email: t('email'),
    name: t('name'),
    phone: t('phone'),
    submit: t('submit'),
    working: t('working'),
    cancel: t('cancel'),
    done: t('done'),
    open: t('open'),
    errors: Object.fromEntries(ERROR_CODES.map((code) => [code, t(`errors.${code}`)])),
  };
}
