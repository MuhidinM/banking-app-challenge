import { AccountsList } from "@/features/accounts/accounts-list";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "My accounts" };

/** `/accounts`: every account of the signed-in user (UI spec, mobile Accounts). */
export default function AccountsPage() {
  return <AccountsList />;
}
