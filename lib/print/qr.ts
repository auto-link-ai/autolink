import QRCode from 'qrcode';

/**
 * QR rules (spec §2.11): error correction ≥ M, quiet zone ≥ 4 modules, pure
 * black on pure white. We use Q — for a tag URL it produces the same symbol
 * size as M (measured) while tolerating more dirt, glare and wear.
 */
export const QR_ERROR_CORRECTION = 'Q' as const;
export const QR_QUIET_ZONE_MODULES = 4;
export const QR_PNG_WIDTH_PX = 1024;

const COLORS = { dark: '#000000', light: '#ffffff' } as const;

export interface QrMatrix {
  version: number;
  /** Modules per side, excluding the quiet zone. */
  size: number;
  isDark(row: number, col: number): boolean;
}

export function qrMatrix(text: string): QrMatrix {
  const qr = QRCode.create(text, { errorCorrectionLevel: QR_ERROR_CORRECTION });
  return {
    version: qr.version,
    size: qr.modules.size,
    isDark: (row, col) => qr.modules.get(row, col) === 1,
  };
}

export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: QR_ERROR_CORRECTION,
    margin: QR_QUIET_ZONE_MODULES,
    color: COLORS,
  });
}

export function qrPng(text: string): Promise<Buffer> {
  return QRCode.toBuffer(text, {
    type: 'png',
    errorCorrectionLevel: QR_ERROR_CORRECTION,
    margin: QR_QUIET_ZONE_MODULES,
    width: QR_PNG_WIDTH_PX,
    color: COLORS,
  });
}
