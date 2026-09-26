import {
  PDFDocument,
  StandardFonts,
  cmyk,
  rgb,
  type PDFEmbeddedPage,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import { drawBuiltInDesign, type Rect } from './builtInDesign';
import { loadBrandMark, loadBrandWordmark, type BrandLogo } from './logo';
import { QR_QUIET_ZONE_MODULES, qrMatrix } from './qr';
import { PrintTemplateError, assertModuleSize, type PrintTemplate, type StickerLayout } from './template';
import { mm } from './units';

/** Crop marks sit OUTSIDE the bleed: an offset gap, then the mark itself. */
export const CROP_MARK = { offsetMm: 2, lengthMm: 5, weightPt: 0.25 } as const;
/** Space needed around an artboard for its crop marks. */
export const CROP_MARK_SPACE_MM = CROP_MARK.offsetMm + CROP_MARK.lengthMm;

// 100% K for the code and marks: no registration blur between inks.
const K100 = cmyk(0, 0, 0, 1);
const PAPER = cmyk(0, 0, 0, 0);

export interface StickerContent {
  publicTagId: string;
  url: string;
}

export interface StickerResources {
  layout: StickerLayout;
  artwork: PDFEmbeddedPage | null;
  bold: PDFFont;
  /** Null when a logo file is unreadable; the built-in design then uses type. */
  mark: BrandLogo | null;
  wordmark: BrandLogo | null;
}

export interface Point {
  x: number;
  y: number;
}

/** Trim plus bleed on every side, in mm. */
export function artboardMm(layout: StickerLayout): { width: number; height: number } {
  return { width: layout.trimWidthMm + 2 * layout.bleedMm, height: layout.trimHeightMm + 2 * layout.bleedMm };
}

/** Embeds fonts and the designer artwork (once per document). */
export async function prepareStickerResources(
  doc: PDFDocument,
  template: PrintTemplate,
): Promise<StickerResources> {
  const { layout } = template;
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let artwork: PDFEmbeddedPage | null = null;

  if (template.artworkPdf) {
    let page: PDFEmbeddedPage | undefined;
    try {
      [page] = await doc.embedPdf(template.artworkPdf, [0]);
      // pdf-lib embeds lazily at save(); do it now so a bad file fails here, clearly.
      await page?.embed();
    } catch (error) {
      throw new PrintTemplateError(`Artwork PDF could not be read (${(error as Error).message}).`);
    }
    const expected = artboardMm(layout);
    const tolerance = mm(0.5);
    if (
      !page ||
      Math.abs(page.width - mm(expected.width)) > tolerance ||
      Math.abs(page.height - mm(expected.height)) > tolerance
    ) {
      const got = page ? `${(page.width / mm(1)).toFixed(1)}×${(page.height / mm(1)).toFixed(1)}mm` : 'no page';
      throw new PrintTemplateError(
        `Artwork must be ${expected.width}×${expected.height}mm (${layout.trimWidthMm}×${layout.trimHeightMm}mm + ${layout.bleedMm}mm bleed each side); got ${got}.`,
      );
    }
    artwork = page;
  }
  const [mark, wordmark] = await Promise.all([loadBrandMark(), loadBrandWordmark()]);
  return { layout, artwork, bold, mark, wordmark };
}

function trimBox(layout: StickerLayout, origin: Point) {
  const left = origin.x + mm(layout.bleedMm);
  const bottom = origin.y + mm(layout.bleedMm);
  const width = mm(layout.trimWidthMm);
  const height = mm(layout.trimHeightMm);
  return { left, bottom, width, height, right: left + width, top: bottom + height };
}

function artboardRect(layout: StickerLayout, origin: Point): Rect {
  const art = artboardMm(layout);
  return { left: origin.x, bottom: origin.y, width: mm(art.width), height: mm(art.height) };
}

function drawQr(page: PDFPage, res: StickerResources, content: StickerContent, origin: Point): void {
  const { layout } = res;
  const matrix = qrMatrix(content.url);
  const quiet = QR_QUIET_ZONE_MODULES;
  const moduleSize = mm(assertModuleSize(layout, matrix.size, quiet));

  const trim = trimBox(layout, origin);
  const left = trim.left + mm(layout.qr.xMm);
  const top = trim.top - mm(layout.qr.yMm);
  const box = mm(layout.qr.sizeMm);

  // Own white square, so the quiet zone survives any artwork underneath.
  page.drawRectangle({ x: left, y: top - box, width: box, height: box, color: PAPER });

  // Horizontal runs of dark modules → one rectangle each (fewer ops, no seams within a run).
  for (let row = 0; row < matrix.size; row++) {
    let col = 0;
    while (col < matrix.size) {
      if (!matrix.isDark(row, col)) {
        col++;
        continue;
      }
      const start = col;
      while (col < matrix.size && matrix.isDark(row, col)) col++;
      page.drawRectangle({
        x: left + (quiet + start) * moduleSize,
        y: top - (quiet + row + 1) * moduleSize,
        width: (col - start) * moduleSize,
        height: moduleSize,
        color: K100,
      });
    }
  }
}

function hexToRgb(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function drawTagId(page: PDFPage, res: StickerResources, content: StickerContent, origin: Point): void {
  const spec = res.layout.tagId;
  if (!spec) return;
  const trim = trimBox(res.layout, origin);
  const width = res.bold.widthOfTextAtSize(content.publicTagId, spec.fontSizePt);
  const anchor = trim.left + mm(spec.xMm);
  const x = spec.align === 'center' ? anchor - width / 2 : spec.align === 'right' ? anchor - width : anchor;
  page.drawText(content.publicTagId, {
    x,
    y: trim.top - mm(spec.yMm),
    size: spec.fontSizePt,
    font: res.bold,
    color: spec.color === '#000000' ? K100 : hexToRgb(spec.color),
  });
}

/** Draws one sticker with its artboard's bottom-left corner at `origin` (points). */
export function drawSticker(page: PDFPage, res: StickerResources, content: StickerContent, origin: Point): void {
  if (res.artwork) {
    const art = artboardRect(res.layout, origin);
    page.drawPage(res.artwork, { x: art.left, y: art.bottom, width: art.width, height: art.height });
  } else {
    drawBuiltInDesign(page, res, artboardRect(res.layout, origin), trimBox(res.layout, origin));
  }
  drawQr(page, res, content, origin);
  drawTagId(page, res, content, origin);
}

export function drawCropMarks(page: PDFPage, layout: StickerLayout, origin: Point): void {
  const trim = trimBox(layout, origin);
  const gap = mm(layout.bleedMm + CROP_MARK.offsetMm);
  const len = mm(CROP_MARK.lengthMm);
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: CROP_MARK.weightPt, color: K100 });

  for (const y of [trim.bottom, trim.top]) {
    line(trim.left - gap - len, y, trim.left - gap, y);
    line(trim.right + gap, y, trim.right + gap + len, y);
  }
  for (const x of [trim.left, trim.right]) {
    line(x, trim.bottom - gap - len, x, trim.bottom - gap);
    line(x, trim.top + gap, x, trim.top + gap + len);
  }
}

/** Single-sticker PDF (`pdf/AUT-….pdf`): artboard, crop marks, TrimBox/BleedBox set. */
export async function renderStickerPdf(template: PrintTemplate, content: StickerContent): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`AutoLink ${content.publicTagId}`);
  doc.setCreator('AutoLink');
  doc.setProducer('AutoLink');
  const res = await prepareStickerResources(doc, template);

  const margin = CROP_MARK_SPACE_MM + 3;
  const art = artboardMm(template.layout);
  const page = doc.addPage([mm(art.width + 2 * margin), mm(art.height + 2 * margin)]);
  const origin = { x: mm(margin), y: mm(margin) };

  drawSticker(page, res, content, origin);
  drawCropMarks(page, template.layout, origin);
  const trim = trimBox(template.layout, origin);
  page.setBleedBox(origin.x, origin.y, mm(art.width), mm(art.height));
  page.setTrimBox(trim.left, trim.bottom, trim.width, trim.height);
  return doc.save();
}
