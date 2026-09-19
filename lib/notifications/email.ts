import 'server-only';

/**
 * All email goes through this module. Resend is one adapter behind `sendEmail`;
 * switching providers touches this file only.
 *
 * Email is best-effort: callers never fail a user action because an email
 * could not be sent. Without EMAIL_API_KEY the send is skipped and logged.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export type EmailResult = { status: 'SENT' } | { status: 'SKIPPED'; reason: string } | { status: 'FAILED'; error: string };

type Adapter = (message: EmailMessage, from: string, apiKey: string) => Promise<EmailResult>;

const resend: Adapter = async (message, from, apiKey) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
    signal: AbortSignal.timeout(8_000),
  });
  if (response.ok) return { status: 'SENT' };
  return { status: 'FAILED', error: `resend ${response.status}` };
};

const ADAPTERS: Record<string, Adapter> = { resend };

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM;
  const adapter = ADAPTERS[process.env.EMAIL_PROVIDER || 'resend'];
  if (!apiKey || !from || !adapter) {
    console.info(`[email] skipped "${message.subject}": email is not configured`);
    return { status: 'SKIPPED', reason: 'not_configured' };
  }
  try {
    const result = await adapter(message, from, apiKey);
    if (result.status === 'FAILED') console.error(`[email] failed "${message.subject}": ${result.error}`);
    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.name : 'unknown';
    console.error(`[email] failed "${message.subject}": ${reason}`);
    return { status: 'FAILED', error: reason };
  }
}
