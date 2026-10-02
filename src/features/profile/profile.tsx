"use client";

import { Lock, LogOut, Mail, Phone } from "lucide-react";

import { totalBalance, useAccounts } from "@/features/accounts/queries";
import { getAppSession } from "@/features/auth/session";
import { useHiddenBalance } from "@/features/dashboard/use-hidden-balance";
import { describeError } from "@/shared/api/error-messages";
import type { User } from "@/shared/api/types";
import { formatMoney } from "@/shared/lib/money";
import { ThemeToggle } from "@/shared/theme/theme-toggle";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/feedback";
import { fitAmountStyle } from "@/shared/ui/fit-amount";
import { Skeleton } from "@/shared/ui/skeleton";
import { ErrorState } from "@/shared/ui/states";

import { initials } from "./initials";
import { useCurrentUser } from "./queries";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The profile (UI spec, WebProfile and mobile Profile): who is signed in, the
 * total across their accounts, the theme (N-018), Change password (not
 * available, N-004) and Log out. Two columns from 1024 px, one below. The
 * side column is wider than the design's 318 px so the theme switch fits.
 */
export function Profile() {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
      <PersonCard />
      <div className="flex flex-col gap-6">
        <TotalCard />
        <Card className="p-card">
          <ThemeToggle fullWidth />
        </Card>
        <ActionsCard />
      </div>
    </div>
  );
}

function PersonCard() {
  const user = useCurrentUser();

  if (user.isPending) {
    return (
      <Card className="flex flex-col gap-6 p-card">
        <div role="status" className="flex items-center gap-4">
          <span className="sr-only">Loading your profile</span>
          <Skeleton className="size-14 shrink-0 rounded-pill" />
          <span className="flex flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
          </span>
        </div>
      </Card>
    );
  }

  if (user.isError) {
    return (
      <Card>
        <ErrorState
          title="We couldn't load your profile"
          description={describeError(user.error, "load").message}
          onRetry={() => void user.refetch()}
          retrying={user.isRefetching}
        />
      </Card>
    );
  }

  return <PersonDetails user={user.data} />;
}

function PersonDetails({ user }: { user: User }) {
  return (
    <Card className="flex flex-col gap-6 p-card md:p-6">
      <div className="flex min-w-0 items-center gap-4">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-pill bg-primary type-heading text-on-primary"
        >
          {initials(user.firstName, user.lastName)}
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 className="truncate type-heading text-ink">
            {user.firstName} {user.lastName}
          </h2>
          <p className="truncate type-body text-ink-muted">@{user.username}</p>
        </div>
      </div>

      <dl className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-x-6 gap-y-4 border-t border-border pt-5">
        <Detail label="Email" icon={Mail}>
          {user.email ?? <span className="text-ink-muted">Not provided</span>}
        </Detail>
        <Detail label="Phone" icon={Phone}>
          {user.phoneNumber}
        </Detail>
        {/* Phones show contact details only, as in the mobile design. */}
        <Detail label="User ID" className="max-md:hidden">
          {user.id}
        </Detail>
        <Detail label="Username" className="max-md:hidden">
          {user.username}
        </Detail>
      </dl>
    </Card>
  );
}

function Detail({
  label,
  icon: Icon,
  className,
  children,
}: {
  label: string;
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      {/* The label is visible from 768 px; on phones the icon stands in for it. */}
      <dt className="mb-1 type-caption tracking-wider text-ink-muted uppercase max-md:sr-only">
        {label}
      </dt>
      <dd className="flex min-w-0 items-center gap-3 type-body text-ink">
        {Icon && (
          <Icon
            aria-hidden="true"
            className="size-icon shrink-0 text-ink-muted"
            strokeWidth={1.75}
          />
        )}
        <span className="min-w-0 break-words">{children}</span>
      </dd>
    </div>
  );
}

const accountsLabel = (count: number) => (count === 1 ? "1 account" : `${count} accounts`);

function TotalCard() {
  const accounts = useAccounts();
  // Hidden on the dashboard means hidden here too.
  const { hidden } = useHiddenBalance();

  let content;
  if (accounts.isPending) {
    content = <Skeleton className="h-8 w-44" />;
  } else if (accounts.isError) {
    content = <p className="type-body text-ink-muted">We couldn&apos;t load your balance.</p>;
  } else {
    const total = formatMoney(totalBalance(accounts.data));
    content = (
      <div className="@container flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p
          className="type-title amount-fit amount text-ink [--amount-size:1.5rem]"
          style={fitAmountStyle(total)}
        >
          {hidden ? (
            <>
              <span aria-hidden="true">ETB ******</span>
              <span className="sr-only">Hidden</span>
            </>
          ) : (
            total
          )}
        </p>
        <Badge tone="primary">{accountsLabel(accounts.data.length)}</Badge>
      </div>
    );
  }

  return (
    <Card className="flex flex-col gap-1 p-card">
      <h2 className="type-label font-normal text-ink-muted">Across all accounts</h2>
      {content}
    </Card>
  );
}

function ActionsCard() {
  const user = useCurrentUser();

  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-border">
        {/* N-004: the API has no way to change the password yet. */}
        <li className="flex min-h-row items-center gap-3.5 px-row-x py-row-y">
          <ActionDisc icon={Lock} />
          <span className="flex min-w-0 flex-col">
            <span className="type-body-strong text-ink">Change password</span>
            <span className="type-caption text-ink-muted">Not available yet</span>
          </span>
        </li>
        <li>
          <button
            type="button"
            onClick={() => getAppSession().signOut()}
            className="flex min-h-row w-full items-center gap-3.5 px-row-x py-row-y text-left transition-colors hover:bg-surface-muted focus-visible:-outline-offset-2"
          >
            <ActionDisc icon={LogOut} tone="debit" />
            <span className="flex min-w-0 flex-col">
              <span className="type-body-strong text-debit">Log out</span>
              {user.data && (
                <span className="truncate type-caption text-ink-muted max-md:hidden">
                  Signed in as {user.data.username}
                </span>
              )}
            </span>
          </button>
        </li>
      </ul>
    </Card>
  );
}

function ActionDisc({
  icon: Icon,
  tone = "neutral",
}: {
  icon: LucideIcon;
  tone?: "neutral" | "debit";
}) {
  return (
    <span
      className={
        tone === "debit"
          ? "flex size-disc shrink-0 items-center justify-center rounded-pill bg-debit-soft text-debit"
          : "flex size-disc shrink-0 items-center justify-center rounded-pill bg-surface-muted text-ink"
      }
    >
      <Icon aria-hidden="true" className="size-icon" strokeWidth={1.75} />
    </span>
  );
}
