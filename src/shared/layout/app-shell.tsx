import { BottomNav } from "./bottom-nav";
import { OfflineBanner } from "./offline-banner";
import { RouteFocus } from "./route-focus";
import { Sidebar } from "./sidebar";

import type { ReactNode } from "react";

const MAIN_ID = "main-content";

/**
 * The signed-in layout (UI spec, "Layout"): a 260 px sidebar from 768 px, a
 * bottom nav below it. Content is at most 1024 px wide, with the spec's page
 * padding: 40 / 40 / 48 on web, 56 / 20 / 120 on mobile (room for the nav).
 *
 * The first Tab reaches "Skip to content", which jumps past the navigation.
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
      <a
        href={`#${MAIN_ID}`}
        className="fixed top-3 left-3 z-50 -translate-y-20 rounded-button bg-primary px-5 py-3 type-body-strong text-on-primary focus-visible:translate-y-0 focus-visible:shadow-float"
      >
        Skip to content
      </a>
      <Sidebar footer={sidebarFooter} />
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className="mx-auto w-full max-w-content px-page pt-14 pb-30 outline-none md:px-10 md:pt-10 md:pb-12"
      >
        <OfflineBanner />
        {children}
      </main>
      <BottomNav />
      <RouteFocus mainId={MAIN_ID} />
    </div>
  );
}
