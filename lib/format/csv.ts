/**
 * CSV for spreadsheets (RFC 4180, CRLF). Cells that a spreadsheet would treat
 * as a formula (=, +, -, @, tab, CR) are prefixed with an apostrophe so
 * customer-entered text can never execute when an admin opens the export.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvRow(values: ReadonlyArray<string | number | null | undefined>): string {
  return values.map(csvCell).join(',');
}
