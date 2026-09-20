import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { loadBrandLogo, type BrandLogo } from './logo';
import { QR_QUIET_ZONE_MODULES, qrMatrix } from './qr';
import { A4_MM, mm } from './units';

/**
 * `pdf/activation-slips.pdf` — the private codes, on a SEPARATE sheet from the
 * stickers (knowing the QR URL alone must never be enough to claim a tag).
 * Each slip carries the code in print and as a claim QR, so the customer can
 * scan the paper instead of typing it.
 * Labels are French + English: the standard PDF fonts can't shape Arabic.
 */
export const SLIP_GRID = { cols: 2, rows: 6, marginMm: 10 } as const;
export const SLIPS_PER_PAGE = SLIP_GRID.cols * SLIP_GRID.rows;

export interface SlipEntry {
  publicTagId: string;
  activationCode: string;
  /** `/{locale}/activate?t=…&c=…` — the claim QR. Never printed on the sticker. */
  claimUrl: string;
}

/** One slip, in mm. Everything below is measured from its top-left corner. */
export const SLIP_MM = {
  width: (A4_MM.width - 2 * SLIP_GRID.marginMm) / SLIP_GRID.cols,
  height: (A4_MM.height - 2 * SLIP_GRID.marginMm) / SLIP_GRID.rows,
  pad: 6,
  /** Where the claim-QR column starts; text on the left must stop before it. */
  qrColumn: 62,
} as const;

const CLAIM_QR = { xMm: SLIP_MM.qrColumn, yMm: 3.5, sizeMm: 27 } as const;
/** The lowest line that still sits beside the QR column. */
const QR_COLUMN_BOTTOM_MM = 38;

const INK = rgb(11 / 255, 18 / 255, 32 / 255);
const BLUE = rgb(37 / 255, 99 / 255, 235 / 255);
const MUTED = rgb(0.36, 0.39, 0.45);
const CUT = rgb(0.7, 0.72, 0.76);
const PAPER = rgb(1, 1, 1);

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  mono: PDFFont;
}

/** The lockup on a slip: width and top margin, in mm. */
const SLIP_LOGO = { widthMm: 24, topMm: 3.5 } as const;

export type SlipFont = 'regular' | 'bold' | 'mono';

export interface SlipLine {
  text: string;
  /** From the slip's top-left, in mm. */
  xMm: number;
  dyMm: number;
  size: number;
  font: SlipFont;
  muted?: boolean;
}

/**
 * Every printed line of one slip. Exported so a test can measure the real font
 * widths and prove no line runs into the claim QR or over the cut line —
 * these strings are French + English, and translations grow.
 */
export function slipLines(entry: SlipEntry, activateAt: string): SlipLine[] {
  const left = SLIP_MM.pad;
  const right = SLIP_MM.qrColumn;
  return [
    { text: "Code d'activation · Activation code", xMm: left, dyMm: 17, size: 7.5, font: 'regular', muted: true },
    { text: entry.activationCode, xMm: left, dyMm: 25.5, size: 17, font: 'mono' },
    { text: `Étiquette · Tag   ${entry.publicTagId}`, xMm: left, dyMm: 31.5, size: 8.5, font: 'bold' },
    { text: 'Activez sur · Activate at', xMm: left, dyMm: 36.5, size: 7, font: 'regular', muted: true },
    { text: activateAt, xMm: left, dyMm: 40.5, size: 9, font: 'bold' },
    {
      text: 'Gardez ce papier · Keep this slip. Ne le collez pas sur la voiture.',
      xMm: left,
      dyMm: 44,
      size: 6,
      font: 'regular',
      muted: true,
    },
    { text: 'Scannez pour activer', xMm: right, dyMm: 34, size: 6, font: 'regular', muted: true },
    { text: 'Scan to activate', xMm: right, dyMm: 37, size: 6, font: 'regular', muted: true },
  ];
}

