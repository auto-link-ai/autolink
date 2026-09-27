import { createServer, type Server } from 'node:http';

/**
 * A stand-in for Google's Gemini API during the e2e run, so the message check
 * runs for real without calling Google: « hmar » and « kelb » are abusive,
 * anything else is fine. Same answer shape as Gemini, usage included.
 */
export const GEMINI_MOCK_PORT = 3199;
const ABUSIVE = /\b(hmar|kelb)\b/i;

export function startGeminiMock(): Promise<() => Promise<void>> {
  const server: Server = createServer((request, response) => {
    let raw = '';
    request.on('data', (chunk) => (raw += chunk));
    request.on('end', () => {
      let text = '';
      try {
        text = (JSON.parse(raw) as { contents?: Array<{ parts?: Array<{ text?: string }> }> }).contents?.[0]?.parts?.[0]?.text ?? '';
      } catch {
        // An empty text is simply fine.
      }
      const abusive = ABUSIVE.test(text);
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          candidates: [
            {
              finishReason: 'STOP',
              content: { parts: [{ text: JSON.stringify({ abusive, reason: abusive ? 'Insulte (e2e).' : 'Rien à signaler.' }) }] },
            },
          ],
          usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 12, totalTokenCount: 132 },
        }),
      );
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(GEMINI_MOCK_PORT, '127.0.0.1', () => resolve(() => new Promise((done) => server.close(() => done()))));
  });
}
