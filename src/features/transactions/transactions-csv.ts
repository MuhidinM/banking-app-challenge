import type { Transaction } from "@/shared/api/types";
import { type CsvCell, toCsv } from "@/shared/lib/csv";
import { type DateOptions, formatTime, localDayKey, parseApiDate } from "@/shared/lib/dates";
import { CURRENCY } from "@/shared/lib/money";

import {
  directionLabel,
  isCredit,
  transactionReference,
  transactionTitle,
  transactionTypeInfo,
} from "./transaction-format";

const HEADER = [
  "Date",
  "Reference",
  "Description",
  "Type",
  "Direction",
  `Amount (${CURRENCY})`,
  `Balance after (${CURRENCY})`,
  "Other account",
];

/**
 * The transactions loaded so far as CSV, one row each, newest first. Dates
 * are in the user's time zone ("2026-10-01 15:18", ADR-0007); money out is
 * negative, so a column sum is the net change.
 */
export function transactionsCsv(
  transactions: readonly Transaction[],
  options: DateOptions = {},
): string {
  const rows = transactions.map((transaction): CsvCell[] => {
    const date = parseApiDate(transaction.timestamp);
    return [
      `${localDayKey(date, options)} ${formatTime(date, options)}`,
      transactionReference(transaction),
      transactionTitle(transaction),
      transactionTypeInfo[transaction.type].label,
      directionLabel(transaction),
      isCredit(transaction) ? transaction.amount : -transaction.amount,
      transaction.balanceAfter,
      transaction.relatedAccount,
    ];
  });
  return toCsv([HEADER, ...rows]);
}

/** "kifiya-checking-8057-2026-10-02.csv" from "Checking •••• 8057". */
export function transactionsFileName(accountLabel: string | undefined, today = new Date()): string {
  const account = (accountLabel ?? "transactions")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `kifiya-${account}-${localDayKey(today)}.csv`;
}
