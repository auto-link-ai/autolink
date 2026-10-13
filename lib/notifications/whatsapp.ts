import 'server-only';
import { normalizeDzPhone } from '@/lib/validation/phone';

/**
 * WhatsApp over Meta's Cloud API. A business may only start a conversation
 * with an approved template: its words are fixed in WhatsApp Manager, and this
 * module fills in the blanks — body variables {{1}}, {{2}}, … in order, and
 * the {{1}} at the end of the URL button.
 *
 * Best-effort, like email: without the WHATSAPP_* variables the send is skipped
 * and logged. Errors carry the HTTP status and Meta's error code, never the
 * number or the text.
 */
export interface WhatsAppTemplateSend {
  /** As stored on the account: 0XXXXXXXXX. */
  to: string;
  body: string[];
  buttonSuffix?: string;
}

export type WhatsAppResult = { status: 'SENT' } | { status: 'SKIPPED'; reason: string } | { status: 'FAILED'; error: string };

const DEFAULT_API_VERSION = 'v22.0';

/** 0550123456 → 213550123456: the international digits the API wants. */
export function toWhatsAppNumber(phone: string): string | null {
  const national = normalizeDzPhone(phone);
  return national ? `213${national.slice(1)}` : null;
}

/**
 * A template variable WhatsApp will accept: no line break, no tab, never four
 * spaces in a row (#132018 otherwise), and not too long for the template body.
 */
export function templateText(value: string, max: number): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

export function whatsAppTemplateLanguage(): string {
  return process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'ar';
}

export async function sendWhatsAppTemplate(send: WhatsAppTemplateSend): Promise<WhatsAppResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const template = process.env.WHATSAPP_TEMPLATE_NAME?.trim();
  if (!token || !phoneNumberId || !template) {
    console.info('[whatsapp] skipped: WHATSAPP_ACCESS_TOKEN / _PHONE_NUMBER_ID / _TEMPLATE_NAME are not set');
    return { status: 'SKIPPED', reason: 'not_configured' };
  }
  const to = toWhatsAppNumber(send.to);
  if (!to) return { status: 'SKIPPED', reason: 'invalid_number' };

  const components: object[] = [
    { type: 'body', parameters: send.body.map((text) => ({ type: 'text', text })) },
  ];
  if (send.buttonSuffix) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: send.buttonSuffix }],
    });
  }

  const version = process.env.WHATSAPP_API_VERSION?.trim() || DEFAULT_API_VERSION;
  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: { name: template, language: { code: whatsAppTemplateLanguage() }, components },
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (response.ok) return { status: 'SENT' };

    // Meta's code says what to fix: 190 token, 131030 number not on the test
    // list, 132000 variable count, 132001 template name or language.
    const payload = (await response.json().catch(() => null)) as { error?: { code?: number } } | null;
    const error = `whatsapp ${response.status} #${payload?.error?.code ?? '?'}`;
    console.error(`[whatsapp] failed: ${error}`);
    return { status: 'FAILED', error };
  } catch (error) {
    const reason = error instanceof Error ? error.name : 'unknown';
    console.error(`[whatsapp] failed: ${reason}`);
    return { status: 'FAILED', error: reason };
  }
}
