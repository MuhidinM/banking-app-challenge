import { createTransactionsApi } from "@/features/transactions/api";
import type { HttpClient } from "@/shared/api/http-client";
import type { Transaction } from "@/shared/api/types";
import { toCents } from "@/shared/lib/money";

import type { CheckedTransfer } from "./transfer-details";

/**
 * The transaction a transfer just created, so the receipt can show its
 * reference, date and new balance (ADR-0008). The transfer response has none
 * of those, so this reads the newest page of the source account's history
 * and takes the newest debit transfer with the same amount and recipient.
 * Null when there is none (the receipt then falls back to what is known).
 */
export async function findSentTransfer(
  client: HttpClient,
  transfer: CheckedTransfer,
): Promise<Transaction | null> {
  const page = await createTransactionsApi(client).listPage(transfer.from.id, { page: 0 });
  return (
    page.content.find(
      (row) =>
        row.type === "FUND_TRANSFER" &&
        row.direction === "DEBIT" &&
        toCents(row.amount) === transfer.amountCents &&
        row.relatedAccount === transfer.toAccountNumber,
    ) ?? null
  );
}

/** Where a transfer's receipt lives; it loads by id, so it survives a reload. */
export const receiptPath = (transactionId: number) => `/transfer/receipt/${transactionId}`;
