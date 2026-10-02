"use client";

import { Landmark, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAccounts } from "@/features/accounts/queries";
import { getAppSession } from "@/features/auth/session";
import { describeError } from "@/shared/api/error-messages";
import { formatMoney, toCents } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { LoadingRegion, Skeleton } from "@/shared/ui/skeleton";
import { EmptyState, ErrorState } from "@/shared/ui/states";
import { toast } from "@/shared/ui/toast";

import { BillForm } from "./bill-form";
import { BillReceiptView } from "./bill-receipt";
import { billReceiptPath, findPaidBill } from "./find-paid-bill";

import type { CheckedBill } from "./bill-details";

/**
 * The receipt shown when the new payment can't be found in the history
 * (ADR-0008, step 4): what was paid, the refreshed balance, no reference.
 */
function FallbackReceipt({ bill }: { bill: CheckedBill }) {
  const accounts = useAccounts();
  const from = accounts.data?.find((account) => account.id === bill.from.id) ?? bill.from;
  return (
    <BillReceiptView
      details={{
        amount: bill.amountCents,
        biller: bill.biller,
        from,
        date: new Date(),
        newBalance: accounts.isFetching ? undefined : toCents(from.balance),
      }}
      note="The reference will show in this account's activity."
    />
  );
}

/**
 * The Pay a bill page's content: the user's accounts first (the form needs
 * their balances), then the form. After paying, a toast confirms it and the
 * receipt of the new transaction opens (ADR-0008), or a receipt without a
 * reference when that transaction can't be found.
 */
export function PayBillFlow({ initialFromId }: { initialFromId?: number | undefined }) {
  const router = useRouter();
  const accounts = useAccounts();
  const [fallback, setFallback] = useState<CheckedBill | null>(null);

  async function showReceipt(bill: CheckedBill) {
    toast({ title: `Paid ${formatMoney(bill.amountCents)} to ${bill.biller}.` });
    const paid = await findPaidBill(getAppSession().client, bill).catch(() => null);
    if (paid) {
      router.push(billReceiptPath(paid.id));
      return;
    }
    console.warn("[bills] paid, but the new transaction wasn't found in the history");
    setFallback(bill);
  }

  if (fallback) return <FallbackReceipt bill={fallback} />;

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
  return <BillForm accounts={accounts.data} initialFromId={initialFromId} onPaid={showReceipt} />;
}
