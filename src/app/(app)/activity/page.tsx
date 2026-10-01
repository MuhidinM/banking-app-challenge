import { PageHeader } from "@/shared/layout/page-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Activity" };

// Placeholder so the navigation works end to end; the screen is built in #33.
export default function ActivityPage() {
  return <PageHeader title="Activity" />;
}
