import { getTranslations } from 'next-intl/server';
import { href } from '@/components/site/links';
import type { Locale } from '@/i18n/locales';
import { publicSite } from '@/lib/config/site';
import { whatsappLink } from '@/lib/site/whatsapp';
import type { CodeLabels } from './CodeFields';

/** The WhatsApp-code step's copy, the same on activation and PIN reset. */
export async function codeLabels(): Promise<CodeLabels> {
  const t = await getTranslations('auth');
  return {
    code: t('fields.code'),
    codeHint: t('fields.codeHint'),
    sentTo: t('code.sentTo'),
    resend: t('code.resend'),
    resent: t('code.resent'),
    changeNumber: t('code.changeNumber'),
    notReceived: t('code.notReceived'),
    writeUs: t('code.writeUs'),
  };
}

/** Where « Écrivez-nous » goes: the shop's WhatsApp when there is one, the contact page otherwise. */
export async function codeHelpHref(locale: Locale): Promise<string> {
  const t = await getTranslations('auth.code');
  return whatsappLink(publicSite().whatsapp, t('helpMessage')) ?? href(locale, '/contact');
}
