export type CsvCell = string | number | null | undefined;

// A spreadsheet runs a cell that starts with one of these as a formula
// (CSV injection, OWASP). Descriptions come from other people's transfers.
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  // Numbers are ours (amounts), so a minus sign stays a number.
  if (typeof value === "number") return String(value);
  const text = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Rows as CSV (RFC 4180): comma-separated, quoted where needed, CRLF line
 * ends. Text that a spreadsheet would run as a formula gets a leading `'`.
 */
export function toCsv(rows: readonly (readonly CsvCell[])[]): string {
  return rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}

/** Saves text as a file through a temporary link (no server round trip). */
export function downloadText(fileName: string, text: string, type = "text/csv;charset=utf-8") {
  // The byte order mark tells Excel the file is UTF-8 ("•••• 8057", "Café").
  const url = URL.createObjectURL(new Blob(["﻿", text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // After the click has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
