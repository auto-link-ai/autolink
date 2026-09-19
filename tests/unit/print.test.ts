import path from 'node:path';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { renderActivationSlips, SLIPS_PER_PAGE } from '@/lib/print/activationSlips';
import { buildBatchZip } from '@/lib/print/batchZip';
import { toTagsCsv } from '@/lib/print/csv';
import { gangGrid, renderPrintSheet } from '@/lib/print/printSheet';
import { QR_QUIET_ZONE_MODULES, qrMatrix } from '@/lib/print/qr';
import { CROP_MARK_SPACE_MM, renderStickerPdf } from '@/lib/print/sticker';
import {
  assertModuleSize,
  loadPrintTemplate,
  PrintTemplateError,
  stickerLayoutSchema,
  validateLayout,
  type PrintTemplate,
  type StickerLayout,
} from '@/lib/print/template';
import { mm } from '@/lib/print/units';

const URL_ = 'https://autolink.dz/t/AUT-7K3M9QXZ';
const entry = (n: number) => ({
  publicTagId: `AUT-7K3M9QX${n}`,
  activationCode: `ABCD-EFGH-J${n}`,
  url: `https://autolink.dz/t/AUT-7K3M9QX${n}`,
});

async function repoTemplate(): Promise<PrintTemplate> {
  return loadPrintTemplate(path.join(process.cwd(), 'print', 'sticker'));
}

describe('QR', () => {
  it('uses error correction Q and a small version for a tag URL', () => {
    const m = qrMatrix(URL_);
    expect(m.version).toBeLessThanOrEqual(4);
    expect(m.size).toBe(17 + 4 * m.version);
  });
});

describe('template', () => {
  it('the repo template is valid: 100mm trim, 3mm bleed, QR modules ≥ 1.2mm', async () => {
    const { layout, artworkPdf } = await repoTemplate();
    expect(layout.trimMm).toBe(100);
    expect(layout.bleedMm).toBe(3);
    expect(artworkPdf).toBeNull();
    expect(assertModuleSize(layout, qrMatrix(URL_).size, QR_QUIET_ZONE_MODULES)).toBeGreaterThanOrEqual(1.2);
  });

  it('rejects a QR box outside the safe zone', async () => {
    const { layout } = await repoTemplate();
    const bad: StickerLayout = { ...layout, qr: { xMm: 1, yMm: 18, sizeMm: 64 } };
    expect(validateLayout(bad)).not.toEqual([]);
  });

  it('rejects modules that are too small to scan', async () => {
    const { layout } = await repoTemplate();
    expect(() => assertModuleSize({ ...layout, qr: { ...layout.qr, sizeMm: 30 } }, 29, 4)).toThrow(PrintTemplateError);
  });

  it('rejects artwork paths that could escape the folder', () => {
    const parsed = stickerLayoutSchema.safeParse({
      trimMm: 100,
      bleedMm: 3,
      safeMm: 4,
      qr: { xMm: 18, yMm: 18, sizeMm: 64 },
      tagId: null,
      artwork: '../secrets.pdf',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects artwork of the wrong size', async () => {
    const template = await repoTemplate();
    const wrong = await PDFDocument.create();
    wrong.addPage([mm(100), mm(100)]); // missing bleed
    const artworkPdf = await wrong.save();
    await expect(renderStickerPdf({ ...template, artworkPdf }, entry(1))).rejects.toThrow(PrintTemplateError);
  });

  it('accepts correctly sized artwork', async () => {
    const template = await repoTemplate();
    const art = await PDFDocument.create();
    art.addPage([mm(106), mm(106)]).drawRectangle({ x: 0, y: 0, width: 10, height: 10 });
    const pdf = await renderStickerPdf({ ...template, artworkPdf: await art.save() }, entry(1));
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(1);
  });

  it('turns unreadable artwork into a template error, not a crash', async () => {
    const template = await repoTemplate();
    const blank = await PDFDocument.create();
    blank.addPage([mm(106), mm(106)]); // no content stream
    await expect(renderStickerPdf({ ...template, artworkPdf: await blank.save() }, entry(1))).rejects.toThrow(
      PrintTemplateError,
    );
    await expect(
      renderStickerPdf({ ...template, artworkPdf: new TextEncoder().encode('not a pdf') }, entry(1)),
    ).rejects.toThrow(PrintTemplateError);
  });
});

describe('PDFs', () => {
  it('sticker page = artboard + crop-mark margin, with TrimBox 100mm', async () => {
    const pdf = await PDFDocument.load(await renderStickerPdf(await repoTemplate(), entry(1)));
    const page = pdf.getPage(0);
    const expected = mm(106 + 2 * (CROP_MARK_SPACE_MM + 3));
    expect(page.getWidth()).toBeCloseTo(expected, 1);
    expect(page.getTrimBox().width).toBeCloseTo(mm(100), 1);
    expect(page.getBleedBox().width).toBeCloseTo(mm(106), 1);
  });

  it('gang sheet fits 2 × 100mm stickers per A4 page', async () => {
    expect(gangGrid(106).perPage).toBe(2);
    expect(gangGrid(56).perPage).toBe(6); // a 50mm sticker: 2 × 3
    const pdf = await PDFDocument.load(await renderPrintSheet(await repoTemplate(), [1, 2, 3].map(entry)));
    expect(pdf.getPageCount()).toBe(2);
  });

  it('activation slips paginate at 12 per page', async () => {
    const entries = Array.from({ length: SLIPS_PER_PAGE + 1 }, (_, i) => entry(i % 10));
    const pdf = await PDFDocument.load(await renderActivationSlips(entries, 'autolink.dz/activate'));
    expect(pdf.getPageCount()).toBe(2);
  });
});

describe('CSV and ZIP', () => {
  it('CSV has the spec header and CRLF rows', () => {
    expect(toTagsCsv([entry(1)])).toBe(
      'tag_id,activation_code,qr_url\r\nAUT-7K3M9QX1,ABCD-EFGH-J1,https://autolink.dz/t/AUT-7K3M9QX1\r\n',
    );
  });

  it('ZIP contains every required file', async () => {
    const entries = [entry(1), entry(2)];
    const bytes = await buildBatchZip(await repoTemplate(), entries, {
      label: 'Test',
      batchPublicId: 'B-TEST0000',
      activateAt: 'autolink.dz/activate',
      generatedAt: new Date(0),
    });
    const zip = await JSZip.loadAsync(bytes);
    const names = Object.keys(zip.files).filter((n) => !zip.files[n]!.dir).sort();
    expect(names).toEqual(
      [
        'README.txt',
        'pdf/AUT-7K3M9QX1.pdf',
        'pdf/AUT-7K3M9QX2.pdf',
        'pdf/activation-slips.pdf',
        'print-sheet.pdf',
        'qr/AUT-7K3M9QX1.png',
        'qr/AUT-7K3M9QX1.svg',
        'qr/AUT-7K3M9QX2.png',
        'qr/AUT-7K3M9QX2.svg',
        'tags.csv',
      ].sort(),
    );
    const svg = await zip.file('qr/AUT-7K3M9QX1.svg')!.async('string');
    expect(svg).toContain('<svg');
    // QR content is the public URL only: the activation code must not be in the QR files.
    expect(svg).not.toContain('ABCD');
  });
});
