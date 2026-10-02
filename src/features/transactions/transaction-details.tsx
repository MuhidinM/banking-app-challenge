"use client";

import { SearchX, Share } from "lucide-react";

import { describeError } from "@/shared/api/error-messages";
import type { Transaction } from "@/shared/api/types";
import { formatAccountNumber } from "@/shared/lib/account-number";
import { formatDateTime, parseApiDate } from "@/shared/lib/dates";
import { formatMoney, toCents } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { Badge } from "@/shared/ui/feedback";
import { IconDisc } from "@/shared/ui/list-row";
import { Skeleton } from "@/shared/ui/skeleton";
import { EmptyState, ErrorState } from "@/shared/ui/states";
import { toast } from "@/shared/ui/toast";

import { useTransaction } from "./queries";
import { shareReceipt } from "./share-receipt";
import {
  counterpartyLabel,
  directionLabel,
  isCredit,
  receiptText,
  signedAmount,
  transactionReference,
  transactionTitle,
  transactionTypeInfo,
} from "./transaction-format";

import type { ReactNode } from "react";

interface TransactionDetailsProps {
  accountId: number;
  /** "Checking •••• 8057"; the Account row is left out without it. */
  accountLabel?: string;
  /** The transaction in `?tx=`; null keeps the dialog closed. */
  transactionId: number | null;
  onClose: () => void;
  /** See Dialog: puts focus back on the row that opened the details. */
  onCloseAutoFocus?: (event: Event) => void;
}

/**
 * A transaction's details (UI spec: WebTransactionDetail modal, mobile
 * TransactionDetail sheet): type, direction, the other account, reference
 * and, when the API has it, the balance after. Opened through `?tx=`, so a
 * reload or a shared link shows it again and Back closes it.
 */
export function TransactionDetails({
  accountId,
  accountLabel,
  transactionId,
  onClose,
  onCloseAutoFocus,
}: TransactionDetailsProps) {
  const query = useTransaction(accountId, transactionId);
  const transaction = query.data ?? null;

  return (
    <Dialog
      title="Transaction"
      open={transactionId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      {...(onCloseAutoFocus ? { onCloseAutoFocus } : {})}
      footer={transaction ? <ShareReceiptButton transaction={transaction} /> : undefined}
    >
      {transaction ? (
        <DetailsBody transaction={transaction} {...(accountLabel ? { accountLabel } : {})} />
      ) : query.isPending ? (
        <DetailsSkeleton />
      ) : query.isError ? (
        <ErrorState
          title="We couldn't load this transaction"
          description={describeError(query.error, "load").message}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
          className="py-6"
        />
      ) : (
        <EmptyState
          icon={SearchX}
          title="We couldn't find this transaction."
          description="It isn't in this account's history."
          className="py-6"
        />
      )}
    </Dialog>
  );
}

function DetailsBody({
  transaction,
  accountLabel,
}: {
  transaction: Transaction;
  accountLabel?: string;
}) {
  const credit = isCredit(transaction);
  const { icon, label } = transactionTypeInfo[transaction.type];

  return (
    <div className="flex flex-col gap-5">
      {/* A long title or a very large amount moves the amount to its own line. */}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
        <IconDisc icon={icon} tone={credit ? "credit" : "neutral"} className="size-14" />
        {/* An 8rem basis keeps the amount beside the title on a phone, the title
            wrapping as drawn (mobile TransactionDetail); a huge amount still wraps. */}
        <div className="flex min-w-32 flex-[1_1_8rem] flex-col gap-0.5">
          <p className="type-body-strong text-[1.0625rem] [overflow-wrap:anywhere] text-ink">
            {transactionTitle(transaction)}
          </p>
          <p className="type-body text-ink-muted">
            {formatDateTime(parseApiDate(transaction.timestamp))}
          </p>
        </div>
        <p
          className={`ml-auto type-body-strong text-[1.0625rem] font-semibold amount ${credit ? "text-credit" : "text-ink"}`}
        >
          {signedAmount(transaction)}
        </p>
      </div>

      <dl className="divide-y divide-border overflow-hidden rounded-card border border-border">
        <DetailRow term="Type">
          <Badge tone={credit ? "credit" : "neutral"}>{label}</Badge>
        </DetailRow>
        <DetailRow term="Direction">{directionLabel(transaction)}</DetailRow>
        {accountLabel && <DetailRow term="Account">{accountLabel}</DetailRow>}
        {transaction.relatedAccount && (
          <DetailRow term={counterpartyLabel(transaction)}>
            <span className="amount">{formatAccountNumber(transaction.relatedAccount)}</span>
          </DetailRow>
        )}
        <DetailRow term="Reference">{transactionReference(transaction)}</DetailRow>
        {/* Older rows have no balanceAfter: leave the row out rather than show ETB 0.00 (R-API-10). */}
        {transaction.balanceAfter != null && (
          <DetailRow term="Balance after">
            <span className="amount">{formatMoney(toCents(transaction.balanceAfter))}</span>
          </DetailRow>
        )}
      </dl>
    </div>
  );
}

function DetailRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 px-5 py-3">
      <dt className="type-body text-ink-muted">{term}</dt>
      <dd className="text-right type-body-strong text-ink">{children}</dd>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-5">
      <span className="sr-only">Loading the transaction</span>
      <div className="flex items-center gap-3.5">
        <Skeleton className="size-14 shrink-0 rounded-pill" />
        <span className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/4" />
        </span>
      </div>
      <Skeleton className="h-56 w-full rounded-card" />
    </div>
  );
}

function ShareReceiptButton({ transaction }: { transaction: Transaction }) {
  async function share() {
    const result = await shareReceipt("Transaction receipt", receiptText(transaction));
    if (result === "copied") {
      toast({ title: "Receipt copied", description: "Paste it wherever you need it." });
    } else if (result === "failed") {
      toast({ title: "We couldn't share the receipt. Please try again.", tone: "error" });
    }
  }

  return (
    <Button variant="outline" icon={Share} fullWidth onClick={() => void share()}>
      Share receipt
    </Button>
  );
}
