import { describe, expect, it } from 'vitest';
import { needsCheck, readVerdict } from '@/lib/moderation/verdict';

const answer = (json: string, finishReason = 'STOP') => ({
  candidates: [{ finishReason, content: { parts: [{ text: json }] } }],
});

describe('needsCheck', () => {
  it('checks typed words, never an empty one-tap report', () => {
    expect(needsCheck('ya hmar')).toBe(true);
    expect(needsCheck('')).toBe(false);
    expect(needsCheck('   \n ')).toBe(false);
  });
});

describe('readVerdict', () => {
  it('stops what Gemini calls abusive, with its reason', () => {
    expect(readVerdict(answer('{"abusive": true, "reason": "Insulte (« hmar ») et menace."}'))).toEqual({
      kind: 'abusive',
      reason: 'Insulte (« hmar ») et menace.',
    });
  });

  it('lets through what Gemini calls fine', () => {
    expect(readVerdict(answer('{"abusive": false, "reason": "Signale une sortie bloquée."}'))).toEqual({ kind: 'fine' });
  });

  it("treats Google's own safety block as abusive", () => {
    expect(readVerdict({ promptFeedback: { blockReason: 'OTHER' } }).kind).toBe('abusive');
    expect(readVerdict({ candidates: [{ finishReason: 'SAFETY' }] }).kind).toBe('abusive');
  });

  it('treats anything unexpected as no answer, so the message is delivered', () => {
    for (const response of [
      null,
      'nope',
      {},
      { candidates: [] },
      answer('not json'),
      answer('{"abusive": "yes"}'),
      answer('{"reason": "missing verdict"}'),
    ]) {
      expect(readVerdict(response)).toEqual({ kind: 'unknown' });
    }
  });

  it('keeps a reason short enough for the admin list', () => {
    const long = 'x'.repeat(2000);
    const verdict = readVerdict(answer(JSON.stringify({ abusive: true, reason: long })));
    expect(verdict.kind === 'abusive' && verdict.reason.length).toBe(300);
  });
});

describe('checkMessage', async () => {
  const { checkMessage } = await import('@/lib/moderation/check');
  const reply = (status: number, json: unknown = {}) =>
    new Response(JSON.stringify(json), { status, headers: { 'Content-Type': 'application/json' } });
  const verdict = (abusive: boolean) => reply(200, answer(JSON.stringify({ abusive, reason: 'r' })));

  it('checks nothing without a key', async () => {
    let called = false;
    const fetchImpl = (async () => ((called = true), verdict(true))) as typeof fetch;
    expect(await checkMessage('ya hmar', { key: '', fetchImpl })).toEqual({ kind: 'unknown' });
    expect(called).toBe(false);
  });

  it('sends only the text, with the key in a header', async () => {
    let sent: { url: string; init: RequestInit } | null = null;
    const fetchImpl = (async (url: string, init: RequestInit) => ((sent = { url, init }), verdict(true))) as typeof fetch;
    expect((await checkMessage('ya hmar', { key: 'k', fetchImpl })).kind).toBe('abusive');
    expect(sent!.url).not.toContain('key=');
    expect((sent!.init.headers as Record<string, string>)['x-goog-api-key']).toBe('k');
    const body = JSON.parse(String(sent!.init.body)) as { contents: Array<{ parts: Array<{ text: string }> }> };
    expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'ya hmar' }] }]);
  });

  it('tries once more after a one-off error from Google', async () => {
    const answers = [reply(403), verdict(false)];
    const fetchImpl = (async () => answers.shift()!) as typeof fetch;
    expect(await checkMessage('bougez svp', { key: 'k', fetchImpl })).toEqual({ kind: 'fine' });
  });

  it('gives up on a request Google will never accept, and on repeated failures', async () => {
    let calls = 0;
    const bad = (async () => (calls++, reply(400))) as typeof fetch;
    expect(await checkMessage('x', { key: 'k', fetchImpl: bad })).toEqual({ kind: 'unknown' });
    expect(calls).toBe(1);
    const down = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;
    expect(await checkMessage('x', { key: 'k', fetchImpl: down })).toEqual({ kind: 'unknown' });
  });
});
