import type { Metadata } from "next";

export const metadata: Metadata = { title: "Accounts" };

// Placeholder so the navigation works end to end; the screen is built in #30.
export default function AccountsPage() {
  return <h1 className="type-title text-ink">Accounts</h1>;
}
