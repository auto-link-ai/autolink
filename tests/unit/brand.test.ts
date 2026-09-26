import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BRAND_ASSETS } from '@/lib/brand';
import { loadBrandLogo, loadBrandMark, loadBrandWordmark, pathBounds } from '@/lib/print/logo';

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
    // 38mm wide on an activation slip must stay a single short line.
    expect(logo!.heightAt(38)).toBeLessThan(15);
  });

  it('the sticker stacks the mark above the name, both cut from those same files', async () => {
    const [mark, wordmark] = await Promise.all([loadBrandMark(), loadBrandWordmark()]);
    expect(mark).not.toBeNull();
    // The name alone is a long, low word — not the whole lockup with the mark in it.
    const ratio = wordmark!.heightAt(100) / 100;
    expect(ratio).toBeGreaterThan(0.12);
    expect(ratio).toBeLessThan(0.25);
    // On the sticker: mark 18mm at 6mm down, name 36mm at 25.5mm down; the QR starts at 33mm.
    expect(6 + mark!.heightAt(18)).toBeLessThan(25.5);
    expect(25.5 + wordmark!.heightAt(36)).toBeLessThan(33);
  });

  it('measures a path by the points it passes through', () => {
    expect(pathBounds('M 10 20 H 50 V 80 L 10 80 Z')).toEqual({ x: 10, y: 20, width: 40, height: 60 });
    expect(pathBounds('M10 20C30 0 60 40 70 20Z')).toEqual({ x: 10, y: 0, width: 60, height: 40 });
    // Relative commands would give a wrong box: none rather than wrong.
    expect(pathBounds('m 10 20 l 5 5')).toBeNull();
  });
});
