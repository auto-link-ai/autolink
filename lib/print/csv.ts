export interface CsvTagRow {
  publicTagId: string;
  url: string;
}

function field(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** `tags.csv` — each sticker's id and the address its QR opens (RFC 4180, CRLF). */
export function toTagsCsv(rows: CsvTagRow[]): string {
  const lines = ['tag_id,qr_url'];
  for (const row of rows) {
    lines.push([row.publicTagId, row.url].map(field).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
