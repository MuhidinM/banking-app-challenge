import {
  ArrowDownToLine,
  ArrowLeftRight,
  Banknote,
  Landmark,
  type LucideIcon,
  Percent,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";

import type { Transaction, TransactionType } from "@/shared/api/types";
import { formatAccountNumber } from "@/shared/lib/account-number";
import {
  type DateOptions,
  type DayGroup,
  formatDateTime,
  formatFullDateTime,
  formatTime,
  groupByDay,
  parseApiDate,
} from "@/shared/lib/dates";
import { formatMoney, toCents } from "@/shared/lib/money";

/** Every transaction type's name in rows ("Refund · 15:18") and its icon (design notes, Icons). */
export const transactionTypeInfo: Record<TransactionType, { label: string; icon: LucideIcon }> = {
  FUND_TRANSFER: { label: "Transfer", icon: ArrowLeftRight },
  TELLER_TRANSFER: { label: "Teller transfer", icon: ArrowLeftRight },
  ATM_WITHDRAWAL: { label: "ATM withdrawal", icon: Banknote },
  TELLER_DEPOSIT: { label: "Teller deposit", icon: ArrowDownToLine },
  BILL_PAYMENT: { label: "Bill payment", icon: ReceiptText },
  ACCESS_FEE: { label: "Access fee", icon: Percent },
  PURCHASE: { label: "Purchase", icon: ShoppingBag },
  REFUND: { label: "Refund", icon: RotateCcw },
  INTEREST_EARNED: { label: "Interest earned", icon: TrendingUp },
  LOAN_PAYMENT: { label: "Loan payment", icon: Landmark },
};

export const isCredit = (transaction: Transaction) => transaction.direction === "CREDIT";

/** "Money in" / "Money out": the direction in words, so it never rests on colour alone. */
export const directionLabel = (transaction: Transaction) =>
  isCredit(transaction) ? "Money in" : "Money out";

/**
 * The row's title: the API's description, or one made from the type and the
 * other account when there is none (api-notes.md, note 10), e.g.
 * "Transfer from 9402 1799 20".
 */
export function transactionTitle(transaction: Transaction): string {
  const description = transaction.description?.trim();
  if (description) return description;

  const { label } = transactionTypeInfo[transaction.type];
  if (!transaction.relatedAccount) return label;
  const preposition = isCredit(transaction) ? "from" : "to";
  return `${label} ${preposition} ${formatAccountNumber(transaction.relatedAccount)}`;
}

/** "+ETB 1,665.00" / "−ETB 15.00". */
export function signedAmount(transaction: Transaction): string {
  return formatMoney(toCents(transaction.amount), {
    sign: isCredit(transaction) ? "credit" : "debit",
  });
}

/** "Refund · 15:18" (UI spec, transaction row). */
export function transactionMeta(transaction: Transaction, options: DateOptions = {}): string {
  const time = formatTime(parseApiDate(transaction.timestamp), options);
  return `${transactionTypeInfo[transaction.type].label} · ${time}`;
}

/**
 * The whole row as one sentence for screen readers, e.g. "Refund from
 * merchant. Money in, ETB 1,665.00. Refund, Today, 15:18."
 */
export function transactionSentence(
  transaction: Transaction,
  now: Date = new Date(),
  options: DateOptions = {},
): string {
  const amount = formatMoney(toCents(transaction.amount));
  const when = formatDateTime(parseApiDate(transaction.timestamp), now, options);
  return `${transactionTitle(transaction)}. ${directionLabel(transaction)}, ${amount}. ${
    transactionTypeInfo[transaction.type].label
  }, ${when}.`;
}

/** "TX-000117" (design notes: "TX-" and the id padded to six digits). */
export function transactionReference(transaction: Transaction): string {
  return `TX-${String(transaction.id).padStart(6, "0")}`;
}

/** "From" for money in, "To" for money out: the other account's label. */
export const counterpartyLabel = (transaction: Transaction) =>
  isCredit(transaction) ? "From" : "To";

/**
 * Plain text for "Share receipt" (N-014: the API has no receipt document).
 * The date is written in full, since the text is read later and elsewhere.
 */
export function receiptText(transaction: Transaction, options: DateOptions = {}): string {
  const lines = [
    "Kifiya Bank transaction receipt",
    transactionTitle(transaction),
    `${signedAmount(transaction)} (${directionLabel(transaction)})`,
    `Type: ${transactionTypeInfo[transaction.type].label}`,
    `Date: ${formatFullDateTime(parseApiDate(transaction.timestamp), options)}`,
  ];
  if (transaction.relatedAccount) {
    lines.push(
      `${counterpartyLabel(transaction)}: ${formatAccountNumber(transaction.relatedAccount)}`,
    );
  }
  lines.push(`Reference: ${transactionReference(transaction)}`);
  if (transaction.balanceAfter != null) {
    lines.push(`Balance after: ${formatMoney(toCents(transaction.balanceAfter))}`);
  }
  return lines.join("\n");
}

/** Rows under Today / Yesterday / "Sunday, 30 Aug", by the user's local day (ADR-0007). */
export function groupTransactionsByDay(
  transactions: readonly Transaction[],
  now: Date = new Date(),
  options: DateOptions = {},
): DayGroup<Transaction>[] {
  return groupByDay(transactions, (row) => parseApiDate(row.timestamp), now, options);
}
