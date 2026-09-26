import { PDFDocument } from 'pdf-lib';
import {
  CROP_MARK_SPACE_MM,
  artboardMm,
  drawCropMarks,
  drawSticker,
  prepareStickerResources,
  type StickerContent,
} from './sticker';
import { PrintTemplateError, type PrintTemplate } from './template';
import { A4_MM, mm } from './units';

const PAGE_MARGIN_MM = 10;

/** How many stickers fit on an A4 page, with room for every sticker's crop marks. */
export function gangGrid(art: { width: number; height: number }) {
  const cellWidth = art.width + 2 * CROP_MARK_SPACE_MM;
  const cellHeight = art.height + 2 * CROP_MARK_SPACE_MM;
  const cols = Math.floor((A4_MM.width - 2 * PAGE_MARGIN_MM) / cellWidth);
  const rows = Math.floor((A4_MM.height - 2 * PAGE_MARGIN_MM) / cellHeight);
  if (cols < 1 || rows < 1) {
    throw new PrintTemplateError(`A ${art.width}×${art.height}mm artboard does not fit on A4 with crop marks.`);
  }
  // Centre the grid on the page.
  const offsetX = (A4_MM.width - cols * cellWidth) / 2 + CROP_MARK_SPACE_MM;
  const offsetY = (A4_MM.height - rows * cellHeight) / 2 + CROP_MARK_SPACE_MM;
  return { cols, rows, cellWidth, cellHeight, offsetX, offsetY, perPage: cols * rows };
}

/** `print-sheet.pdf`: stickers ganged on A4 for cheap local printing. */
export async function renderPrintSheet(template: PrintTemplate, contents: StickerContent[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle('AutoLink — print sheet');
  doc.setCreator('AutoLink');
  doc.setProducer('AutoLink');
  const res = await prepareStickerResources(doc, template);
  const grid = gangGrid(artboardMm(template.layout));

  contents.forEach((content, index) => {
    const slot = index % grid.perPage;
    if (slot === 0) doc.addPage([mm(A4_MM.width), mm(A4_MM.height)]);
    const page = doc.getPage(doc.getPageCount() - 1);
    const col = slot % grid.cols;
    const row = Math.floor(slot / grid.cols);
    // Fill top to bottom: PDF y grows upwards.
    const origin = {
      x: mm(grid.offsetX + col * grid.cellWidth),
      y: mm(A4_MM.height - grid.offsetY - (row + 1) * grid.cellHeight + 2 * CROP_MARK_SPACE_MM),
    };
    drawSticker(page, res, content, origin);
    drawCropMarks(page, template.layout, origin);
  });

  return doc.save();
}
