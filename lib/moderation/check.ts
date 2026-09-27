import 'server-only';
import { MODERATION_INSTRUCTIONS, MODERATION_MODEL, readVerdict, VERDICT_SCHEMA, type Verdict } from './verdict';

const GOOGLE = 'https://generativelanguage.googleapis.com';

/** Google's address, unless GEMINI_API_BASE points elsewhere (the e2e run's local stand-in). */
function endpoint(): string {
  const base = process.env.GEMINI_API_BASE?.trim() || GOOGLE;
  return `${base.replace(/\/+$/, '')}/v1beta/models/${MODERATION_MODEL}:generateContent`;
}
/** The sender is waiting: never longer than this, retries included. */
const DEADLINE_MS = 5000;
const ATTEMPT_MS = 3500;
/** Google's own filters stay off: the model must be able to read an insult to judge it. */
const SAFETY_OFF = ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT'].map(
  (category) => ({ category, threshold: 'BLOCK_NONE' }),
);

export interface CheckOptions {
  key?: string;
  fetchImpl?: typeof fetch;
}

/** Worth one more try: rate limits, Google's server errors, and the odd one-off 403. */
function temporary(status: number): boolean {
  return status === 403 || status === 408 || status === 429 || status >= 500;
}

/**
 * Asks Gemini whether a typed message is abusive. Only the text is sent —
 * never the sender's contact, the sticker or the owner. Without a key (tests,
 * local development) nothing is checked. `unknown` means no usable answer
 * in time; the caller delivers the message rather than lose a real alert.
 */
export async function checkMessage(text: string, options: CheckOptions = {}): Promise<Verdict> {
  const key = (options.key ?? process.env.GEMINI_API_KEY)?.trim();
  if (!key) return { kind: 'unknown' };
  const send = options.fetchImpl ?? fetch;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: MODERATION_INSTRUCTIONS }] },
    contents: [{ role: 'user', parts: [{ text }] }],
    safetySettings: SAFETY_OFF,
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: VERDICT_SCHEMA },
  });

  const deadline = Date.now() + DEADLINE_MS;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const left = deadline - Date.now();
    if (left < 500) break;
    try {
      const response = await send(endpoint(), {
        method: 'POST',
        // In a header, not the address: addresses end up in logs.
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body,
        signal: AbortSignal.timeout(Math.min(ATTEMPT_MS, left)),
      });
      if (response.ok) {
        const verdict = readVerdict(await response.json());
        if (verdict.kind !== 'unknown') return verdict;
      } else {
        console.warn(`[moderation] Gemini answered ${response.status} (attempt ${attempt})`);
        if (!temporary(response.status)) break;
      }
    } catch (error) {
      // Never the message itself in the logs.
      console.warn(`[moderation] Gemini unreachable (attempt ${attempt}):`, error instanceof Error ? error.name : 'error');
    }
  }
  return { kind: 'unknown' };
}
