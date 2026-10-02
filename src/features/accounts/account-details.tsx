"use client";

import { ArrowLeftRight, Copy, ReceiptText, Share } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  DirectionFilter,
  type DirectionFilterValue,
  readDirectionParam,
} from "@/features/transactions/direction-filter";
import { TransactionHistory } from "@/features/transactions/transaction-history";
import { describeError } from "@/shared/api/error-messages";
import type { Account } from "@/shared/api/types";
import { PageHeader } from "@/shared/layout/page-header";
import { RouteNotFound } from "@/shared/layout/route-states";
import { formatAccountNumber, maskAccountNumber } from "@/shared/lib/account-number";
import { formatMoney, toCents } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { LoadingRegion, Skeleton } from "@/shared/ui/skeleton";
import { ErrorState } from "@/shared/ui/states";
import { toast } from "@/shared/ui/toast";

import { ACCOUNT_TYPES } from "./account-types";
import { useAccounts } from "./queries";

/** Where Transfer and Pay bill open with this account already chosen as the source. */
export const transferFrom = (account: Account) => `/transfer?from=${account.id}`;
export const payBillFrom = (account: Account) => `/pay-bill?from=${account.id}`;

/** Copies the account number (digits only) and says so. */
async function copyAccountNumber(account: Account) {
  try {
    await navigator.clipboard.writeText(account.accountNumber);
    toast({ title: "Account number copied.", tone: "info" });
  } catch {
    toast({ title: "Couldn't copy the account number.", tone: "error" });
  }
}

/**
 * Shares the account number, for someone who will send money to it: the
 * system share sheet where there is one (phones), otherwise the clipboard.
 */
async function shareAccountNumber(account: Account) {
  const text = `My Kifiya Bank account number: ${formatAccountNumber(account.accountNumber)}`;
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "Account number", text });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  await copyAccountNumber(account);
}

function BalanceCard({ account }: { account: Account }) {
  const type = ACCOUNT_TYPES[account.accountType];
  return (
    <section
      aria-label={`${type.label} balance`}
      className="flex flex-col gap-5 rounded-card bg-balance px-[1.375rem] pt-[1.375rem] pb-5 text-on-primary shadow-float"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="type-body-strong">{type.label}</p>
        <div className="flex items-center gap-1">
          <span className="type-body-strong tracking-[0.12em] amount">
            <span className="sr-only">Account number </span>
            {formatAccountNumber(account.accountNumber)}
          </span>
          <button
            type="button"
            onClick={() => void copyAccountNumber(account)}
            aria-label="Copy account number"
            title="Copy account number"
            className="-my-3 -mr-2.5 flex size-hit items-center justify-center rounded-pill hover:bg-on-primary/15"
          >
            <Copy aria-hidden="true" className="size-4" strokeWidth={2} />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="type-body opacity-80">Available balance</p>
        <p className="type-display text-[2.25rem] leading-[1.1] amount md:text-[2.5rem]">
          {formatMoney(toCents(account.balance))}
        </p>
      </div>
    </section>
  );
}

function Shortcuts({ account, className }: { account: Account; className?: string }) {
  return (
    <div className={className}>
      <Button asChild variant="soft" icon={ArrowLeftRight} className="h-12 md:h-button-compact">
        <Link href={transferFrom(account)}>Transfer</Link>
      </Button>
      <Button asChild variant="outline" icon={ReceiptText} className="h-12 md:h-button-compact">
        <Link href={payBillFrom(account)}>Pay bill</Link>
      </Button>
    </div>
  );
}

/**
 * One account (UI spec, WebAccountDetail and mobile AccountDetail): the
 * balance card with the full number, Transfer and Pay bill with this account
 * chosen, and its history with the direction filter (`?direction=`, ADR-0004).
 */
export function AccountDetails({ accountId }: { accountId: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const accounts = useAccounts();
  const direction = readDirectionParam(searchParams.get("direction"));

  function setDirection(value: DirectionFilterValue) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tx");
    if (value === "all") params.delete("direction");
    else params.set("direction", value);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const back = { href: "/accounts", label: "Back to accounts" };

  if (accounts.isPending) {
    return (
      <LoadingRegion label="Loading the account" className="flex flex-col gap-section">
        <Skeleton className="h-11 w-56" />
        <Skeleton className="h-40 w-full rounded-card" />
      </LoadingRegion>
    );
  }
  if (accounts.isError) {
    return (
      <div className="flex flex-col gap-section">
        <PageHeader title="Account" back={back} />
        <Card>
          <ErrorState
            title="We couldn't load this account"
            description={describeError(accounts.error, "load").message}
            onRetry={() => void accounts.refetch()}
            retrying={accounts.isRefetching}
          />
        </Card>
      </div>
    );
  }

  // Only the user's own accounts are listed, so someone else's id is "not found".
  const account = accounts.data.find((candidate) => candidate.id === accountId);
  if (!account) return <RouteNotFound />;

  const type = ACCOUNT_TYPES[account.accountType];
  const label = `${type.label} ${maskAccountNumber(account.accountNumber)}`;

  return (
    <div className="flex flex-col gap-5 md:gap-7">
      <PageHeader
        title={
          // "Checking account" on web, "Checking" on phones, as drawn. One span, so
          // the heading's flex layout keeps the space before "account".
          <span>
            {type.label}
            <span className="max-md:hidden"> account</span>
          </span>
        }
        back={back}
        actions={
          <>
            <Shortcuts account={account} className="hidden gap-3 md:flex" />
            <button
              type="button"
              onClick={() => void shareAccountNumber(account)}
              aria-label="Share account number"
              className="flex size-[2.875rem] items-center justify-center rounded-pill border border-border bg-surface text-ink hover:bg-surface-muted md:hidden"
            >
              <Share aria-hidden="true" className="size-icon" strokeWidth={1.75} />
            </button>
          </>
        }
        className="max-md:flex-row max-md:items-start max-md:justify-between"
      />

      <BalanceCard account={account} />
      <Shortcuts account={account} className="grid grid-cols-2 gap-3 md:hidden" />

      <section aria-labelledby="account-activity" className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 id="account-activity" className="type-heading text-ink">
            Activity
          </h2>
          <DirectionFilter value={direction} onValueChange={setDirection} />
        </div>
        <TransactionHistory
          accountId={account.id}
          direction={direction}
          accountLabel={label}
          dayHeading="h3"
        />
      </section>
    </div>
  );
}
