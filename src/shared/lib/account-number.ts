/**
 * Kifiya Bank account numbers are 10 digits (UI spec, Transfer: "Kifiya Bank
 * account numbers have 10 digits"). They are strings: they can start with 0,
 * and a number type would drop it.
 */

export const ACCOUNT_NUMBER_LENGTH = 10;

/** Only the digits, so "2899 0108 46" and "2899010846" are the same number. */
export function normalizeAccountNumber(input: string): string {
  return input.replace(/\D/g, "");
}

export function isValidAccountNumber(input: string): boolean {
  return new RegExp(`^\\d{${ACCOUNT_NUMBER_LENGTH}}$`).test(normalizeAccountNumber(input));
}

/** "8751 1380 57" (groups of 4-4-2, as on the account card and the recipient field). */
export function formatAccountNumber(input: string): string {
  const digits = normalizeAccountNumber(input).slice(0, ACCOUNT_NUMBER_LENGTH);
  return [digits.slice(0, 4), digits.slice(4, 8), digits.slice(8)].filter(Boolean).join(" ");
}

/** "•••• 8057": the last four digits, for rows and pickers. */
export function maskAccountNumber(input: string): string {
  return `•••• ${normalizeAccountNumber(input).slice(-4)}`;
}
