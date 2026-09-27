import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { OrderFormLabels } from './OrderForm';

/**
 * The admin order form's words: the field names and field errors are the
 * website order form's own, so both say the same thing in all three languages.
 */
export async function orderFormLabels(mode: 'edit' | 'new'): Promise<OrderFormLabels> {
  const [tFields, tErrors, t] = await Promise.all([
    getTranslations('order.fields'),
    getTranslations('order.errors'),
    getTranslations('admin.orders.form'),
  ]);
  return {
    fields: {
      customerName: tFields('name'),
      phone: tFields('phone'),
      email: tFields('email'),
      wilayaCode: tFields('wilaya'),
      commune: tFields('commune'),
      address: tFields('address'),
      deliveryType: tFields('deliveryType'),
      deliveryNotes: tFields('notes'),
      quantity: tFields('quantity'),
    },
    home: tFields('home'),
    stopdesk: tFields('stopdesk'),
    wilayaPlaceholder: tFields('wilayaPlaceholder'),
    submit: mode === 'edit' ? t('submitEdit') : t('submitNew'),
    working: t('working'),
    cancel: t('cancel'),
    errors: Object.fromEntries(
      ['required', 'invalid', 'too_short', 'too_long', 'too_small', 'too_large', 'invalid_phone', 'invalid_email'].map((code) => [
        code,
        tErrors(code as 'invalid'),
      ]),
    ),
    formErrors: {
      no_delivery: t('formErrors.no_delivery'),
      not_allowed: t('formErrors.not_allowed'),
      not_found: t('formErrors.not_found'),
      conflict: t('formErrors.conflict'),
    },
  };
}
