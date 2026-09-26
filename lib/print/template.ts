import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

/**
 * Sticker layout. Positions are in millimetres from the TOP-LEFT corner of the
 * trim box (the finished sticker edge), which is how a designer measures.
 * The artboard is trim + bleed on every side.
 *
 * Lives in print/sticker/template.json. `artwork` optionally names a PDF in the
 * same folder whose first page is the designed background (size must equal the
 * artboard). The QR and tag ID are always drawn on top by code.
 */
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const stickerLayoutSchema = z.object({
  /** The finished sticker: width × height, in mm. */
  trimWidthMm: z.number().positive().max(300),
  trimHeightMm: z.number().positive().max(300),
  bleedMm: z.number().min(0).max(10),
  safeMm: z.number().min(0).max(20),
  qr: z.object({
    xMm: z.number().min(0),
    yMm: z.number().min(0),
    /** Side of the QR box INCLUDING its 4-module white quiet zone. */
    sizeMm: z.number().positive(),
  }),
  tagId: z
    .object({
      xMm: z.number().min(0),
      /** Text baseline. */
      yMm: z.number().min(0),
      fontSizePt: z.number().min(5).max(40),
      align: z.enum(['left', 'center', 'right']),
      color: hexColor.default('#000000'),
    })
    .nullable(),
  artwork: z
    .string()
    .regex(/^[\w.-]+\.pdf$/, 'artwork must be a PDF file name in print/sticker/')
    .nullable(),
});

export type StickerLayout = z.infer<typeof stickerLayoutSchema>;

/** Below this, phones struggle to read the code through a windshield. */
export const MIN_QR_MODULE_MM = 1.2;

export class PrintTemplateError extends Error {}

/** Geometry checks that don't depend on the QR content. */
export function validateLayout(layout: StickerLayout): string[] {
  const errors: string[] = [];
  const { trimWidthMm, trimHeightMm, safeMm, qr, tagId } = layout;
  const maxX = trimWidthMm - safeMm;
  const maxY = trimHeightMm - safeMm;
  if (qr.xMm < safeMm || qr.yMm < safeMm || qr.xMm + qr.sizeMm > maxX || qr.yMm + qr.sizeMm > maxY) {
    errors.push(`QR box must sit inside the ${safeMm}mm safe zone of the ${trimWidthMm}×${trimHeightMm}mm sticker.`);
  }
  if (tagId && (tagId.xMm > trimWidthMm || tagId.yMm > maxY || tagId.yMm < safeMm)) {
    errors.push('Tag ID position is outside the safe zone.');
  }
  return errors;
}

/** Module size for a given QR, in mm. Throws if too small to scan reliably. */
export function assertModuleSize(layout: StickerLayout, qrModules: number, quietZone: number): number {
  const moduleMm = layout.qr.sizeMm / (qrModules + 2 * quietZone);
  if (moduleMm < MIN_QR_MODULE_MM) {
    throw new PrintTemplateError(
      `QR modules would be ${moduleMm.toFixed(2)}mm; minimum is ${MIN_QR_MODULE_MM}mm. Enlarge qr.sizeMm.`,
    );
  }
  return moduleMm;
}

export interface PrintTemplate {
  layout: StickerLayout;
  artworkPdf: Uint8Array | null;
}

export const DEFAULT_TEMPLATE_DIR = path.join(process.cwd(), 'print', 'sticker');

export async function loadPrintTemplate(dir: string = DEFAULT_TEMPLATE_DIR): Promise<PrintTemplate> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(path.join(dir, 'template.json'), 'utf8'));
  } catch (error) {
    throw new PrintTemplateError(`Cannot read print/sticker/template.json: ${(error as Error).message}`);
  }
  const parsed = stickerLayoutSchema.safeParse(raw);
  if (!parsed.success) {
    throw new PrintTemplateError(`Invalid template.json: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
  }
  const errors = validateLayout(parsed.data);
  if (errors.length > 0) throw new PrintTemplateError(errors.join(' '));

  let artworkPdf: Uint8Array | null = null;
  if (parsed.data.artwork) {
    try {
      artworkPdf = new Uint8Array(await readFile(path.join(dir, parsed.data.artwork)));
    } catch {
      throw new PrintTemplateError(`Artwork file print/sticker/${parsed.data.artwork} not found.`);
    }
  }
  return { layout: parsed.data, artworkPdf };
}
