import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendWhatsAppTemplate, templateText, toWhatsAppNumber } from '@/lib/notifications/whatsapp';

const fetchMock = vi.fn<typeof fetch>();

function configure() {
  vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'token-123');
  vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '1098765432');
  vi.stubEnv('WHATSAPP_TEMPLATE_NAME', 'owner_alert');
  vi.stubEnv('WHATSAPP_TEMPLATE_LANGUAGE', 'ar');
  vi.stubEnv('WHATSAPP_API_VERSION', '');
}

const SEND = { to: '0550123456', body: ['Ahmed', 'Clio · Grise', 'الأضواء مشغلة'], buttonSuffix: 'MSG-0000000001' };

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 }));
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  configure();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('toWhatsAppNumber', () => {
  it('turns any accepted way of writing a mobile into international digits', () => {
    expect(toWhatsAppNumber('0550123456')).toBe('213550123456');
    expect(toWhatsAppNumber('+213 6 61 23 45 67')).toBe('213661234567');
    expect(toWhatsAppNumber('00213770123456')).toBe('213770123456');
  });

  it('refuses what is not an Algerian mobile', () => {
    expect(toWhatsAppNumber('021123456')).toBeNull();
    expect(toWhatsAppNumber('')).toBeNull();
  });
});

describe('templateText', () => {
  it('flattens what WhatsApp refuses in a variable', () => {
    expect(templateText('  one\ntwo\t\tthree      four ', 100)).toBe('one two three four');
  });

  it('cuts a long text to the limit, and says so', () => {
    const text = templateText('a'.repeat(50), 10);
    expect(text).toHaveLength(10);
    expect(text.endsWith('…')).toBe(true);
  });
});

describe('sendWhatsAppTemplate', () => {
  it('posts the template, its variables and its button to the Cloud API', async () => {
    await expect(sendWhatsAppTemplate(SEND)).resolves.toEqual({ status: 'SENT' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://graph.facebook.com/v22.0/1098765432/messages');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer token-123');
    expect(JSON.parse(init!.body as string)).toEqual({
      messaging_product: 'whatsapp',
      to: '213550123456',
      type: 'template',
      template: {
        name: 'owner_alert',
        language: { code: 'ar' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Ahmed' },
              { type: 'text', text: 'Clio · Grise' },
              { type: 'text', text: 'الأضواء مشغلة' },
            ],
          },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: 'MSG-0000000001' }] },
        ],
      },
    });
  });

  it('uses WHATSAPP_API_VERSION when set, and leaves the button out when there is none', async () => {
    vi.stubEnv('WHATSAPP_API_VERSION', 'v24.0');
    await sendWhatsAppTemplate({ ...SEND, buttonSuffix: undefined });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://graph.facebook.com/v24.0/1098765432/messages');
    expect(JSON.parse(init!.body as string).template.components).toHaveLength(1);
  });

  it('skips, without calling anyone, when it is not configured', async () => {
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', '');
    await expect(sendWhatsAppTemplate(SEND)).resolves.toEqual({ status: 'SKIPPED', reason: 'not_configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips a number it cannot reach', async () => {
    await expect(sendWhatsAppTemplate({ ...SEND, to: '12' })).resolves.toEqual({
      status: 'SKIPPED',
      reason: 'invalid_number',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps Meta’s error code, never the number or the text', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: 132000, message: 'Number of parameters does not match for 213550123456: Ahmed' } }),
        { status: 400 },
      ),
    );
    const result = await sendWhatsAppTemplate(SEND);
    expect(result).toEqual({ status: 'FAILED', error: 'whatsapp 400 #132000' });
  });

  it('turns a network failure into FAILED instead of throwing', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('timed out'), { name: 'TimeoutError' }));
    await expect(sendWhatsAppTemplate(SEND)).resolves.toEqual({ status: 'FAILED', error: 'TimeoutError' });
  });
});
