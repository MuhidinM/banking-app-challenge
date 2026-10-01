"use client";

import { Landmark, Plus } from "lucide-react";
import Link from "next/link";

import { ACCOUNT_TYPES } from "@/features/accounts/account-types";
import { useAccounts } from "@/features/accounts/queries";
import { maskAccountNumber } from "@/shared/lib/account-number";
import { formatMoney, toCents } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { Card, SectionHeader } from "@/shared/ui/card";
import { ListRow, RowList } from "@/shared/ui/list-row";
import { ListRowSkeleton, LoadingRegion } from "@/shared/ui/skeleton";
import { EmptyState, ErrorState } from "@/shared/ui/states";

/** How many accounts the dashboard lists; "View all" opens the rest. */
export const DASHBOARD_ACCOUNTS = 3;

function AccountsContent() {
  const { data: accounts, isPending, isError, refetch, isRefetching } = useAccounts();

  if (isPending) {
    return (
      <LoadingRegion label="Loading your accounts">
        <ListRowSkeleton />
        <ListRowSkeleton />
      </LoadingRegion>
    );
  }
  if (isError) {
    return (
      <ErrorState
        title="We couldn't load your accounts"
        description="Check your connection and try again."
        onRetry={() => void refetch()}
        retrying={isRefetching}
      />
    );
  }
  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Landmark}
        title="No accounts yet"
        description="Open an account to start banking."
        action={
          <Button asChild size="compact" icon={Plus}>
            <Link href="/accounts/new">Open an account</Link>
          </Button>
        }
      />
    );
  }
  return (
    <RowList>
      {accounts.slice(0, DASHBOARD_ACCOUNTS).map((account) => {
        const type = ACCOUNT_TYPES[account.accountType];
        return (
          <ListRow
            key={account.id}
            icon={type.icon}
            tone="primary"
            title={type.label}
            meta={maskAccountNumber(account.accountNumber)}
            value={formatMoney(toCents(account.balance))}
            valueMeta="Available"
            href={`/accounts/${account.id}`}
          />
        );
      })}
    </RowList>
  );
}

/** "My accounts" (UI spec): the first accounts, each linking to its details. */
export function MyAccounts() {
  return (
    <section aria-labelledby="my-accounts" className="flex flex-col gap-3">
      <SectionHeader
        id="my-accounts"
        title="My accounts"
        action={{ label: "View all", href: "/accounts" }}
      />
      <Card className="overflow-hidden">
        <AccountsContent />
      </Card>
    </section>
  );
}
