import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
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

/** The claim QR box on a slip: position from the slip's top-left, in mm. */
const CLAIM_QR = { xMm: 61, yMm: 5, sizeMm: 26 } as const;

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

function drawSlip(page: PDFPage, fonts: Fonts, entry: SlipEntry, activateAt: string, x: number, top: number) {
  const pad = mm(6);
  const text = (value: string, dy: number, size: number, font: PDFFont, color = INK) =>
    page.drawText(value, { x: x + pad, y: top - mm(dy), size, font, color });

  const auto = 'Auto';
  page.drawText(auto, { x: x + pad, y: top - mm(9), size: 12, font: fonts.bold, color: INK });
  page.drawText('Link', {
    x: x + pad + fonts.bold.widthOfTextAtSize(auto, 12),
    y: top - mm(9),
    size: 12,
    font: fonts.bold,
    color: BLUE,
  });
  text("Code d'activation · Activation code", 15, 7.5, fonts.regular, MUTED);
  text(entry.activationCode, 23.5, 17, fonts.mono);
  text(`Étiquette · Tag   ${entry.publicTagId}`, 30, 8.5, fonts.bold);
  text(`Activez sur · Activate at   ${activateAt}`, 35.5, 8, fonts.regular);
  text('Gardez ce papier. Ne le collez pas sur la voiture.', 39.5, 6.5, fonts.regular, MUTED);
  text('Keep this slip. Do not stick it on the car.', 42.5, 6.5, fonts.regular, MUTED);

  // The claim QR: scanning it opens the activation page with both values filled in.
  drawClaimQr(page, entry.claimUrl, x + mm(CLAIM_QR.xMm), top - mm(CLAIM_QR.yMm), mm(CLAIM_QR.sizeMm));
  const caption = (value: string, dy: number) =>
    page.drawText(value, { x: x + mm(CLAIM_QR.xMm), y: top - mm(dy), size: 6, font: fonts.regular, color: MUTED });
  caption('Scannez pour activer', CLAIM_QR.yMm + CLAIM_QR.sizeMm + 2.5);
  caption('Scan to activate', CLAIM_QR.yMm + CLAIM_QR.sizeMm + 5.5);
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
    drawSlip(page, fonts, entry, activateAt, left + col * slipW, top - row * slipH);
  }

  return doc.save();
}