/** How wide a line may print before it collides with something, in mm. */
export function slipLineBudgetMm(line: SlipLine): number {
  if (line.xMm >= SLIP_MM.qrColumn) return SLIP_MM.width - SLIP_MM.pad - line.xMm;
  // 2mm of air between the two columns.
  if (line.dyMm <= QR_COLUMN_BOTTOM_MM) return SLIP_MM.qrColumn - 2 - line.xMm;
  return SLIP_MM.width - SLIP_MM.pad - line.xMm;
}

/** Dark modules as horizontal runs: fewer draw ops and no seams within a run. */
function drawClaimQr(page: PDFPage, text: string, left: number, top: number, box: number) {
  const matrix = qrMatrix(text);
  const quiet = QR_QUIET_ZONE_MODULES;
  const moduleSize = box / (matrix.size + 2 * quiet);

  page.drawRectangle({ x: left, y: top - box, width: box, height: box, color: PAPER });
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
        color: INK,
      });
    }
  }
}

function drawSlip(
  page: PDFPage,
  fonts: Fonts,
  logo: BrandLogo | null,
  entry: SlipEntry,
  activateAt: string,
  x: number,
  top: number,
) {
  const pad = mm(SLIP_MM.pad);

  if (logo) {
    logo.draw(page, { x: x + pad, y: top - mm(SLIP_LOGO.topMm), width: mm(SLIP_LOGO.widthMm) });
  } else {
    const auto = 'Auto';
    page.drawText(auto, { x: x + pad, y: top - mm(9), size: 12, font: fonts.bold, color: INK });
    page.drawText('Link', {
      x: x + pad + fonts.bold.widthOfTextAtSize(auto, 12),
      y: top - mm(9),
      size: 12,
      font: fonts.bold,
      color: BLUE,
    });
  }

  // The claim QR: scanning it opens the activation page with both values filled in.
  drawClaimQr(page, entry.claimUrl, x + mm(CLAIM_QR.xMm), top - mm(CLAIM_QR.yMm), mm(CLAIM_QR.sizeMm));

  for (const line of slipLines(entry, activateAt)) {
    page.drawText(line.text, {
      x: x + mm(line.xMm),
      y: top - mm(line.dyMm),
      size: line.size,
      font: fonts[line.font],
      color: line.muted ? MUTED : INK,
    });
  }
}

function drawCutLines(page: PDFPage, slipW: number, slipH: number, left: number, top: number) {
  const { cols, rows } = SLIP_GRID;
  const dashed = { thickness: 0.4, color: CUT, dashArray: [3, 3] };
  for (let c = 0; c <= cols; c++) {
    const x = left + c * slipW;
    page.drawLine({ start: { x, y: top }, end: { x, y: top - rows * slipH }, ...dashed });
  }
  for (let r = 0; r <= rows; r++) {
    const y = top - r * slipH;
    page.drawLine({ start: { x: left, y }, end: { x: left + cols * slipW, y }, ...dashed });
  }
}

/** `activateAt` is shown as-is, e.g. "autolink.dz/activate". */
export async function renderActivationSlips(entries: SlipEntry[], activateAt: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle('AutoLink — activation codes (confidential)');
  doc.setCreator('AutoLink');
  doc.setProducer('AutoLink');
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    mono: await doc.embedFont(StandardFonts.CourierBold),
  };

  const logo = await loadBrandLogo();
  const { cols, rows, marginMm } = SLIP_GRID;
  const slipW = mm((A4_MM.width - 2 * marginMm) / cols);
  const slipH = mm((A4_MM.height - 2 * marginMm) / rows);
  const left = mm(marginMm);
  const top = mm(A4_MM.height - marginMm);

  let page: PDFPage | undefined;
  for (const [index, entry] of entries.entries()) {
    const slot = index % SLIPS_PER_PAGE;
    if (slot === 0 || !page) {
      page = doc.addPage([mm(A4_MM.width), mm(A4_MM.height)]);
      drawCutLines(page, slipW, slipH, left, top);
    }
    const col = slot % cols;
    const row = Math.floor(slot / cols);
    drawSlip(page, fonts, logo, entry, activateAt, left + col * slipW, top - row * slipH);
  }

  return doc.save();
}
