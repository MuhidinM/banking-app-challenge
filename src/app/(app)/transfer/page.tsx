import type { Metadata } from "next";

export const metadata: Metadata = { title: "Transfer" };

// Placeholder so the navigation works end to end; the screen is built in #37.
export default function TransferPage() {
  return <h1 className="type-title text-ink">Transfer</h1>;
}
