"use client";

import { Landmark, Plus } from "lucide-react";
import Link from "next/link";

import { useAccounts } from "@/features/accounts/queries";
import { describeError } from "@/shared/api/error-messages";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { LoadingRegion, Skeleton } from "@/shared/ui/skeleton";
import { EmptyState, ErrorState } from "@/shared/ui/states";

import { RecentRecipients } from "./recent-recipients";
import { type ServerFieldError, TransferForm } from "./transfer-form";

import type { CheckedTransfer } from "./transfer-details";

/**
 * The transfer page's content: the user's accounts first (the form needs
 * their balances), then the form. The review step (#38) plugs in at
 * `onContinue`.
 */
export function TransferScreen({
  initialFromId,
  onContinue,
  serverError,
}: {
  initialFromId?: number | undefined;
  onContinue: (transfer: CheckedTransfer) => void;
  serverError?: ServerFieldError | null;
}) {
  const accounts = useAccounts();

  if (accounts.isPending) {
    return (
      <LoadingRegion label="Loading your accounts" className="flex flex-col gap-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-15 w-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-control w-full" />
      </LoadingRegion>
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
          icon={Landmark}
          title="No account to send from"
          description="Open an account first, then you can send money from it."
          action={
            <Button asChild size="compact" icon={Plus}>
              <Link href="/accounts/new">Open an account</Link>
            </Button>
          }
        />
      </Card>
    );
  }
  return (
    <TransferForm
      accounts={accounts.data}
      initialFromId={initialFromId}
      onContinue={onContinue}
      serverError={serverError}
      recipientShortcuts={(fromAccountId, pick) => (
        <RecentRecipients fromAccountId={fromAccountId} onPick={pick} />
      )}
    />
  );
}
