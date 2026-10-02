"use client";

import { Landmark, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAccounts } from "@/features/accounts/queries";
import { describeError } from "@/shared/api/error-messages";
import { formatMoney } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { LoadingRegion, Skeleton } from "@/shared/ui/skeleton";
import { EmptyState, ErrorState } from "@/shared/ui/states";
import { toast } from "@/shared/ui/toast";

import { BillForm } from "./bill-form";

/**
 * The Pay a bill page's content: the user's accounts first (the form needs
 * their balances), then the form. After paying, a toast confirms it; the
 * receipt follows in #43.
 */
export function PayBillFlow({ initialFromId }: { initialFromId?: number | undefined }) {
  const accounts = useAccounts();
  // Bumped after each payment, so the next one starts from a fresh form.
  const [payments, setPayments] = useState(0);

  if (accounts.isPending) {
    return (
      <LoadingRegion label="Loading your accounts" className="flex flex-col gap-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-15 w-full" />
        <Skeleton className="h-4 w-16" />
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
          title="No account to pay from"
          description="Open an account first, then you can pay bills from it."
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
    <BillForm
      key={payments}
      accounts={accounts.data}
      initialFromId={initialFromId}
      onPaid={(bill) => {
        toast({ title: `Paid ${formatMoney(bill.amountCents)} to ${bill.biller}.` });
        setPayments((count) => count + 1);
      }}
    />
  );
}
