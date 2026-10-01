import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/locales';
import { getSettings, type AppSettings } from '@/lib/config/settings';
import { publicSite } from '@/lib/config/site';
import { getWilayas } from '@/lib/config/wilayas';
import { formatDzd } from '@/lib/format/currency';
import type { PublicPricing } from '@/lib/site/pricing';
import { whatsappLink } from '@/lib/site/whatsapp';
import type { OrderFormLabels } from './orderLabels';

/**
 * What the order form needs, for any page that shows it: the order page and
 * the ad page /offre. The locale is passed in, so it works outside the
 * localized routes too.
 */

const ERROR_CODES = [
  'required',
  'invalid',
  'too_short',
  'too_long',
  'too_small',
  'too_large',
  'invalid_phone',
  'invalid_email',
  'no_delivery',
  'rate_limited',
  'rejected',
  'server_error',
] as const;

export async function orderFormLabels(locale: Locale): Promise<OrderFormLabels> {
  const t = await getTranslations({ locale, namespace: 'order' });
  const field = (key: keyof OrderFormLabels['fields']) => t(`fields.${key}`);
  return {
    fields: {
      name: field('name'),
      phone: field('phone'),
      phoneHint: field('phoneHint'),
      email: field('email'),
      emailHint: field('emailHint'),
      wilaya: field('wilaya'),
      wilayaPlaceholder: field('wilayaPlaceholder'),
      commune: field('commune'),
      address: field('address'),
      deliveryType: field('deliveryType'),
      home: field('home'),
      stopdesk: field('stopdesk'),
      notes: field('notes'),
      notesHint: field('notesHint'),
    },
    commune: {
      placeholder: t('commune.placeholder'),
      wilayaFirst: t('commune.wilayaFirst'),
      other: t('commune.other'),
      backToList: t('commune.backToList'),
    },
    sections: { quantity: t('sections.quantity'), contact: t('sections.contact'), delivery: t('sections.delivery') },
    quantity: {
      hint: t('quantity.hint'),
      cars: t.raw('quantity.cars') as [string, string, string],
      more: t('quantity.more'),
      stickers: t('quantity.stickers'),
      fewer: t('quantity.fewer'),
      oneMore: t('quantity.oneMore'),
    },
    feeAfterWilaya: t('feeAfterWilaya'),
    free: t('free'),
    extras: t('extras'),
    total: {
      stickers: t('total.stickers'),
      delivery: t('total.delivery'),
      deliveryPending: t('total.deliveryPending'),
      total: t('total.total'),
      nothingNow: t('total.nothingNow'),
    },
    actions: { order: t('actions.order'), ordering: t('actions.ordering') },
    checkFields: t('checkFields'),
    reassurance: t('reassurance'),
    sticky: { price: t('sticky.price'), order: t('sticky.order') },
    errors: Object.fromEntries(ERROR_CODES.map((code) => [code, t(`errors.${code}`)])),
    notice: t('notice'),
  };
}

export interface OrderFormData {
  settings: AppSettings;
  /** In the page's language, as the wilaya select shows them. */
  wilayas: { code: number; name: string }[];
  pricing: PublicPricing;
  whatsapp: { href: string; label: string } | null;
}

/** Price, fees and wilayas from the database; null when they cannot be read. */
export async function loadOrderFormData(locale: Locale): Promise<OrderFormData | null> {
  try {
    const [settings, wilayas, t] = await Promise.all([
      getSettings(),
      getWilayas(),
      getTranslations({ locale, namespace: 'order' }),
    ]);
    if (wilayas.length === 0) return null;
    const href = whatsappLink(publicSite().whatsapp, t('whatsapp.message'));
    return {
      settings,
      wilayas: wilayas.map((w) => ({
        code: w.code,
        name: locale === 'ar' ? w.nameAr : locale === 'en' ? w.nameEn : w.nameFr,
      })),
      pricing: {
        unitPrice: settings.unitPriceDzd,
        unitPriceLabel: formatDzd(settings.unitPriceDzd, settings.currencyLabel),
        currencyLabel: settings.currencyLabel,
        maxOrderQuantity: settings.maxOrderQuantity,
        retentionDays: settings.messageRetentionDays,
      },
      whatsapp: href ? { href, label: t('whatsapp.label') } : null,
    };
  } catch (error) {
    console.error('[order] cannot load settings:', error instanceof Error ? error.message : error);
    return null;
  }
}
