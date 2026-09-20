import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'AutoLink — Scan. Contact. Done.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The logo mark, inlined: the image renderer has no network access. */
async function markDataUri(): Promise<string | null> {
  try {
    const file = await readFile(path.join(process.cwd(), 'public', 'brand', 'autolink-mark.svg'));
    return `data:image/svg+xml;base64,${file.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * Social preview card. Latin brand text only, so one image works for the
 * three locales without shipping an Arabic font to the image renderer.
 */
export default async function OpengraphImage() {
  const mark = await markDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #fdece3 0%, #fdf7f3 60%)',
          color: '#1d1714',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {mark ? (
            // eslint-disable-next-line @next/next/no-img-element -- this renders inside satori, not in a browser.
            <img src={mark} width={86} height={80} alt="" />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: 64, background: '#f85e13' }} />
          )}
          <div style={{ fontSize: 44, fontWeight: 800 }}>AutoLink</div>
        </div>
        <div style={{ marginTop: 48, fontSize: 76, fontWeight: 800, lineHeight: 1.1, maxWidth: 900 }}>
          Your car can receive messages.
        </div>
        <div style={{ marginTop: 24, fontSize: 36, color: '#f2541b', fontWeight: 700 }}>
          Your number never shows.
        </div>
        <div style={{ marginTop: 40, fontSize: 28, color: '#6b5b52' }}>Scan. Contact. Done.</div>
      </div>
    ),
    size,
  );
}
