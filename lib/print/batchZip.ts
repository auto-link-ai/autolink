import JSZip from 'jszip';
import { renderActivationSlips } from './activationSlips';
import { toTagsCsv } from './csv';
import { renderPrintSheet } from './printSheet';
import { qrPng, qrSvg } from './qr';
import { renderStickerPdf } from './sticker';
import type { PrintTemplate } from './template';

export interface BatchPrintEntry {
  publicTagId: string;
  activationCode: string;
  url: string;
}

export interface BatchPrintMeta {
  label: string;
  batchPublicId: string;
  /** Shown on the slips, e.g. "autolink.dz/activate". */
  activateAt: string;
  generatedAt: Date;
}

function readme(meta: BatchPrintMeta, count: number, trimMm: number): string {
  return [
    `AutoLink — ${meta.label} (${meta.batchPublicId}) — ${count} tags`,
    `Généré le / Generated: ${meta.generatedAt.toISOString()}`,
    '',
    'qr/                        QR codes — SVG (impression / print) et PNG 1024 px',
    `pdf/AUT-*.pdf              Autocollants ${trimMm}×${trimMm} mm, fond perdu + traits de coupe / stickers with bleed + crop marks`,
    'pdf/activation-slips.pdf   Codes d\'activation — CONFIDENTIEL, à garder séparés / CONFIDENTIAL, keep separate',
    'print-sheet.pdf            Planche A4 / A4 gang sheet',
    'tags.csv                   tag_id, activation_code, qr_url — CONFIDENTIEL / CONFIDENTIAL',
    '',
    "Les codes d'activation n'existent que dans ce téléchargement. Conservez-le en lieu sûr.",
    'Activation codes exist only in this download. Store it somewhere safe.',
    '',
  ].join('\r\n');
}

/**
 * Builds the whole print ZIP in memory. Nothing here touches the database; the
 * caller persists hashes only after this succeeds.
 */
export async function buildBatchZip(
  template: PrintTemplate,
  entries: BatchPrintEntry[],
  meta: BatchPrintMeta,
): Promise<Uint8Array> {
  const zip = new JSZip();
  const stickers = entries.map(({ publicTagId, url }) => ({ publicTagId, url }));

  for (const entry of entries) {
    zip.file(`qr/${entry.publicTagId}.svg`, await qrSvg(entry.url));
    zip.file(`qr/${entry.publicTagId}.png`, await qrPng(entry.url));
    zip.file(`pdf/${entry.publicTagId}.pdf`, await renderStickerPdf(template, entry));
  }
  zip.file('pdf/activation-slips.pdf', await renderActivationSlips(entries, meta.activateAt));
  zip.file('print-sheet.pdf', await renderPrintSheet(template, stickers));
  zip.file('tags.csv', toTagsCsv(entries));
  zip.file('README.txt', readme(meta, entries.length, template.layout.trimMm));

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
