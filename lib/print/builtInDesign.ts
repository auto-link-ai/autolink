import { cmyk, rgb, type Color, type PDFFont, type PDFPage } from 'pdf-lib';
import type { BrandLogo } from './logo';
import { mm } from './units';

/**
 * The sticker as designed: a thick orange rounded border, the mark stacked
 * above "AutoLink", the QR code in the middle (drawn by sticker.ts where
 * template.json puts it), and the call to action underneath. Used until a
 * designer's artwork PDF is supplied.
 *
 * Measured in mm on the 80 mm-wide original and scaled to the template's
 * width, so the proportions hold if the size ever changes.
 */
const REFERENCE_WIDTH_MM = 80;

export const DESIGN = {
  borderMm: 2.4,
  /** Outer corners: the printer cuts along this. */
  cornerRadiusMm: 9.5,
  mark: { widthMm: 18, topMm: 6 },
  wordmark: { widthMm: 36, topMm: 25.5 },
  text: { lines: ['Scannez pour', 'contacter le', 'propriétaire'], sizePt: 13.5, firstBaselineMm: 95, lineMm: 6 },
} as const;

/** The logo's own orange (public/brand/*.svg): border and logo print as one colour. */
const ORANGE = rgb(0xf8 / 255, 0x5e / 255, 0x13 / 255);
const PAPER = cmyk(0, 0, 0, 0);
const K100 = cmyk(0, 0, 0, 1);

export interface BuiltInArt {
  mark: BrandLogo | null;
  wordmark: BrandLogo | null;
  bold: PDFFont;
}

/** A rectangle in points, PDF-style: bottom-left corner, y upwards. */
export interface Rect {
  left: number;
  bottom: number;
  width: number;
  height: number;
}

function scaleOf(trim: Rect): number {
  return trim.width / mm(REFERENCE_WIDTH_MM);
}

/** The corner radius to cut, for the batch README. */
export function cornerRadiusMm(trimWidthMm: number): number {
  return Math.round(((DESIGN.cornerRadiusMm * trimWidthMm) / REFERENCE_WIDTH_MM) * 10) / 10;
}

function grow(rect: Rect, by: number): Rect {
  return { left: rect.left - by, bottom: rect.bottom - by, width: rect.width + 2 * by, height: rect.height + 2 * by };
}

/** A rounded rectangle as an SVG path from its top-left corner; quarter circles as cubic curves. */
function roundedRectPath(width: number, height: number, r: number): string {
  const k = 0.5523 * r;
  return [
    `M ${r} 0 H ${width - r}`,
    `C ${width - r + k} 0 ${width} ${r - k} ${width} ${r} V ${height - r}`,
    `C ${width} ${height - r + k} ${width - r + k} ${height} ${width - r} ${height} H ${r}`,
    `C ${r - k} ${height} 0 ${height - r + k} 0 ${height - r} V ${r}`,
    `C 0 ${r - k} ${r - k} 0 ${r} 0 Z`,
  ].join(' ');
}

function fillRounded(page: PDFPage, rect: Rect, radius: number, color: Color): void {
  page.drawSvgPath(roundedRectPath(rect.width, rect.height, radius), {
    x: rect.left,
    y: rect.bottom + rect.height,
    color,
  });
}

/** Without the logo files, the name in type, where the wordmark would be. */
function drawNameInType(page: PDFPage, art: BuiltInArt, centre: number, baseline: number, size: number): void {
  const width = art.bold.widthOfTextAtSize('AutoLink', size);
  const x = centre - width / 2;
  page.drawText('Auto', { x, y: baseline, size, font: art.bold, color: K100 });
  page.drawText('Link', { x: x + art.bold.widthOfTextAtSize('Auto', size), y: baseline, size, font: art.bold, color: ORANGE });
}

export function drawBuiltInDesign(page: PDFPage, art: BuiltInArt, artboard: Rect, trim: Rect): void {
  const k = scaleOf(trim);
  const at = (valueMm: number) => mm(valueMm) * k;
  const bleed = trim.left - artboard.left;
  const radius = at(DESIGN.cornerRadiusMm);
  const border = at(DESIGN.borderMm);

  // Paper, then the orange: the trim's rounded shape grown into the bleed, so a
  // cut anywhere near the line still lands on orange.
  page.drawRectangle({ x: artboard.left, y: artboard.bottom, width: artboard.width, height: artboard.height, color: PAPER });
  fillRounded(page, grow(trim, bleed), radius + bleed, ORANGE);
  // The white card inside the border, its corners following the outer ones.
  fillRounded(page, grow(trim, -border), radius - border, PAPER);

  const top = trim.bottom + trim.height;
  const centre = trim.left + trim.width / 2;
  if (art.mark && art.wordmark) {
    const markWidth = at(DESIGN.mark.widthMm);
    art.mark.draw(page, { x: centre - markWidth / 2, y: top - at(DESIGN.mark.topMm), width: markWidth });
    const nameWidth = at(DESIGN.wordmark.widthMm);
    art.wordmark.draw(page, { x: centre - nameWidth / 2, y: top - at(DESIGN.wordmark.topMm), width: nameWidth });
  } else {
    const size = 20 * k;
    drawNameInType(page, art, centre, top - at(DESIGN.wordmark.topMm) - size * 0.72, size);
  }

  const size = DESIGN.text.sizePt * k;
  DESIGN.text.lines.forEach((line, i) => {
    const width = art.bold.widthOfTextAtSize(line, size);
    page.drawText(line, {
      x: centre - width / 2,
      y: top - at(DESIGN.text.firstBaselineMm + i * DESIGN.text.lineMm),
      size,
      font: art.bold,
      color: K100,
    });
  });
}
