import { notFound } from "next/navigation";

import { AccountDetails } from "@/features/accounts/account-details";
import { readIdParam } from "@/features/transactions/url-params";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Account" };

/**
 * `/accounts/<id>` (internal account id, as the API uses). An id that isn't a
 * number is a 404 straight away; one that isn't the user's is found out in
 * the browser, where the accounts are loaded.
 */
export default async function AccountPage({ params }: PageProps<"/accounts/[accountId]">) {
  const { accountId } = await params;
  const id = readIdParam(accountId);
  if (id === null) notFound();
  return <AccountDetails accountId={id} />;
}
