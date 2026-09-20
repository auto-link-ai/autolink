import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { rgb, type PDFPage, type RGB } from 'pdf-lib';
import { BRAND_ASSETS } from '@/lib/brand';

/**
 * The brand lockup, drawn into a PDF from the same SVG the site uses
 * (`public/brand/autolink-logo.svg`), so print and screen never drift apart.
 * Only the paths are read: the artwork's drop shadows are a screen effect and
 * have no business on a printing plate.
 *
 * Loading can fail (a trimmed deployment, a missing file). It then returns
 * null and the caller falls back to type — a batch must never fail over a logo.
 */
const LOGO_FILE = path.join(process.cwd(), 'public', ...BRAND_ASSETS.full.src.split('/').filter(Boolean));

interface ViewBox {
  width: number;
  height: number;
}

interface LogoPath {
  d: string;
  fill?: RGB;
  stroke?: RGB;
  strokeWidth: number;
}

export interface BrandLogo {
  /** What the lockup costs in height when drawn this wide (points). */
  heightAt(width: number): number;
  /** Draws it with its top-left corner at (x, y). */
  draw(page: PDFPage, box: { x: number; y: number; width: number }): void;
}

function toColor(value: string | undefined): RGB | undefined {
  if (!value || value === 'none') return undefined;
  if (value === 'black') return rgb(0, 0, 0);
  if (value === 'white') return rgb(1, 1, 1);
  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!hex?.[1]) return undefined;
  const n = parseInt(hex[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function attr(tag: string, name: string): string | undefined {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
}

/** The artwork is re-exported from time to time; never assume its size. */
function parseViewBox(svg: string): ViewBox | null {
  const raw = /viewBox="([^"]+)"/.exec(svg)?.[1]?.trim().split(/[\s,]+/).map(Number);
  if (!raw || raw.length !== 4) return null;
  const [, , width, height] = raw;
  return width && height && width > 0 && height > 0 ? { width, height } : null;
}

function parse(svg: string): LogoPath[] {
  const out: LogoPath[] = [];
  for (const [tag] of svg.matchAll(/<path\b[^>]*\/>/g)) {
    const d = attr(tag, 'd');
    if (!d) continue;
    const fill = toColor(attr(tag, 'fill'));
    const stroke = toColor(attr(tag, 'stroke'));
    if (!fill && !stroke) continue;
    out.push({ d, fill, stroke, strokeWidth: Number(attr(tag, 'stroke-width') ?? 1) });
  }
  return out;
}

let cached: BrandLogo | null | undefined;

export async function loadBrandLogo(): Promise<BrandLogo | null> {
  if (cached !== undefined) return cached;

  let paths: LogoPath[] = [];
  let viewBox: ViewBox | null = null;
  try {
    const svg = await readFile(LOGO_FILE, 'utf8');
    viewBox = parseViewBox(svg);
    paths = parse(svg);
  } catch {
    paths = [];
  }

  const box = viewBox;
  cached =
    paths.length && box
    ? {
        heightAt: (width) => (width * box.height) / box.width,
        draw(page, { x, y, width }) {
          const scale = width / box.width;
          for (const item of paths) {
            page.drawSvgPath(item.d, {
              x,
              y,
              scale,
              color: item.fill,
              borderColor: item.stroke,
              borderWidth: item.stroke ? item.strokeWidth * scale : undefined,
            });
          }
        },
      }
    : null;
  return cached;
}
