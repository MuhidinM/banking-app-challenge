import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";

import type { ReactNode } from "react";

/**
 * The signed-in layout (UI spec, "Layout"): a 260 px sidebar from 768 px, a
 * bottom nav below it. Content is at most 1024 px wide, with the spec's page
 * padding: 40 / 40 / 48 on web, 56 / 20 / 120 on mobile (room for the nav).
 */
export function AppShell({
  sidebarFooter,
  children,
}: {
  sidebarFooter?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-surface-muted md:pl-sidebar">
      <Sidebar footer={sidebarFooter} />
      <main className="mx-auto w-full max-w-content px-page pt-14 pb-30 md:px-10 md:pt-10 md:pb-12">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
