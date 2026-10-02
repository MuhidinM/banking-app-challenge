"use client";

import { useQuery } from "@tanstack/react-query";
import { Share } from "lucide-react";
import { ScrollText } from "lucide-react";
import Link from "next/link";

import { accountChoiceLabel } from "@/features/accounts/account-select";
import { useAccounts } from "@/features/accounts/queries";
import { getAppSession } from "@/features/auth/session";
import { shareReceipt } from "@/features/transactions/share-receipt";
import { transactionReference } from "@/features/transactions/transaction-format";
import { isApiError } from "@/shared/api/api-error";
import { describeError } from "@/shared/api/error-messages";
import type { Account } from "@/shared/api/types";
import { formatAccountNumber } from "@/shared/lib/account-number";
import { formatFullDateTime, parseApiDate } from "@/shared/lib/dates";
import { type Cents, formatMoney, toCents } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Receipt } from "@/shared/ui/receipt";
import { LoadingRegion, Skeleton } from "@/shared/ui/skeleton";
import { EmptyState, ErrorState } from "@/shared/ui/states";
import { toast } from "@/shared/ui/toast";

import { createTransfersApi } from "./api";

/** Query keys for transfer receipts (ADR-0004). */
export const transferKeys = {
  receipt: (transactionId: number) => ["transfers", "receipt", transactionId] as const,
};

interface ReceiptDetails {
  amount: Cents;
  toAccountNumber: string;
  from: Account | undefined;
  date: Date;
  /** "TX-000123"; missing on the fallback receipt. */
  reference?: string | undefined;
  newBalance: Cents | undefined;
}

const fromLabel = (from: Account | undefined) =>
  from ? accountChoiceLabel(from).replace(" · ", " ") : "Your account";

function receiptText(details: ReceiptDetails): string {
  return [
    "Kifiya Bank transfer receipt",
    `${formatMoney(details.amount)} to ${formatAccountNumber(details.toAccountNumber)}`,
    `From: ${fromLabel(details.from)}`,
    `Date: ${formatFullDateTime(details.date)}`,
    ...(details.reference ? [`Reference: ${details.reference}`] : []),
    ...(details.newBalance === undefined
      ? []
      : [`New balance: ${formatMoney(details.newBalance)}`]),
  ].join("\n");
}

async function share(details: ReceiptDetails) {
  const result = await shareReceipt("Transfer receipt", receiptText(details));
  if (result === "copied") toast({ title: "Receipt copied.", tone: "info" });
  if (result === "failed") toast({ title: "Couldn't share the receipt.", tone: "error" });
}

/** The receipt itself, from whatever is known about the transfer. */
export function TransferReceiptView({
  details,
  note,
}: {
  details: ReceiptDetails;
  note?: string | undefined;
}) {
  return (
    <Receipt
      title="Transfer sent"
      summary={`${formatMoney(details.amount)} to ${details.toAccountNumber}`}
      rows={[
        ["From", fromLabel(details.from)],
        ["Date", formatFullDateTime(details.date)],
        ...(details.reference ? ([["Reference", details.reference]] as [string, string][]) : []),
        ...(details.newBalance === undefined
          ? []
          : ([["New balance", formatMoney(details.newBalance)]] as [string, string][])),
      ]}
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
 * `/transfer/receipt/<id>` (UI spec, mobile TransferSuccess; R-FLOW-10). It
 * loads the transfer by id, so it survives a reload and can be shared as a
 * link (X-01). The new balance is the transaction's balanceAfter.
 */
export function TransferReceipt({ transactionId }: { transactionId: number }) {
  const receipt = useQuery({
    queryKey: transferKeys.receipt(transactionId),
    queryFn: ({ signal }) =>
      createTransfersApi(getAppSession().client).getReceipt(transactionId, signal),
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
            description="It may belong to another account. Your transfers are in each account's activity."
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
    <TransferReceiptView
      details={{
        amount: toCents(transaction.amount),
        toAccountNumber: transaction.relatedAccount ?? "",
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
