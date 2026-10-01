import JSZip from 'jszip';
import { cornerRadiusMm } from './builtInDesign';
import { toTagsCsv } from './csv';
import { renderPrintSheet } from './printSheet';
import { qrPng, qrSvg } from './qr';
import { renderStickerPdf } from './sticker';
import type { PrintTemplate } from './template';

export interface BatchPrintEntry {
  publicTagId: string;
  /** Public QR: `/t/{publicTagId}`. Printed on the sticker — and all a customer needs to link it. */
  url: string;
}

export interface BatchPrintMeta {
  label: string;
  batchPublicId: string;
  generatedAt: Date;
}

function readme(meta: BatchPrintMeta, count: number, template: PrintTemplate): string {
  const { trimWidthMm: w, trimHeightMm: h } = template.layout;
  const size = `${w}×${h}`;
  // The built-in design has rounded corners; a designer's artwork says its own.
  const cut = template.artworkPdf
    ? []
    : [
        `Découpe : ${size} mm, coins arrondis de ${cornerRadiusMm(w)} mm de rayon.`,
        `Cut: ${size} mm, rounded corners, ${cornerRadiusMm(w)} mm radius.`,
        '',
      ];
  return [
    `AutoLink — ${meta.label} (${meta.batchPublicId}) — ${count} tags`,
    `Généré le / Generated: ${meta.generatedAt.toISOString()}`,
    '',
    'qr/                        QR codes publics — SVG (impression / print) et PNG 1024 px',
    `pdf/AUT-*.pdf              Autocollants ${size} mm, fond perdu + traits de coupe / stickers with bleed + crop marks`,
    'print-sheet.pdf            Planche A4 / A4 gang sheet',
    'tags.csv                   tag_id, qr_url',
    '',
    ...cut,
    "Rien d'autre à joindre au colis : le client scanne l'autocollant et se connecte pour l'activer.",
    'Nothing else goes in the parcel: the customer scans the sticker and signs in to activate it.',
    '',
  ].join('\r\n');
}

/** Builds the whole print ZIP in memory. Nothing here touches the database. */
export async function buildBatchZip(
  template: PrintTemplate,
  entries: BatchPrintEntry[],
  meta: BatchPrintMeta,
): Promise<Uint8Array> {
  const zip = new JSZip();

  for (const entry of entries) {
    zip.file(`qr/${entry.publicTagId}.svg`, await qrSvg(entry.url));
    zip.file(`qr/${entry.publicTagId}.png`, await qrPng(entry.url));
    zip.file(`pdf/${entry.publicTagId}.pdf`, await renderStickerPdf(template, entry));
  }
  zip.file('print-sheet.pdf', await renderPrintSheet(template, entries));
  zip.file('tags.csv', toTagsCsv(entries));
  zip.file('README.txt', readme(meta, entries.length, template));

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
