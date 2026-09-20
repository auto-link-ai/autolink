import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BRAND_ASSETS } from '@/lib/brand';
import { loadBrandLogo } from '@/lib/print/logo';

/** The artwork gets re-exported from the design file; these keep the code in step with it. */
describe('brand assets', () => {
  it.each(Object.entries(BRAND_ASSETS))('%s: the declared box matches the artwork', async (_name, asset) => {
    const svg = await readFile(path.join(process.cwd(), 'public', asset.src.replace(/^\//, '')), 'utf8');
    const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1]?.trim().split(/[\s,]+/).map(Number);
    // A stale width/height on the <img> means the page reflows once the SVG loads.
    expect(viewBox?.slice(2)).toEqual([asset.width, asset.height]);
  });

  it('the print pipeline can draw the lockup from that same file', async () => {
    const logo = await loadBrandLogo();
    expect(logo).not.toBeNull();
    // 38mm wide on the sticker has to clear the QR box, which starts 18mm down.
    expect(logo!.heightAt(38)).toBeLessThan(15);
  });
});
