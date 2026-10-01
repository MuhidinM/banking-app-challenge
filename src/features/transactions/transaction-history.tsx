"use client";

import { ScrollText } from "lucide-react";
import { useRef } from "react";

import { isNetworkError } from "@/shared/api/api-error";
import { describeError } from "@/shared/api/error-messages";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { RowList } from "@/shared/ui/list-row";
import { ListRowSkeleton, LoadingRegion } from "@/shared/ui/skeleton";
import { EmptyState, ErrorState } from "@/shared/ui/states";

import { flattenHistory, useTransactionHistory } from "./queries";
import { TransactionRow } from "./transaction-row";

/**
 * An account's history (UI spec, Transactions and WebAccountDetail): the
 * first page, then "Load more" with "Showing x of y" until the last page.
 * New rows are added below the ones already shown, and the button stays where
 * it is, so the list never jumps and keyboard focus stays on the button.
 * After the last page the button goes away, and focus moves to the count.
 */
export function TransactionHistory({ accountId }: { accountId: number }) {
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

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <RowList aria-label="Transactions">
          {transactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </RowList>
      </Card>

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
