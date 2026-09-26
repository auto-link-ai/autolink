import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { rgb, type PDFPage, type RGB } from 'pdf-lib';
import { BRAND_ASSETS, type BrandVariant } from '@/lib/brand';

/**
 * The brand artwork, drawn into a PDF from the same SVGs the site uses
 * (`public/brand/`), so print and screen never drift apart. Only the paths are
 * read: the artwork's drop shadows are a screen effect and have no business on
 * a printing plate.
 *
 * Three pieces: the lockup (mark + "AutoLink" side by side), the mark alone,
 * and the wordmark alone — the letters of the lockup, cropped to their bounds —
 * so the sticker can stack the mark above the name.
 *
 * Loading can fail (a trimmed deployment, a missing file). It then returns
 * null and the caller falls back to type — a batch must never fail over a logo.
 */
interface Box {
  x: number;
  y: number;
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
  /** What the artwork costs in height when drawn this wide (points). */
  heightAt(width: number): number;
  /** Draws it with its top-left corner at (x, y). */
  draw(page: PDFPage, box: { x: number; y: number; width: number }): void;
}

function fileOf(variant: BrandVariant): string {
  return path.join(process.cwd(), 'public', ...BRAND_ASSETS[variant].src.split('/').filter(Boolean));
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
function parseViewBox(svg: string): Box | null {
  const raw = /viewBox="([^"]+)"/.exec(svg)?.[1]?.trim().split(/[\s,]+/).map(Number);
  if (!raw || raw.length !== 4) return null;
  const [x = 0, y = 0, width, height] = raw;
  return width && height && width > 0 && height > 0 ? { x, y, width, height } : null;
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

/**
 * The points a path passes through or bends toward — a box that holds the
 * shape, a hair generous on curves. Absolute commands only (what these files
 * use); anything relative returns null rather than a wrong box.
 */
export function pathBounds(d: string): Box | null {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const xs: number[] = [];
  const ys: number[] = [];
  let command = '';
  let args: number[] = [];
  const arity: Record<string, number> = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 };
  const point = (x: number | undefined, y: number | undefined) => {
    if (x !== undefined && y !== undefined) {
      xs.push(x);
      ys.push(y);
    }
  };
  const flush = () => {
    if (command === 'H') xs.push(...args);
    else if (command === 'V') ys.push(...args);
    // An arc's endpoint is its 6th and 7th number.
    else if (command === 'A') for (let i = 5; i < args.length; i += 7) point(args[i], args[i + 1]);
    else for (let i = 0; i + 1 < args.length; i += 2) point(args[i], args[i + 1]);
    args = [];
  };
  for (const token of tokens) {
    if (/[a-zA-Z]/.test(token)) {
      flush();
      if (!(token in arity)) return null;
      command = token;
    } else {
      args.push(Number(token));
    }
  }
  flush();
  if (xs.length === 0 || ys.length === 0) return null;
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function union(boxes: Box[]): Box {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  const bottom = Math.max(...boxes.map((b) => b.y + b.height));
  return { x, y, width: right - x, height: bottom - y };
}

function artwork(paths: LogoPath[], box: Box): BrandLogo {
  return {
    heightAt: (width) => (width * box.height) / box.width,
    draw(page, { x, y, width }) {
      const scale = width / box.width;
      for (const item of paths) {
        page.drawSvgPath(item.d, {
          // The box's own corner lands on (x, y): SVG y runs downwards.
          x: x - box.x * scale,
          y: y + box.y * scale,
          scale,
          color: item.fill,
          borderColor: item.stroke,
          borderWidth: item.stroke ? item.strokeWidth * scale : undefined,
        });
      }
    },
  };
}

async function readArtwork(variant: BrandVariant): Promise<{ paths: LogoPath[]; viewBox: Box } | null> {
  try {
    const svg = await readFile(fileOf(variant), 'utf8');
    const viewBox = parseViewBox(svg);
    const paths = parse(svg);
    return viewBox && paths.length ? { paths, viewBox } : null;
  } catch {
    return null;
  }
}

const cache = new Map<string, Promise<BrandLogo | null>>();
function once(key: string, load: () => Promise<BrandLogo | null>): Promise<BrandLogo | null> {
  if (!cache.has(key)) cache.set(key, load());
  return cache.get(key)!;
}

/** Mark and name side by side (the activation slips). */
export function loadBrandLogo(): Promise<BrandLogo | null> {
  return once('full', async () => {
    const art = await readArtwork('full');
    return art && artwork(art.paths, art.viewBox);
  });
}

/** The mark alone: the speech bubble and its two dots. */
export function loadBrandMark(): Promise<BrandLogo | null> {
  return once('mark', async () => {
    const art = await readArtwork('mark');
    return art && artwork(art.paths, art.viewBox);
  });
}

/**
 * "AutoLink" alone. The lockup is the mark followed by the letters, so the
 * letters are the paths that start to the right of the mark's own width.
 */
export function loadBrandWordmark(): Promise<BrandLogo | null> {
  return once('wordmark', async () => {
    const art = await readArtwork('full');
    if (!art) return null;
    const letters = art.paths.filter((p) => (pathBounds(p.d)?.x ?? 0) > BRAND_ASSETS.mark.width);
    const boxes = letters.map((p) => pathBounds(p.d));
    if (letters.length === 0 || boxes.some((b) => b === null)) return null;
    return artwork(letters, union(boxes as Box[]));
  });
}
