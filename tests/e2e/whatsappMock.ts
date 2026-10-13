import { createServer, type Server } from 'node:http';

/**
 * A stand-in for Meta's WhatsApp Cloud API during the e2e run (Playwright points
 * WHATSAPP_API_BASE here), so codes, alerts and reminders are really sent —
 * and nothing ever reaches a real phone. It answers like the Cloud API and
 * keeps what it was sent, which the specs read back: `GET /sent?to=2135…`
 * returns the messages for that number, newest last.
 */
export const WHATSAPP_MOCK_PORT = 3198;
export const WHATSAPP_MOCK_URL = `http://127.0.0.1:${WHATSAPP_MOCK_PORT}`;

export interface SentTemplate {
  to: string;
  template: string;
  body: string[];
  button: string | null;
}

interface TemplateRequest {
  to?: string;
  template?: {
    name?: string;
    components?: Array<{ type?: string; parameters?: Array<{ text?: string }> }>;
  };
}

function toSent(request: TemplateRequest): SentTemplate {
  const components = request.template?.components ?? [];
  const texts = (type: string) =>
    components.find((component) => component.type === type)?.parameters?.map((p) => p.text ?? '') ?? [];
  return {
    to: request.to ?? '',
    template: request.template?.name ?? '',
    body: texts('body'),
    button: texts('button')[0] ?? null,
  };
}

export function startWhatsAppMock(): Promise<() => Promise<void>> {
  const sent: SentTemplate[] = [];
  let next = 1;
  const server: Server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', WHATSAPP_MOCK_URL);
    if (request.method === 'GET' && url.pathname === '/sent') {
      const to = url.searchParams.get('to');
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(sent.filter((message) => !to || message.to === to)));
      return;
    }
    let raw = '';
    request.on('data', (chunk) => (raw += chunk));
    request.on('end', () => {
      try {
        sent.push(toSent(JSON.parse(raw) as TemplateRequest));
      } catch {
        response.writeHead(400, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: { code: 100, message: 'bad request (e2e)' } }));
        return;
      }
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ messaging_product: 'whatsapp', messages: [{ id: `wamid.e2e.${next++}` }] }));
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(WHATSAPP_MOCK_PORT, '127.0.0.1', () => resolve(() => new Promise((done) => server.close(() => done()))));
  });
}

/** What the stand-in was sent for one number (0XXXXXXXXX or 213…), newest last. */
export async function sentTo(phone: string): Promise<SentTemplate[]> {
  const digits = phone.replace(/\D/g, '');
  const international = digits.startsWith('0') ? `213${digits.slice(1)}` : digits;
  const response = await fetch(`${WHATSAPP_MOCK_URL}/sent?to=${international}`);
  return (await response.json()) as SentTemplate[];
}
