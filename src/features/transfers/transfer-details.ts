import type { Account, TransferRequest } from "@/shared/api/types";
import { isValidAccountNumber, normalizeAccountNumber } from "@/shared/lib/account-number";
import { type Cents, formatMoney, parseAmountInput, toCents } from "@/shared/lib/money";

/** The API's limits (docs/api/openapi.json, TransferRequest). */
export const MIN_TRANSFER = toCents(0.01);
export const MAX_TRANSFER = toCents(1_000_000_000);
export const NOTE_MAX_LENGTH = 140;

export interface TransferInput {
  fromAccountId: number | undefined;
  /** As typed, e.g. "2899 0108 46". */
  toAccountNumber: string;
  /** As typed, e.g. "9,000.00". */
  amount: string;
  note: string;
}

export type TransferField = "fromAccountId" | "toAccountNumber" | "amount" | "note";
export type TransferErrors = Partial<Record<TransferField, string>>;

/** A transfer that passed every check, ready for review and then the API. */
export interface CheckedTransfer {
  from: Account;
  toAccountNumber: string;
  amountCents: Cents;
  note: string | undefined;
  request: TransferRequest;
}

/** The brief's wording, with the balance so the user knows how much they can send. */
export const insufficientFunds = (available: Cents) =>
  `Insufficient funds. Available: ${formatMoney(available)}.`;

/**
 * The amount's problem, if any. Checked as the user types, so "Insufficient
 * funds" shows before anything is sent.
 */
export function amountError(amount: string, from: Account | undefined): string | undefined {
  if (amount.trim() === "") return undefined;
  const cents = parseAmountInput(amount);
  if (cents === null) return "Enter an amount like 250.00.";
  if (cents < MIN_TRANSFER) return "Enter an amount greater than ETB 0.00.";
  if (cents > MAX_TRANSFER) return `The most you can send at once is ${formatMoney(MAX_TRANSFER)}.`;
  if (from && cents > toCents(from.balance)) return insufficientFunds(toCents(from.balance));
  return undefined;
}

/**
 * Checks the whole form with the API's rules before review (R-UX-08): an own
 * account to send from, a 10-digit recipient that isn't that same account,
 * an amount within the balance and the API's limits, a note of at most 140
 * characters.
 */
export function checkTransfer(
  input: TransferInput,
  accounts: readonly Account[],
): { ok: true; transfer: CheckedTransfer } | { ok: false; errors: TransferErrors } {
  const errors: TransferErrors = {};
  const from = accounts.find((account) => account.id === input.fromAccountId);
  const to = normalizeAccountNumber(input.toAccountNumber);
  const note = input.note.trim();

  if (!from) errors.fromAccountId = "Choose the account to send from.";

  if (to === "") errors.toAccountNumber = "Enter the recipient's account number.";
  else if (!isValidAccountNumber(to)) {
    errors.toAccountNumber = "Kifiya Bank account numbers have 10 digits.";
  } else if (from && to === from.accountNumber) {
    errors.toAccountNumber = "Cannot transfer to the same account.";
  }

  const amountProblem =
    input.amount.trim() === "" ? "Enter an amount." : amountError(input.amount, from);
  if (amountProblem) errors.amount = amountProblem;

  if (note.length > NOTE_MAX_LENGTH)
    errors.note = `Keep the note to ${NOTE_MAX_LENGTH} characters.`;

  const amountCents = parseAmountInput(input.amount);
  if (Object.keys(errors).length > 0 || !from || amountCents === null) return { ok: false, errors };

  const request: TransferRequest = {
    fromAccountNumber: from.accountNumber,
    toAccountNumber: to,
    amount: amountCents / 100,
    ...(note ? { note } : {}),
  };
  return {
    ok: true,
    transfer: { from, toAccountNumber: to, amountCents, note: note || undefined, request },
  };
}
