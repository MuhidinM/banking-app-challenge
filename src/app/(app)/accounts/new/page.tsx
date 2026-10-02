import { OpenAccountForm } from "@/features/accounts/open-account-form";
import { PageHeader } from "@/shared/layout/page-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Open an account" };

/** `/accounts/new` (UI spec, WebNewAccount and mobile NewAccount). */
export default function OpenAccountPage() {
  return (
    <div className="flex flex-col gap-[1.375rem] md:gap-7">
      <PageHeader
        title="Open an account"
        description="Add another account to your profile."
        back={{ href: "/accounts", label: "Back to accounts" }}
      />
      <OpenAccountForm />
    </div>
  );
}
