"use client";

import { ArrowDownLeft, ArrowUpRight, ScrollText } from "lucide-react";
import { useRef } from "react";

import { isNetworkError } from "@/shared/api/api-error";
import { describeError } from "@/shared/api/error-messages";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { RowList } from "@/shared/ui/list-row";
import { ListRowSkeleton, LoadingRegion } from "@/shared/ui/skeleton";
import { EmptyState, ErrorState } from "@/shared/ui/states";

import { type DirectionFilterValue } from "./direction-filter";
import { flattenHistory, useTransactionHistory } from "./queries";
import { TransactionDetails } from "./transaction-details";
import { groupTransactionsByDay } from "./transaction-format";
import { TransactionRow } from "./transaction-row";
import { useTransactionParam } from "./use-transaction-param";

import type { MouseEvent } from "react";

/**
 * An account's history (UI spec, Transactions and WebAccountDetail): the
 * first page, then "Load more" with "Showing x of y" until the last page.
 * New rows are added below the ones already shown, and the button stays where
 * it is, so the list never jumps and keyboard focus stays on the button.
 * After the last page the button goes away, and focus moves to the count.
 */
interface TransactionHistoryProps {
  accountId: number;
  /**
   * Show only money in or money out. The API can't filter by direction, so
   * this filters the rows loaded so far; "Load more" brings in more (N-029).
   */
  direction?: DirectionFilterValue;
  /** "Checking •••• 8057", for the Account row in the details. */
  accountLabel?: string;
  /** Level of the day headings: h3 when the history sits under its own h2 (account details). */
  dayHeading?: "h2" | "h3";
}

/** The history list plus the details of the row in `?tx=`. */
export function TransactionHistory(props: TransactionHistoryProps) {
  const details = useTransactionParam();
  return (
    <>
      <HistoryList {...props} onSelect={details.open} />
      <TransactionDetails
        accountId={props.accountId}
        {...(props.accountLabel ? { accountLabel: props.accountLabel } : {})}
        transactionId={details.transactionId}
        onClose={details.close}
        onCloseAutoFocus={details.onCloseAutoFocus}
      />
    </>
  );
}

function HistoryList({
  accountId,
  direction = "all",
  dayHeading: DayHeading = "h2",
  onSelect,
}: TransactionHistoryProps & {
  onSelect: (transactionId: number, event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const history = useTransactionHistory(accountId);
  const countRef = useRef<HTMLParagraphElement>(null);

  async function loadMore() {
    const result = await history.fetchNextPage();
    if (!result.isError && !result.hasNextPage) countRef.current?.focus();
  }

  if (history.isPending) {
    return (
      <LoadingRegion label="Loading transactions">
        <Card className="overflow-hidden">
          <RowList>
            {Array.from({ length: 4 }, (_, index) => (
              <ListRowSkeleton key={index} />
            ))}
          </RowList>
        </Card>
      </LoadingRegion>
    );
  }

  // Failed before anything loaded. A failed "Load more" keeps the rows already
  // shown and says so under the button instead.
  if (!history.data) {
    const { message, retryable } = describeError(history.error, "load");
    return (
      <Card>
        <ErrorState
          title="We couldn't load your transactions"
          description={message}
          kind={
            isNetworkError(history.error) && history.error.reason === "offline"
              ? "offline"
              : "error"
          }
          {...(retryable ? { onRetry: () => void history.refetch() } : {})}
          retrying={history.isRefetching}
        />
      </Card>
    );
  }

  const { transactions, total } = flattenHistory(history.data.pages);

  if (transactions.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={ScrollText}
          title="No transactions yet"
          description="Money in and out of this account will show here."
        />
      </Card>
    );
  }

  const shown =
    direction === "all"
      ? transactions
      : transactions.filter((transaction) => transaction.direction === direction);

  return (
    <div className="flex flex-col gap-4">
      {shown.length === 0 && (
        <Card>
          <EmptyState
            icon={direction === "CREDIT" ? ArrowDownLeft : ArrowUpRight}
            title={direction === "CREDIT" ? "No money in" : "No money out"}
            description={
              history.hasNextPage
                ? `None of the ${transactions.length} transactions loaded so far. Load more to look further back.`
                : "None in this account's history."
            }
          />
        </Card>
      )}
      {groupTransactionsByDay(shown).map((group) => (
        <section
          key={group.key}
          aria-labelledby={`day-${group.key}`}
          className="flex flex-col gap-3"
        >
          <DayHeading id={`day-${group.key}`} className="type-body-strong text-ink-muted">
            {group.label}
          </DayHeading>
          <Card className="overflow-hidden">
            <RowList>
              {group.items.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  onSelect={(event) => onSelect(transaction.id, event)}
                />
              ))}
            </RowList>
          </Card>
        </section>
      ))}

      <div className="flex flex-col items-center gap-2">
        {history.hasNextPage && (
          <Button
            variant="outline"
            size="compact"
            className="min-w-36"
            loading={history.isFetchingNextPage}
            onClick={() => void loadMore()}
          >
            Load more
          </Button>
        )}
        {history.isFetchNextPageError && (
          <p role="alert" className="type-caption text-debit">
            {describeError(history.error, "load").message}
          </p>
        )}
        <p
          ref={countRef}
          tabIndex={-1}
          aria-live="polite"
          className="type-caption text-ink-muted outline-none"
        >
          Showing {transactions.length} of {Math.max(total, transactions.length)}
        </p>
      </div>
    </div>
  );
}
