/**
 * Money is handled in integer cents (ADR-0007): 0.1 + 0.2 is 0.30000000000000004
 * in floating point, but 10 + 20 cents is exactly 30. The API sends and expects
 * amounts as numbers with two decimals; convert at the edges with `toCents` and
 * `fromCents`, and do every sum, comparison and balance check in cents.
 */

declare const centsBrand: unique symbol;

/** An amount in cents. Branded so a plain number (e.g. an API amount in ETB) can't be passed by mistake. */
export type Cents = number & { readonly [centsBrand]: true };

export const CURRENCY = "ETB";

/** Cents from an API amount such as 8640 or 1665.5. Rounds away float noise (0.29 * 100 = 28.999…). */
export function toCents(amount: number): Cents {
  return Math.round(amount * 100) as Cents;
}

/** The API's amount (a number with two decimals) for a request body. */
export function fromCents(cents: Cents): number {
  return cents / 100;
}

export const ZERO = 0 as Cents;

export function addCents(...amounts: Cents[]): Cents {
  return amounts.reduce((sum, amount) => sum + amount, 0) as Cents;
}

export function subtractCents(from: Cents, amount: Cents): Cents {
  return (from - amount) as Cents;
}

/**
 * Parses what a user typed into an amount field: "250", "250.5", "1,250.00",
 * ".5". Returns null for empty or invalid input, or more than two decimals.
 * Works on the digits, never on floats, so "0.29" is exactly 29 cents.
 */
export function parseAmountInput(input: string): Cents | null {
  const cleaned = input.replace(/[\s,]/g, "");
  const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!match || cleaned === "" || cleaned === ".") return null;
  const [, whole = "", fraction = ""] = match;
  return (Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0"))) as Cents;
}

const grouped = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "8,640.00", for an amount field after it loses focus (no currency, no sign). */
export function formatAmountInput(cents: Cents): string {
  return grouped.format(Math.abs(cents) / 100);
}

export interface FormatMoneyOptions {
  /**
   * Prefix a sign, as transaction rows do (UI spec: "+ETB 1,665.00", "−ETB 15.00").
   * "credit" / "debit" force the sign from the direction; true uses the value's sign.
   */
  sign?: boolean | "credit" | "debit";
}

/**
 * "ETB 2,200.00" (UI spec, Numbers: always two decimals, thousands separators).
 * Signed amounts use a true minus sign (U+2212), which screen readers read as "minus".
 */
export function formatMoney(cents: Cents, { sign = false }: FormatMoneyOptions = {}): string {
  const body = `${CURRENCY} ${grouped.format(Math.abs(cents) / 100)}`;
  if (sign === false) return cents < 0 ? `−${body}` : body;

  const negative = sign === "debit" || (sign === true && cents < 0);
  return `${negative ? "−" : "+"}${body}`;
}
