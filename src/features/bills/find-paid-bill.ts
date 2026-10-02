import { createTransactionsApi } from "@/features/transactions/api";
import type { HttpClient } from "@/shared/api/http-client";
import type { Transaction } from "@/shared/api/types";
import { toCents } from "@/shared/lib/money";

import type { CheckedBill } from "./bill-details";

/**
 * The biller's name from a bill payment's description ("Bill Payment to
 * Ethio Telecom" → "Ethio Telecom"). The transaction has no biller field.
 */
export function billerFromDescription(description: string | null | undefined): string | null {
  const text = description?.trim();
  if (!text) return null;
  return /^bill payment to (.+)$/i.exec(text)?.[1]?.trim() ?? text;
}

/**
 * The transaction a bill payment just created, so the receipt can show its
 * reference, date and new balance (ADR-0008). The payment response has none
 * of those, so this reads the newest page of the paying account's history
 * and takes the newest bill payment with the same amount (and biller, when
 * the description names one). Null when there is none; the receipt then
 * falls back to what is known.
 */
export async function findPaidBill(
  client: HttpClient,
  bill: CheckedBill,
): Promise<Transaction | null> {
  const page = await createTransactionsApi(client).listPage(bill.from.id, { page: 0 });
  return (
    page.content.find((row) => {
      if (row.type !== "BILL_PAYMENT" || row.direction !== "DEBIT") return false;
      if (toCents(row.amount) !== bill.amountCents) return false;
      const biller = billerFromDescription(row.description);
      return biller === null || biller.toLowerCase() === bill.biller.toLowerCase();
    }) ?? null
  );
}

/** Where a bill payment's receipt lives; it loads by id, so it survives a reload. */
export const billReceiptPath = (transactionId: number) => `/pay-bill/receipt/${transactionId}`;
