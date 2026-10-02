import type { Account, BillPaymentRequest } from "@/shared/api/types";
import { type Cents, formatMoney, parseAmountInput, toCents } from "@/shared/lib/money";

/**
 * Billers offered in the list (N-005: the design shows a dropdown, the API
 * takes free text). "Other" lets the user type any name.
 */
export const BILLERS = [
  "Ethio Telecom",
  "Ethiopian Electric Utility",
  "Addis Ababa Water and Sewerage Authority",
  "Safaricom Ethiopia",
  "DStv Ethiopia",
  "Canal+ Ethiopia",
] as const;

export const OTHER_BILLER = "other";

/** The API's lower limit (TXN_001 below it); it sets no upper one. */
export const MIN_BILL = toCents(0.01);
export const BILLER_MAX_LENGTH = 80;

export interface BillInput {
  fromAccountId: number | undefined;
  /** One of BILLERS, OTHER_BILLER, or "" before a choice. */
  biller: string;
  /** The name typed when the biller is "Other". */
  otherBiller: string;
  /** As typed, e.g. "9,000.00". */
  amount: string;
}

export type BillField = "fromAccountId" | "biller" | "otherBiller" | "amount";
export type BillErrors = Partial<Record<BillField, string>>;

/** A bill payment that passed every check, ready for the API. */
export interface CheckedBill {
  from: Account;
  biller: string;
  amountCents: Cents;
  request: BillPaymentRequest;
}

/** The brief's wording, with the balance so the user knows how much they can pay. */
export const insufficientFunds = (available: Cents) =>
  `Insufficient funds. Available: ${formatMoney(available)}.`;

/** The amount's problem, if any; checked as the user types (UI spec: insufficient-funds state). */
export function amountError(amount: string, from: Account | undefined): string | undefined {
  if (amount.trim() === "") return undefined;
  const cents = parseAmountInput(amount);
  if (cents === null) return "Enter an amount like 250.00.";
  if (cents < MIN_BILL) return "Enter an amount greater than ETB 0.00.";
  if (from && cents > toCents(from.balance)) return insufficientFunds(toCents(from.balance));
  return undefined;
}

/** The biller's name as the API gets it, or "" when there is none yet. */
export function billerName(input: Pick<BillInput, "biller" | "otherBiller">): string {
  return input.biller === OTHER_BILLER ? input.otherBiller.trim() : input.biller;
}

/**
 * Checks the whole payment with the API's rules (R-UX-08): an own account,
 * a biller, an amount of at least ETB 0.01 within the balance.
 */
export function checkBill(
  input: BillInput,
  accounts: readonly Account[],
): { ok: true; bill: CheckedBill } | { ok: false; errors: BillErrors } {
  const errors: BillErrors = {};
  const from = accounts.find((account) => account.id === input.fromAccountId);
  const biller = billerName(input);

  if (!from) errors.fromAccountId = "Choose the account to pay from.";
  if (input.biller === "") errors.biller = "Choose who you're paying.";
  else if (input.biller === OTHER_BILLER && biller === "") {
    errors.otherBiller = "Enter the biller's name.";
  } else if (biller.length > BILLER_MAX_LENGTH) {
    errors.otherBiller = `Keep the name to ${BILLER_MAX_LENGTH} characters.`;
  }

  const amountProblem =
    input.amount.trim() === "" ? "Enter an amount." : amountError(input.amount, from);
  if (amountProblem) errors.amount = amountProblem;

  const amountCents = parseAmountInput(input.amount);
  if (Object.keys(errors).length > 0 || !from || amountCents === null) return { ok: false, errors };

  return {
    ok: true,
    bill: {
      from,
      biller,
      amountCents,
      request: { accountNumber: from.accountNumber, biller, amount: amountCents / 100 },
    },
  };
}
