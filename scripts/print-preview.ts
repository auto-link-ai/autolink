/**
 * pnpm print:preview — renders sample print files from print/sticker/ with
 * dummy IDs and codes into print/preview/ (gitignored). No database needed.
 * Use it to check designer artwork alignment before generating real batches.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { renderActivationSlips } from '@/lib/print/activationSlips';
import { renderPrintSheet } from '@/lib/print/printSheet';
import { renderStickerPdf } from '@/lib/print/sticker';
import { loadPrintTemplate } from '@/lib/print/template';
import { defaultLocale } from '@/i18n/locales';
import { claimUrl, resolveQrBaseUrl, tagUrl } from '@/lib/tags/tagUrl';

const SAMPLES = [
  { publicTagId: 'AUT-SAMP1E00', activationCode: 'ABCD-EFGH-JK' },
  { publicTagId: 'AUT-SAMP1E01', activationCode: 'MNPQ-RSTV-WX' },
  { publicTagId: 'AUT-SAMP1E02', activationCode: 'YZ01-2345-67' },
];

async function main() {
  const resolved = resolveQrBaseUrl(process.env.NEXT_PUBLIC_APP_URL, false);
  const baseUrl = resolved.ok ? resolved.baseUrl : 'https://autolink.dz';
  const template = await loadPrintTemplate();
  const entries = SAMPLES.map((s) => ({
    ...s,
    url: tagUrl(baseUrl, s.publicTagId),
    claimUrl: claimUrl(baseUrl, defaultLocale, s.publicTagId, s.activationCode),
  }));
  const out = path.join(process.cwd(), 'print', 'preview');
  await mkdir(out, { recursive: true });

  const [first] = entries;
  if (!first) return;
  await writeFile(path.join(out, 'sticker.pdf'), await renderStickerPdf(template, first));
  await writeFile(path.join(out, 'print-sheet.pdf'), await renderPrintSheet(template, entries));
  await writeFile(
    path.join(out, 'activation-slips.pdf'),
    await renderActivationSlips(entries, `${new URL(baseUrl).host}/activate`),
  );

  console.log(`✓ preview written to print/preview/ (QR base: ${baseUrl}, artwork: ${template.layout.artwork ?? 'built-in'})`);
}

main().catch((error: unknown) => {
  console.error('✗ preview failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
