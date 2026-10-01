"use client";

import { CreditCard } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/states";

import { TransactionHistory } from "./transaction-history";
import { readIdParam } from "./url-params";

/**
 * The Activity page's content: the history of the account in `?account=`
 * (URL state, ADR-0004, so a reload or a shared link shows the same account).
 */
export function AccountActivity() {
  const accountId = readIdParam(useSearchParams().get("account"));

  if (accountId === null) {
    return (
      <Card>
        <EmptyState
          icon={CreditCard}
          title="Choose an account"
          description="Open one of your accounts to see its money in and out."
          action={
            <Button asChild variant="outline" size="compact">
              <Link href="/accounts">View accounts</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return <TransactionHistory accountId={accountId} />;
}
