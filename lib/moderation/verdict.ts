/**
 * What Gemini is asked, and how its answer is read. Plain logic with no
 * network and no secrets, so it runs in unit tests; `check.ts` sends it.
 */
export const MODERATION_MODEL = 'gemini-3.1-flash-lite';

export const MODERATION_INSTRUCTIONS = [
  'You check short messages that strangers send to a car owner through a QR sticker on the car, in Algeria.',
  'They are written in Algerian Darija (in Arabic script, or in Latin letters with digits such as 3, 7, 9),',
  'Modern Standard Arabic, French or English, often mixed in one sentence.',
  'Decide whether the message contains insults, slurs, threats, sexual harassment or obscene language.',
  'A message that is angry, urgent or rude in tone but only reports a real problem with the car',
  '(lights on, blocking an exit, damage, an alarm, a window open) is NOT abusive.',
  'Answer in JSON. "reason": one short sentence in French naming what was found, or why it is fine.',
].join(' ');

/** Gemini's answer shape: it is held to this by `responseSchema`. */
export const VERDICT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    abusive: { type: 'BOOLEAN' },
    reason: { type: 'STRING' },
  },
  required: ['abusive', 'reason'],
} as const;

export type Verdict = { kind: 'abusive'; reason: string } | { kind: 'fine' } | { kind: 'unknown' };

const REASON_MAX = 300;
/** Google refused to read it: its own filters found it harassing, hateful or sexual. */
const GOOGLE_BLOCKED = 'Bloqué par le filtre de sécurité de Google.';

/** Only typed words can insult; a one-tap report has nothing to check. */
export function needsCheck(body: string): boolean {
  return body.trim().length > 0;
}

/**
 * Gemini's raw response → a verdict. Anything unexpected is `unknown`, which
 * the caller treats like no answer at all: the message is delivered.
 */
export function readVerdict(response: unknown): Verdict {
  const r = response as {
    promptFeedback?: { blockReason?: string };
    candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
  } | null;
  if (!r || typeof r !== 'object') return { kind: 'unknown' };
  if (r.promptFeedback?.blockReason) return { kind: 'abusive', reason: GOOGLE_BLOCKED };

  const candidate = r.candidates?.[0];
  if (candidate?.finishReason === 'SAFETY') return { kind: 'abusive', reason: GOOGLE_BLOCKED };
  const text = candidate?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') return { kind: 'unknown' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { kind: 'unknown' };
  }
  const answer = parsed as { abusive?: unknown; reason?: unknown };
  if (typeof answer.abusive !== 'boolean') return { kind: 'unknown' };
  if (!answer.abusive) return { kind: 'fine' };
  const reason = typeof answer.reason === 'string' ? answer.reason.trim().slice(0, REASON_MAX) : '';
  return { kind: 'abusive', reason };
}
