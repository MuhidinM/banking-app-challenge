import { PageHeader } from "@/shared/layout/page-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Transfer" };

// Placeholder so the navigation works end to end; the screen is built in #37.
export default function TransferPage() {
  return (
    <PageHeader
      title="Transfer"
      description="Send money to any Kifiya Bank account."
      back={{ href: "/", label: "Back to home" }}
    />
  );
}
