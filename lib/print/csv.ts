export interface CsvTagRow {
  publicTagId: string;
  activationCode: string;
  url: string;
}

function field(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** `tags.csv` — the ONLY place plaintext activation codes exist (RFC 4180, CRLF). */
export function toTagsCsv(rows: CsvTagRow[]): string {
  const lines = ['tag_id,activation_code,qr_url'];
  for (const row of rows) {
    lines.push([row.publicTagId, row.activationCode, row.url].map(field).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
