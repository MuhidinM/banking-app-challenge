import { PayBillFlow } from "@/features/bills/pay-bill-flow";
import { readIdParam } from "@/features/transactions/url-params";
import { PageHeader } from "@/shared/layout/page-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pay a bill" };

/** `/pay-bill`, or `/pay-bill?from=<accountId>` from an account's Pay bill shortcut. */
export default async function PayBillPage({ searchParams }: PageProps<"/pay-bill">) {
  const { from } = await searchParams;
  return (
    <div className="flex flex-col gap-[1.375rem] md:gap-7">
      <PageHeader
        title="Pay a bill"
        description="Settle a bill straight from one of your accounts."
        back={{ href: "/", label: "Back to home" }}
      />
      <PayBillFlow
        initialFromId={readIdParam(typeof from === "string" ? from : null) ?? undefined}
      />
    </div>
  );
}
