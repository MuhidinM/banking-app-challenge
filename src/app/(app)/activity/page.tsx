import { Suspense } from "react";

import { AccountActivity } from "@/features/transactions/account-activity";
import { PageHeader } from "@/shared/layout/page-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Activity" };

/** `/activity?account=<id>`: an account's transaction history. */
export default function ActivityPage() {
  return (
    <div className="flex flex-col gap-section">
      <PageHeader title="Activity" />
      {/* The account comes from the URL, which is only known in the browser. */}
      <Suspense>
        <AccountActivity />
      </Suspense>
    </div>
  );
}
