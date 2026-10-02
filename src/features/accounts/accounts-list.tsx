"use client";

import { ChevronRight, Landmark, Plus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/shared/layout/page-header";
import { formatMoney } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { RowList } from "@/shared/ui/list-row";
import { ListRowSkeleton, LoadingRegion, Skeleton } from "@/shared/ui/skeleton";
import { EmptyState, ErrorState } from "@/shared/ui/states";

import { AccountRow } from "./account-row";
import { totalBalance, useAccounts } from "./queries";

const NEW_ACCOUNT = "/accounts/new";

const accountsLabel = (count: number) => (count === 1 ? "1 account" : `${count} accounts`);

/** The dashed "Open another account" row under the list (mobile Accounts). */
function OpenAnotherAccount() {
  return (
    <Link
      href={NEW_ACCOUNT}
      className="flex min-h-row items-center gap-3.5 rounded-card border border-dashed border-border px-row-x py-row-y transition-colors hover:bg-surface"
    >
      <span className="flex size-disc shrink-0 items-center justify-center rounded-pill border border-border bg-surface text-ink">
        <Plus aria-hidden="true" className="size-icon" strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="type-body-strong text-ink">Open another account</span>
        <span className="type-caption text-ink-muted">Savings, money market and more</span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-icon shrink-0 text-ink-muted"
        strokeWidth={1.75}
      />
    </Link>
  );
}

/**
 * "My accounts" (UI spec, mobile Accounts): count and total under the title,
 * every account (all pages of GET /api/accounts), then a row to open another.
 */
export function AccountsList() {
  const { data: accounts, isPending, isError, refetch, isRefetching } = useAccounts();

  let summary;
  if (accounts) {
    summary = `${accountsLabel(accounts.length)} · ${formatMoney(totalBalance(accounts))} total`;
  } else if (isPending) {
    summary = <Skeleton className="mt-1 inline-block h-4 w-52 align-middle" />;
  }

  const header = (
    <PageHeader
      title="My accounts"
      description={summary}
      actions={
        <Button asChild variant="soft" size="compact" icon={Plus}>
          <Link href={NEW_ACCOUNT}>New</Link>
        </Button>
      }
      className="max-md:flex-row max-md:items-start max-md:justify-between"
    />
  );

  let content;
  if (isPending) {
    content = (
      <Card className="overflow-hidden">
        <LoadingRegion label="Loading your accounts">
          <ListRowSkeleton />
          <ListRowSkeleton />
        </LoadingRegion>
      </Card>
    );
  } else if (isError) {
    content = (
      <Card>
        <ErrorState
          title="We couldn't load your accounts"
          description="Check your connection and try again."
          onRetry={() => void refetch()}
          retrying={isRefetching}
        />
      </Card>
    );
  } else if (accounts.length === 0) {
    content = (
      <Card>
        <EmptyState
          icon={Landmark}
          title="No accounts yet"
          description="Open a checking or savings account to start banking."
          action={
            <Button asChild size="compact" icon={Plus}>
              <Link href={NEW_ACCOUNT}>Open an account</Link>
            </Button>
          }
        />
      </Card>
    );
  } else {
    content = (
      <>
        <Card className="overflow-hidden">
          <RowList aria-label="Your accounts">
            {accounts.map((account) => (
              <AccountRow key={account.id} account={account} />
            ))}
          </RowList>
        </Card>
        <OpenAnotherAccount />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-section">
      {header}
      {content}
    </div>
  );
}
