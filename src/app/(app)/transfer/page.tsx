import { readIdParam } from "@/features/transactions/url-params";
import { TransferFlow } from "@/features/transfers/transfer-flow";
import { PageHeader } from "@/shared/layout/page-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Transfer" };

/** `/transfer`, or `/transfer?from=<accountId>` from an account's Transfer shortcut. */
export default async function TransferPage({ searchParams }: PageProps<"/transfer">) {
  const { from } = await searchParams;
  return (
    <div className="flex flex-col gap-[1.375rem] md:gap-7">
      <PageHeader
        title="Transfer"
        description="Send money to any Kifiya Bank account."
        back={{ href: "/", label: "Back to home" }}
      />
      <TransferFlow
        initialFromId={readIdParam(typeof from === "string" ? from : null) ?? undefined}
      />
    </div>
  );
}
