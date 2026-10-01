"use client";

import { ScrollText } from "lucide-react";

import { ACCOUNT_TYPES } from "@/features/accounts/account-types";
import { useAccounts } from "@/features/accounts/queries";
import { flattenHistory, useTransactionHistory } from "@/features/transactions/queries";
import { TransactionRow } from "@/features/transactions/transaction-row";
import type { Account } from "@/shared/api/types";
import { maskAccountNumber } from "@/shared/lib/account-number";
import { Card, SectionHeader } from "@/shared/ui/card";
import { RowList } from "@/shared/ui/list-row";
import { ListRowSkeleton, LoadingRegion } from "@/shared/ui/skeleton";
import { EmptyState, ErrorState } from "@/shared/ui/states";

/** How many transactions the dashboard shows; "View all" opens the account's history. */
export const DASHBOARD_TRANSACTIONS = 3;

const loading = (
  <LoadingRegion label="Loading recent activity">
    <ListRowSkeleton />
    <ListRowSkeleton />
    <ListRowSkeleton />
  </LoadingRegion>
);

function AccountActivity({ account }: { account: Account }) {
  const { data, isPending, isError, refetch, isRefetching } = useTransactionHistory(account.id);

  if (isPending) return loading;
  if (isError) {
    return (
      <ErrorState
        title="We couldn't load your activity"
        description="Check your connection and try again."
        onRetry={() => void refetch()}
        retrying={isRefetching}
      />
    );
  }

  const latest = flattenHistory(data.pages).transactions.slice(0, DASHBOARD_TRANSACTIONS);
  return (
    <>
      <p className="px-row-x pt-3.5 type-label font-normal text-ink-muted">
        {ACCOUNT_TYPES[account.accountType].label} {maskAccountNumber(account.accountNumber)}
      </p>
      {latest.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No activity yet"
          description="Money in and out of this account will show here."
        />
      ) : (
        <RowList>
          {latest.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </RowList>
      )}
    </>
  );
}

/**
 * "Recent activity" (UI spec): the latest transactions of the first account,
 * named above the rows ("Checking •••• 8057"), as the brief asks (R-FLOW-04).
 */
export function RecentActivity() {
  const { data: accounts, isPending, isError } = useAccounts();
  const account = accounts?.[0];

  let content;
  if (isPending) content = loading;
  else if (isError) content = null;
  else if (!account) {
    content = (
      <EmptyState
        icon={ScrollText}
        title="No activity yet"
        description="Open an account to see its money in and out here."
      />
    );
  } else content = <AccountActivity account={account} />;

  return (
    <section aria-labelledby="recent-activity" className="flex flex-col gap-3">
      <SectionHeader
        id="recent-activity"
        title="Recent activity"
        action={
          account ? { label: "View all", href: `/activity?account=${account.id}` } : undefined
        }
      />
      {/* When accounts fail to load, "My accounts" shows the error and the retry. */}
      {content ? <Card className="overflow-hidden">{content}</Card> : null}
    </section>
  );
}
