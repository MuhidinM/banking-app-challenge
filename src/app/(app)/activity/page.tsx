import type { Metadata } from "next";

export const metadata: Metadata = { title: "Activity" };

// Placeholder so the navigation works end to end; the screen is built in #33.
export default function ActivityPage() {
  return <h1 className="type-title text-ink">Activity</h1>;
}
