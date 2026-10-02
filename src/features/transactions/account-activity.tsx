"use client";

import { CreditCard } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ACCOUNT_TYPES } from "@/features/accounts/account-types";
import { useAccounts } from "@/features/accounts/queries";
import { describeError } from "@/shared/api/error-messages";
import type { Account } from "@/shared/api/types";
import { maskAccountNumber } from "@/shared/lib/account-number";
import { formatMoney, toCents } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { SelectField, type SelectOption } from "@/shared/ui/select-field";
import { Skeleton } from "@/shared/ui/skeleton";
import { EmptyState, ErrorState } from "@/shared/ui/states";

import { DirectionFilter, type DirectionFilterValue, readDirectionParam } from "./direction-filter";
import { TransactionHistory } from "./transaction-history";
import { readIdParam } from "./url-params";

/** "Checking •••• 8057". */
export const accountLabel = (account: Account) =>
  `${ACCOUNT_TYPES[account.accountType].label} ${maskAccountNumber(account.accountNumber)}`;

function accountOption(account: Account): SelectOption {
  return {
    value: String(account.id),
    label: accountLabel(account),
    description: `Available ${formatMoney(toCents(account.balance))}`,
    icon: ACCOUNT_TYPES[account.accountType].icon,
  };
}

/**
 * The Activity page (UI spec, mobile Transactions): pick an account, filter
 * by direction, read its history. The account and the filter live in the URL
 * (`?account=1&direction=DEBIT`, ADR-0004), so reload, Back/Forward and shared
 * links keep them. Without `?account=` the first account is shown.
 */
export function AccountActivity() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const accounts = useAccounts();

  const requestedId = readIdParam(searchParams.get("account"));
  const direction = readDirectionParam(searchParams.get("direction"));

  // Each choice is a history entry, so Back returns to the previous one.
  // Open details (`tx`) belong to the old list, so they are dropped.
  function navigate(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tx");
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  if (accounts.isPending) {
    return (
      <div role="status" aria-busy="true" className="flex flex-col gap-2">
        <span className="sr-only">Loading your accounts</span>
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-control w-full" />
      </div>
    );
  }

  if (accounts.isError) {
    return (
      <Card>
        <ErrorState
          title="We couldn't load your accounts"
          description={describeError(accounts.error, "load").message}
          onRetry={() => void accounts.refetch()}
          retrying={accounts.isRefetching}
        />
      </Card>
    );
  }

  if (accounts.data.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={CreditCard}
          title="No accounts yet"
          description="Open an account to see its money in and out here."
          action={
            <Button asChild size="compact">
              <Link href="/accounts/new">Open an account</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  const account =
    requestedId === null
      ? accounts.data[0]
      : accounts.data.find((candidate) => candidate.id === requestedId);

  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-col gap-3">
        <SelectField
          label="Account"
          options={accounts.data.map(accountOption)}
          value={account ? String(account.id) : undefined}
          placeholder="Choose an account"
          onValueChange={(id) => navigate({ account: id })}
        />
        <DirectionFilter
          value={direction}
          onValueChange={(value: DirectionFilterValue) =>
            navigate({ direction: value === "all" ? null : value })
          }
        />
      </div>

      {account ? (
        <TransactionHistory
          accountId={account.id}
          direction={direction}
          accountLabel={accountLabel(account)}
        />
      ) : (
        <Card>
          <EmptyState
            icon={CreditCard}
            title="We couldn't find this account."
            description="It isn't one of your accounts. Choose one above."
          />
        </Card>
      )}
    </div>
  );
}
