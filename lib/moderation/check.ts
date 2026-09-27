import 'server-only';
import { algiersToday } from '@/lib/care/due';
import { apiUsageRepository } from '@/lib/db/repositories/apiUsage';
import { readUsage, type CheckOutcome, type Tokens } from './usage';
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
  /** Where each check is counted (Admin → Messages bloqués). Tests pass their own. */
  record?: (outcome: CheckOutcome, tokens: Tokens) => Promise<void>;
}

/** Counts one check for today. Counting never gets in the way of the check itself. */
async function recordUsage(outcome: CheckOutcome, tokens: Tokens): Promise<void> {
  try {
    const day = algiersToday().toISOString().slice(0, 10);
    await apiUsageRepository.recordGeminiCheck({ kind: 'system' }, day, outcome, tokens);
  } catch (error) {
    console.warn('[moderation] usage not counted:', error instanceof Error ? error.message : 'error');
  }
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
  const record = options.record ?? recordUsage;
  let tokens: Tokens = { prompt: 0, output: 0 };
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
        const json: unknown = await response.json();
        const used = readUsage(json);
        tokens = { prompt: tokens.prompt + used.prompt, output: tokens.output + used.output };
        const verdict = readVerdict(json);
        if (verdict.kind !== 'unknown') {
          await record(verdict.kind, tokens);
          return verdict;
        }
      } else {
        console.warn(`[moderation] Gemini answered ${response.status} (attempt ${attempt})`);
        if (!temporary(response.status)) break;
      }
    } catch (error) {
      // Never the message itself in the logs.
      console.warn(`[moderation] Gemini unreachable (attempt ${attempt}):`, error instanceof Error ? error.name : 'error');
    }
  }
  await record('failed', tokens);
  return { kind: 'unknown' };
}
