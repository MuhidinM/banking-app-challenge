import { PageHeader } from "@/shared/layout/page-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Accounts" };

// Placeholder so the navigation works end to end; the screen is built in #30.
export default function AccountsPage() {
  return <PageHeader title="Accounts" />;
}
