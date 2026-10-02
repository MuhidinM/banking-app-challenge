"use client";

import { useQuery } from "@tanstack/react-query";
import { ScrollText, Share } from "lucide-react";
import Link from "next/link";

import { accountChoiceLabel } from "@/features/accounts/account-select";
import { useAccounts } from "@/features/accounts/queries";
import { getAppSession } from "@/features/auth/session";
import { shareReceipt } from "@/features/transactions/share-receipt";
import { transactionReference } from "@/features/transactions/transaction-format";
import { isApiError } from "@/shared/api/api-error";
import { describeError } from "@/shared/api/error-messages";
import type { Account } from "@/shared/api/types";
import { formatFullDateTime, parseApiDate } from "@/shared/lib/dates";
import { type Cents, formatMoney, toCents } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Receipt } from "@/shared/ui/receipt";
import { LoadingRegion, Skeleton } from "@/shared/ui/skeleton";
import { EmptyState, ErrorState } from "@/shared/ui/states";
import { toast } from "@/shared/ui/toast";

import { createBillsApi } from "./api";
import { billerFromDescription } from "./find-paid-bill";

/** Query keys for bill receipts (ADR-0004). */
export const billKeys = {
  receipt: (transactionId: number) => ["bills", "receipt", transactionId] as const,
};

export interface BillReceiptDetails {
  amount: Cents;
  biller: string;
  from: Account | undefined;
  date: Date;
  /** "TX-000123"; missing on the fallback receipt. */
  reference?: string | undefined;
  newBalance: Cents | undefined;
}

const fromLabel = (from: Account | undefined) =>
  from ? accountChoiceLabel(from).replace(" · ", " ") : "Your account";

/** Plain text for "Share receipt" (N-014), with the full date. */
export function billReceiptText(details: BillReceiptDetails): string {
  return [
    "Kifiya Bank bill payment receipt",
    `${formatMoney(details.amount)} to ${details.biller}`,
    `From: ${fromLabel(details.from)}`,
    `Date: ${formatFullDateTime(details.date)}`,
    ...(details.reference ? [`Reference: ${details.reference}`] : []),
    ...(details.newBalance === undefined
      ? []
      : [`New balance: ${formatMoney(details.newBalance)}`]),
  ].join("\n");
}

async function share(details: BillReceiptDetails) {
  const result = await shareReceipt("Bill payment receipt", billReceiptText(details));
  if (result === "copied") toast({ title: "Receipt copied.", tone: "info" });
  if (result === "failed") toast({ title: "Couldn't share the receipt.", tone: "error" });
}

/** The receipt itself (the transfer receipt's layout, title "Bill paid"). */
export function BillReceiptView({
  details,
  note,
}: {
  details: BillReceiptDetails;
  note?: string | undefined;
}) {
  const rows: [string, string][] = [
    ["Biller", details.biller],
    ["From", fromLabel(details.from)],
    ["Date", formatFullDateTime(details.date)],
  ];
  if (details.reference) rows.push(["Reference", details.reference]);
  if (details.newBalance !== undefined) rows.push(["New balance", formatMoney(details.newBalance)]);

  return (
    <Receipt
      title="Bill paid"
      summary={`${formatMoney(details.amount)} to ${details.biller}`}
      rows={rows}
      note={note}
      actions={
        <>
          <Button variant="outline" icon={Share} fullWidth onClick={() => void share(details)}>
            Share receipt
          </Button>
          <Button asChild fullWidth>
            <Link href="/">Done</Link>
          </Button>
        </>
      }
    />
  );
}

/**
 * `/pay-bill/receipt/<id>` (R-FLOW-11's bill counterpart, ADR-0008). It loads
 * the payment by id, so it survives a reload. The new balance is the
 * transaction's balanceAfter, or the account's balance when the API leaves
 * that out.
 */
export function BillReceipt({ transactionId }: { transactionId: number }) {
  const receipt = useQuery({
    queryKey: billKeys.receipt(transactionId),
    queryFn: ({ signal }) =>
      createBillsApi(getAppSession().client).getReceipt(transactionId, signal),
    // A receipt never changes.
    staleTime: Infinity,
  });
  const accounts = useAccounts();

  if (receipt.isPending) {
    return (
      <LoadingRegion
        label="Loading the receipt"
        className="mx-auto flex w-full max-w-md flex-col items-center gap-4"
      >
        <Skeleton className="size-22 rounded-pill" />
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-52 w-full rounded-card" />
      </LoadingRegion>
    );
  }

  if (receipt.isError) {
    const missing =
      isApiError(receipt.error) &&
      (receipt.error.status === 404 || receipt.error.code === "TXN_003");
    return (
      <Card className="mx-auto w-full max-w-md">
        {missing ? (
          <EmptyState
            icon={ScrollText}
            title="We couldn't find this receipt"
            description="It may belong to another account. Your bill payments are in each account's activity."
            action={
              <Button asChild variant="outline" size="compact">
                <Link href="/activity">View activity</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState
            title="We couldn't load this receipt"
            description={describeError(receipt.error, "load").message}
            onRetry={() => void receipt.refetch()}
            retrying={receipt.isRefetching}
          />
        )}
      </Card>
    );
  }

  const transaction = receipt.data;
  const from = accounts.data?.find((account) => account.id === transaction.accountId);
  return (
    <BillReceiptView
      details={{
        amount: toCents(transaction.amount),
        biller: billerFromDescription(transaction.description) ?? "Bill payment",
        from,
        date: parseApiDate(transaction.timestamp),
        reference: transactionReference(transaction),
        newBalance:
          transaction.balanceAfter === null || transaction.balanceAfter === undefined
            ? from && toCents(from.balance)
            : toCents(transaction.balanceAfter),
      }}
    />
  );
}
