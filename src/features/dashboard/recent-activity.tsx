"use client";

import { ScrollText } from "lucide-react";

import { ACCOUNT_TYPES } from "@/features/accounts/account-types";
import { useAccounts } from "@/features/accounts/queries";
import { useLatestTransactions } from "@/features/transactions/queries";
import { TransactionRow } from "@/features/transactions/transaction-row";
import type { Account } from "@/shared/api/types";
import { maskAccountNumber } from "@/shared/lib/account-number";
import { Card, SectionHeader } from "@/shared/ui/card";
import { RowList } from "@/shared/ui/list-row";
import { ListRowSkeleton, LoadingRegion } from "@/shared/ui/skeleton";
import { EmptyState, ErrorState } from "@/shared/ui/states";

/** How many transactions the dashboard shows; "View all" opens Activity. */
export const DASHBOARD_TRANSACTIONS = 3;

const loading = (
  <LoadingRegion label="Loading recent activity">
    <ListRowSkeleton />
    <ListRowSkeleton />
    <ListRowSkeleton />
  </LoadingRegion>
);

/** "•••• 8057" on the row, "Checking •••• 8057" for screen readers. */
const accountTag = (account: Account) => ({
  short: maskAccountNumber(account.accountNumber),
  label: `${ACCOUNT_TYPES[account.accountType].label} ${maskAccountNumber(account.accountNumber)}`,
});

function LatestActivity({ accounts }: { accounts: readonly Account[] }) {
  const latest = useLatestTransactions(
    accounts.map((account) => account.id),
    DASHBOARD_TRANSACTIONS,
  );
  // With one account the rows needn't say which; with several, each does.
  const byId = new Map(accounts.map((account) => [account.id, account]));
  const several = accounts.length > 1;

  if (latest.isPending) return loading;
  if (latest.isError) {
    return (
      <ErrorState
        title="We couldn't load your activity"
        description="Check your connection and try again."
        onRetry={latest.refetch}
        retrying={latest.isRefetching}
      />
    );
  }
  if (latest.transactions.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="No activity yet"
        description="Money in and out of your accounts will show here."
      />
    );
  }
  return (
    <RowList>
      {latest.transactions.map((transaction) => {
        const account = byId.get(transaction.accountId);
        return (
          <TransactionRow
            key={transaction.id}
            transaction={transaction}
            account={several && account ? accountTag(account) : undefined}
          />
        );
      })}
    </RowList>
  );
}

/**
 * "Recent activity" (UI spec): the newest transactions across all the
 * user's accounts, each row naming its account when there are several
 * (R-FLOW-04, N-027).
 */
export function RecentActivity() {
  const { data: accounts, isPending, isError } = useAccounts();

  let content;
  if (isPending) content = loading;
  else if (isError) content = null;
  else if (accounts.length === 0) {
    content = (
      <EmptyState
        icon={ScrollText}
        title="No activity yet"
        description="Open an account to see its money in and out here."
      />
    );
  } else content = <LatestActivity accounts={accounts} />;

  return (
    <section aria-labelledby="recent-activity" className="flex flex-col gap-3">
      <SectionHeader
        id="recent-activity"
        title="Recent activity"
        action={accounts?.length ? { label: "View all", href: "/activity" } : undefined}
      />
      {/* When accounts fail to load, "My accounts" shows the error and the retry. */}
      {content ? <Card className="overflow-hidden">{content}</Card> : null}
    </section>
  );
}
